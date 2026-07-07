#!/bin/bash
cd /home/z/my-project
export NODE_OPTIONS="--max-old-space-size=1024"
exec node ./node_modules/next/dist/bin/next dev -p 3000
