import { spawn } from 'child_process';

function startServer() {
  console.log(`[${new Date().toISOString()}] Starting production server...`);
  
  const child = spawn('node', ['.next/standalone/server.js'], {
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=256', PORT: '3000' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (data) => {
    process.stdout.write(data);
  });

  child.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  child.on('exit', (code, signal) => {
    console.log(`[${new Date().toISOString()}] Server exited with code=${code} signal=${signal}, restarting in 3s...`);
    setTimeout(startServer, 3000);
  });

  child.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] Failed to start server:`, err);
    setTimeout(startServer, 3000);
  });
}

startServer();
