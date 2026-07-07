import { spawn } from 'child_process';
import { appendFileSync } from 'fs';

const LOG_FILE = '/home/z/my-project/dev.log';
const MAX_RETRIES = 100;
let retries = 0;

function startServer() {
  const timestamp = new Date().toISOString();
  appendFileSync(LOG_FILE, `\n[${timestamp}] Supervisor: Starting bun run dev (attempt ${retries + 1})...\n`);

  const child = spawn('bun', ['run', 'dev'], {
    cwd: '/home/z/my-project',
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=3072', PORT: '3000' },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });

  child.stdout.on('data', (data) => {
    appendFileSync(LOG_FILE, data.toString());
  });

  child.stderr.on('data', (data) => {
    appendFileSync(LOG_FILE, data.toString());
  });

  child.on('exit', (code, signal) => {
    const ts = new Date().toISOString();
    appendFileSync(LOG_FILE, `\n[${ts}] Supervisor: Server exited code=${code} signal=${signal}\n`);
    retries++;
    if (retries < MAX_RETRIES) {
      appendFileSync(LOG_FILE, `[${ts}] Supervisor: Restarting in 3s...\n`);
      setTimeout(startServer, 3000);
    } else {
      appendFileSync(LOG_FILE, `[${ts}] Supervisor: Max retries reached, giving up.\n`);
    }
  });

  child.on('error', (err) => {
    const ts = new Date().toISOString();
    appendFileSync(LOG_FILE, `\n[${ts}] Supervisor: Failed to start: ${err.message}\n`);
    retries++;
    if (retries < MAX_RETRIES) {
      setTimeout(startServer, 5000);
    }
  });
}

// Ignore termination signals so the supervisor stays alive
process.on('SIGTERM', () => {
  appendFileSync(LOG_FILE, `[${new Date().toISOString()}] Supervisor: SIGTERM - ignoring\n`);
});
process.on('SIGINT', () => {
  appendFileSync(LOG_FILE, `[${new Date().toISOString()}] Supervisor: SIGINT - ignoring\n`);
});

startServer();
