#!/bin/bash
cd /home/z/my-project
export NODE_OPTIONS="--max-old-space-size=256"

# Start the data fetcher in background (runs every 5 minutes)
(
  while true; do
    node scripts/fetch-market-data.mjs 2>>/tmp/fetcher.log
    sleep 300
  done
) &
FETCHER_PID=$!
echo "[$(date)] Data fetcher started (PID: $FETCHER_PID)" >> /tmp/server-start.log

# Start the production server
while true; do
  echo "[$(date)] Starting production server..." >> /tmp/server-start.log
  node .next/standalone/server.js >> /tmp/server-start.log 2>&1
  echo "[$(date)] Server exited, restarting in 3s..." >> /tmp/server-start.log
  sleep 3
done
