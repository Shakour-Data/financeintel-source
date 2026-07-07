#!/bin/bash
cd /home/z/my-project
export NODE_OPTIONS="--max-old-space-size=768"

while true; do
  echo "[$(date)] Starting Next.js dev server..." >> /tmp/supervisor.log
  npx next dev -p 3000 2>&1 | tee -a /tmp/supervisor.log
  echo "[$(date)] Server exited with code $?, restarting in 5s..." >> /tmp/supervisor.log
  sleep 5
done
