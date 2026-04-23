// HTTP server entry point.
// Binds the Express app to a port and handles graceful shutdown.

import { app } from './app.js';
import { config } from './config/env.js';
import { pool } from './db/index.js';
import { runMigrations } from './db/migrate.js';

// Declared at module scope so the shutdown handler can close it.
// Assigned inside start() after migrations succeed.
let server: ReturnType<typeof app.listen>;

async function start(): Promise<void> {
  console.log('[server] Running migrations...');
  await runMigrations();
  console.log('[server] Migrations complete.');

  server = app.listen(config.port, () => {
    console.log(`[server] Listening on port ${config.port} (${config.env})`);
  });
}

start().catch((err) => {
  console.error('[server] Startup failed:', err);
  process.exit(1);
});

// Graceful shutdown: close HTTP server + DB pool on SIGTERM/SIGINT.
// Railway sends SIGTERM when redeploying; handling it prevents dropped requests.
const shutdown = async (signal: string) => {
  console.log(`[server] ${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    await pool.end();
    console.log('[server] Closed. Bye.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));