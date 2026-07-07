#!/bin/bash
cd /home/z/my-project
export NODE_OPTIONS="--max-old-space-size=1024"

# Loop to auto-restart
while true; do
  echo "[$(date)] Starting Next.js dev server..." >> /tmp/dev-server.log
  npx next dev -p 3000 >> /tmp/dev-server.log 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE, restarting in 3s..." >> /tmp/dev-server.log
  sleep 3
done
