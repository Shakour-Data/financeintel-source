#!/bin/bash
# Auto-restart Next.js dev server when it crashes
cd "$(dirname "$0")"
export NODE_OPTIONS="--max-old-space-size=3072"

while true; do
  echo "[$(date)] Starting Next.js..."
  node node_modules/.bin/next dev -p 3000 --webpack 2>&1 | tee -a dev.log &
  NEXT_PID=$!
  
  # Wait for Ready
  sleep 5
  
  # Pre-compile with IPv4
  curl -4 -s --max-time 120 http://127.0.0.1:3000/ > /dev/null 2>&1
  
  # Monitor the process
  while kill -0 $NEXT_PID 2>/dev/null; do
    # Check if port is listening
    if ! ss -tlnp | rg -q ':3000 '; then
      echo "[$(date)] Port 3000 not listening, restarting..."
      kill $NEXT_PID 2>/dev/null
      break
    fi
    sleep 5
  done
  
  echo "[$(date)] Next.js process died, restarting in 3s..."
  kill $(pgrep -f "next") 2>/dev/null
  sleep 3
done
