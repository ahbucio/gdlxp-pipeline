// Central place to read & validate environment variables.
// Every other module imports config from here instead of reading process.env directly.

const REQUIRED = ['DATABASE_URL', 'GEMINI_API_KEY'];

const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(
    `[config] Missing required environment variables: ${missing.join(', ')}`
  );
  console.error('[config] Check your .env file or the Railway dashboard.');
  process.exit(1);
}

// After the check above, the required vars must exist — but TS can't "see" that
// through a dynamic array filter. So we re-read into local consts and do direct
// null-checks. That narrows the types from `string | undefined` down to `string`.
const databaseUrl = process.env.DATABASE_URL;
const geminiApiKey = process.env.GEMINI_API_KEY;
if (!databaseUrl || !geminiApiKey) process.exit(1);

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  databaseUrl,
  geminiApiKey,
  isProduction: process.env.NODE_ENV === 'production',
};