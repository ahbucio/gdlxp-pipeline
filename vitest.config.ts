import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';

config(); // loads .env into process.env before any test file imports

export default defineConfig({
  test: {
    environment: 'node',
  },
});