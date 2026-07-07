#!/usr/bin/env bash
# ensure-postgres.sh — Start the user-space PostgreSQL 17 server if not running.
# Idempotent: safe to call multiple times.
#
# Server config:
#   - binaries:  /home/z/pg/usr/lib/postgresql/17/bin/
#   - data dir:  /home/z/pgdata
#   - port:      5433
#   - database:  cryptointel

set -euo pipefail

PG_BIN_DIR="/home/z/pg/usr/lib/postgresql/17/bin"
PG_DATA_DIR="/home/z/pgdata"
PG_LOG_FILE="/home/z/pgdata/pg.log"
PG_PORT="${PGPORT:-5433}"
PG_DB_NAME="${PGDATABASE:-cryptointel}"

# ─── Install postgres binaries if missing ────────────────────────────────
if [ ! -x "${PG_BIN_DIR}/postgres" ]; then
  echo "[ensure-postgres] Installing PostgreSQL 17 binaries to ${PG_BIN_DIR}..."
  mkdir -p /home/z/pg
  cd /tmp
  # Download .deb files (no root needed)
  apt-get download postgresql-17 postgresql-client-17 postgresql-common 2>/dev/null || true
  for deb in /tmp/postgresql-*.deb; do
    [ -e "$deb" ] && dpkg-deb -x "$deb" /home/z/pg
  done
fi

# ─── initdb if data dir doesn't exist ────────────────────────────────────
if [ ! -f "${PG_DATA_DIR}/PG_VERSION" ]; then
  echo "[ensure-postgres] Initializing data directory at ${PG_DATA_DIR}..."
  mkdir -p "${PG_DATA_DIR}"
  "${PG_BIN_DIR}/initdb" -D "${PG_DATA_DIR}" -U postgres \
    --auth-host=trust --auth-local=trust --encoding=UTF8

  # Configure server: listen on localhost TCP + Unix socket
  cat >> "${PG_DATA_DIR}/postgresql.conf" <<EOF

# ── Crypto Intelligence Dashboard overrides ──
listen_addresses = 'localhost'
port = ${PG_PORT}
unix_socket_directories = '/tmp'
max_connections = 50
shared_buffers = 64MB
work_mem = 8MB
maintenance_work_mem = 64MB
effective_cache_size = 256MB
log_min_messages = warning
log_min_error_statement = error
log_line_prefix = '%m [%p] %q%u@%d '
EOF
fi

# ─── Start server if not running ─────────────────────────────────────────
if ! "${PG_BIN_DIR}/pg_ctl" -D "${PG_DATA_DIR}" status >/dev/null 2>&1; then
  echo "[ensure-postgres] Starting PostgreSQL server on port ${PG_PORT}..."
  "${PG_BIN_DIR}/pg_ctl" -D "${PG_DATA_DIR}" -l "${PG_LOG_FILE}" -w -t 30 start
fi

# Wait for the server to be ready (max ~15 seconds)
for i in $(seq 1 30); do
  if "${PG_BIN_DIR}/pg_isready" -h /tmp -p "${PG_PORT}" -U postgres >/dev/null 2>&1 \
     || "${PG_BIN_DIR}/pg_isready" -h localhost -p "${PG_PORT}" -U postgres >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

# ─── Create database if missing ──────────────────────────────────────────
DB_EXISTS=$( "${PG_BIN_DIR}/psql" -h /tmp -p "${PG_PORT}" -U postgres -d postgres \
             -tAc "SELECT 1 FROM pg_database WHERE datname='${PG_DB_NAME}'" 2>/dev/null || echo "" )
if [ "${DB_EXISTS}" != "1" ]; then
  echo "[ensure-postgres] Creating database '${PG_DB_NAME}'..."
  "${PG_BIN_DIR}/createdb" -h /tmp -p "${PG_PORT}" -U postgres "${PG_DB_NAME}"
fi

# ─── Run prisma db push if schema isn't in sync ──────────────────────────
# Check whether the Coin table exists; if not, run prisma db push.
TABLE_EXISTS=$( "${PG_BIN_DIR}/psql" -h /tmp -p "${PG_PORT}" -U postgres -d "${PG_DB_NAME}" \
                -tAc "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='Coin'" 2>/dev/null || echo "" )
if [ "${TABLE_EXISTS}" != "1" ]; then
  echo "[ensure-postgres] Pushing Prisma schema to PostgreSQL..."
  cd /home/z/my-project
  PATH="${PG_BIN_DIR}:$PATH" DATABASE_URL="postgresql://postgres@localhost:${PG_PORT}/${PG_DB_NAME}?schema=public" \
    bunx prisma db push --accept-data-loss 2>&1 || true
fi

echo "[ensure-postgres] PostgreSQL ready at localhost:${PG_PORT}/${PG_DB_NAME}"
