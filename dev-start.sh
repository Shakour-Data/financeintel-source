#!/bin/bash
cd "$(dirname "$0")"
export NODE_OPTIONS="--max-old-space-size=3072"
# Pre-compile landing page to avoid OOM when browser loads chunks
curl -4 -s --max-time 120 http://127.0.0.1:3000/ > /dev/null 2>&1 &
exec node node_modules/.bin/next dev -p 3000 --webpack
