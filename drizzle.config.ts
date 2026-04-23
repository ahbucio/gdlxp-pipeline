import { defineConfig } from 'drizzle-kit';

// drizzle-kit reads this when we run `npx drizzle-kit generate`.
// It never runs at application runtime — it's pure dev-tooling config.
export default defineConfig({
  // Where our schema lives. drizzle-kit diffs this against the database's current state
  // to figure out what migration SQL to write.
  schema: './src/db/schema.ts',

  // Where drizzle-kit writes the generated .sql migration files.
  // We'll commit this folder to git.
  out: './drizzle',

  // Postgres-flavored SQL, not MySQL or SQLite.
  dialect: 'postgresql',

  // How drizzle-kit connects to the database when it needs to introspect it.
  // DATABASE_URL is already in .env locally and injected by Railway in prod.
  // The '!' tells TypeScript "I'm asserting this isn't undefined" — drizzle-kit
  // reads it at invocation time, and if it's missing, kit will error clearly.
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});