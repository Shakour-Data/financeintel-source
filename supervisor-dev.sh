#!/bin/bash
# Dev server supervisor - keeps Next.js dev server alive
cd /home/z/my-project
export NODE_OPTIONS="--max-old-space-size=768"

LOG=/home/z/my-project/dev.log

while true; do
  echo "[$(date)] Starting Next.js dev server..." >> "$LOG"
  npx next dev -p 3000 >> "$LOG" 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE, restarting in 3s..." >> "$LOG"
  sleep 3
done
