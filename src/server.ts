// HTTP server entry point.
// Binds the Express app to a port and handles graceful shutdown.

import { app } from './app.js';
import { config } from './config/env.js';
import { pool } from './db/index.js';

const server = app.listen(config.port, () => {
  console.log(`[server] Listening on port ${config.port} (${config.env})`);
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