// Central place to read & validate environment variables.
// Every other module imports config from here instead of reading process.env directly.

const REQUIRED = ['DATABASE_URL'];

const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(
    `[config] Missing required environment variables: ${missing.join(', ')}`
  );
  console.error('[config] Check your .env file or the Railway dashboard.');
  process.exit(1);
}

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL,
  isProduction: process.env.NODE_ENV === 'production',
};