// PostgreSQL connection pool.
// Single instance, shared across the app. Import `pool` wherever you need to query.

import pg from 'pg';
import { config } from '../config/env.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  // Neon requires SSL. The ?sslmode=require in the URL handles it,
  // but being explicit here protects against misconfigured strings.
  ssl: { rejectUnauthorized: false },
});

// Log pool errors (e.g., DB going away) so they don't silently crash the app.
pool.on('error', (err) => {
  console.error('[db] Unexpected pool error:', err);
});