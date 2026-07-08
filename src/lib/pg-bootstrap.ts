/**
 * PostgreSQL bootstrap helpers.
 *
 * The user-space PostgreSQL 17 server lives at:
 *   - binaries:  /home/z/pg/usr/lib/postgresql/17/bin/
 *   - data dir:  /home/z/pgdata
 *   - log:       /home/z/pgdata/pg.log
 *   - port:      5433
 *   - socket:    /tmp/.s.PGSQL.5433
 *
 * These helpers start the server if it isn't already running. They are
 * idempotent — safe to call on every module load.
 */

import { execSync, execFileSync } from 'node:child_process';
import { existsSync, appendFileSync } from 'node:fs';
import { access } from 'node:fs/promises';

const PG_BIN_DIR = '/home/z/pg/usr/lib/postgresql/17/bin';
const PG_DATA_DIR = '/home/z/pgdata';
const PG_LOG_FILE = '/home/z/pgdata/pg.log';
const PG_PORT = 5433;
const PG_DB_NAME = 'cryptointel';

let bootstrapped = false;

/**
 * Run initdb + create the cryptointel database if they don't exist yet.
 * This is a one-time setup operation.
 */
function initClusterIfMissing(): void {
  if (existsSync(`${PG_DATA_DIR}/PG_VERSION`)) return; // already initialized

  console.log('[pg-bootstrap] Initializing PostgreSQL data directory...');
  const initdb = `${PG_BIN_DIR}/initdb`;
  execFileSync(
    initdb,
    [
      '-D', PG_DATA_DIR,
      '-U', 'postgres',
      '--auth-host=trust',
      '--auth-local=trust',
      '--encoding=UTF8',
    ],
    { stdio: 'pipe' }
  );

  // Configure: bind only to a local socket + TCP loopback on a custom port.
  appendFileSync(
    `${PG_DATA_DIR}/postgresql.conf`,
    [
      '',
      '# ── Crypto Intelligence Dashboard overrides ──',
      `listen_addresses = 'localhost'`,
      `port = ${PG_PORT}`,
      'unix_socket_directories = \'/tmp\'',
      'max_connections = 50',
      'shared_buffers = 64MB',
      'work_mem = 8MB',
      'maintenance_work_mem = 64MB',
      'effective_cache_size = 256MB',
      'log_min_messages = warning',
      'log_min_error_statement = error',
      'log_line_prefix = \'%m [%p] %q%u@%d \'',
      '',
    ].join('\n')
  );

  console.log('[pg-bootstrap] PostgreSQL data directory initialized.');
}

function isServerRunning(): boolean {
  try {
    const out = execFileSync(
      `${PG_BIN_DIR}/pg_ctl`,
      ['-D', PG_DATA_DIR, 'status'],
      { stdio: ['ignore', 'pipe', 'ignore'] }
    ).toString();
    return /is running/i.test(out);
  } catch {
    return false;
  }
}

function startServer(): void {
  try {
    execFileSync(
      `${PG_BIN_DIR}/pg_ctl`,
      ['-D', PG_DATA_DIR, '-l', PG_LOG_FILE, '-w', '-t', '30', 'start'],
      { stdio: 'pipe' }
    );
    console.log('[pg-bootstrap] PostgreSQL server started on port', PG_PORT);
  } catch (err) {
    // Server might already be starting up — check again.
    if (!isServerRunning()) {
      console.error('[pg-bootstrap] Failed to start PostgreSQL:', err);
      throw err;
    }
  }
}

function createDatabaseIfMissing(): void {
  try {
    execFileSync(
      `${PG_BIN_DIR}/psql`,
      [
        '-h', '/tmp',
        '-p', String(PG_PORT),
        '-U', 'postgres',
        '-d', 'postgres',
        '-tc',
        `SELECT 1 FROM pg_database WHERE datname = '${PG_DB_NAME}'`,
      ],
      { stdio: ['ignore', 'pipe', 'ignore'] }
    );
    // Check the output for "1"
    const out = execFileSync(
      `${PG_BIN_DIR}/psql`,
      [
        '-h', '/tmp',
        '-p', String(PG_PORT),
        '-U', 'postgres',
        '-d', 'postgres',
        '-tAc',
        `SELECT 1 FROM pg_database WHERE datname='${PG_DB_NAME}'`,
      ],
      { stdio: ['ignore', 'pipe', 'ignore'] }
    ).toString().trim();

    if (out === '1') return; // already exists

    execFileSync(
      `${PG_BIN_DIR}/createdb`,
      ['-h', '/tmp', '-p', String(PG_PORT), '-U', 'postgres', PG_DB_NAME],
      { stdio: 'pipe' }
    );
    console.log(`[pg-bootstrap] Database "${PG_DB_NAME}" created.`);
  } catch (err) {
    // If createdb fails because the DB already exists, that's fine.
    console.warn('[pg-bootstrap] createDatabaseIfMissing warning:', err instanceof Error ? err.message : err);
  }
}

/**
 * Synchronous best-effort bootstrap. Returns immediately once the server is
 * confirmed running (or after kicking off start). The pg Pool will retry
 * connections if the server is still coming up.
 */
export function ensurePostgresRunningSync(): void {
  if (bootstrapped) return;

  // If the data dir doesn't exist, init it.
  initClusterIfMissing();

  if (!isServerRunning()) {
    startServer();
  }

  createDatabaseIfMissing();
  bootstrapped = true;
}

/**
 * Async version that waits for the server to accept connections before
 * returning. Useful for scripts that need a guaranteed-ready DB.
 */
export async function ensurePostgresRunning(): Promise<void> {
  ensurePostgresRunningSync();

  // Wait for the server to accept TCP connections.
  const net = await import('node:net');
  const maxAttempts = 30;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const ok = await new Promise<boolean>((resolve) => {
      const sock = new net.Socket();
      sock.setTimeout(500);
      sock.once('connect', () => {
        sock.destroy();
        resolve(true);
      });
      sock.once('error', () => {
        sock.destroy();
        resolve(false);
      });
      sock.once('timeout', () => {
        sock.destroy();
        resolve(false);
      });
      sock.connect(PG_PORT, 'localhost');
    });
    if (ok) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('PostgreSQL did not become ready in time');
}

/**
 * Make sure paths exist (used by scripts that may run before /home/z/pg is set up).
 * Returns true if the postgres binaries are available.
 */
export async function isPgAvailable(): Promise<boolean> {
  try {
    await access(`${PG_BIN_DIR}/postgres`);
    return true;
  } catch {
    return false;
  }
}
