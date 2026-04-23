// Applies pending migrations to the database.
// Used two ways: as a standalone CLI script (npm run migrate),
// and called from server.ts on startup before app.listen().

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { pool } from './index.js';

// Exported so server.ts can call it on startup.
// Wraps our existing pg.Pool with drizzle, then runs the migrator.
// The migrator reads ./drizzle/ for .sql files, checks __drizzle_migrations
// in the database for what's already applied, and runs only new ones.
export async function runMigrations(): Promise<void> {
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: './drizzle' });
}

// Standalone script entry point. Runs migrations, then exits cleanly.
// The pool.end() is important — without it, the process hangs with an
// open DB connection instead of exiting.
async function main(): Promise<void> {
  console.log('Running migrations...');
  await runMigrations();
  console.log('Migrations complete.');
  await pool.end();
}

// Only run main() when this file is executed directly (npm run migrate),
// NOT when imported by server.ts. Without this guard, importing migrate.ts
// would trigger main() — which calls pool.end() — closing the shared pool
// before server.ts ever gets to use it.
// import.meta.url is the URL of this file; process.argv[1] is the entry
// script Node was started with. If they match, we're running directly.
import { pathToFileURL } from 'node:url';

const isDirectRun = import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}