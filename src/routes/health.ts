// Health check endpoint.
// Confirms the app process is up AND that it can reach the database.

import { Router, Request, Response } from 'express';
import { pool } from '../db/index.js';

export const healthRouter = Router();

healthRouter.get('/health', async (_req: Request, res: Response) => {
  try {
    // Trivial query that forces a real round-trip to Postgres.
    const result = await pool.query('SELECT 1 AS ok');
    res.json({
      status: 'ok',
      database: result.rows[0]?.ok === 1 ? 'connected' : 'unexpected response',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    // In strict mode, `err` here is typed as `unknown` — not `any`.
    // Passing it to console.error is fine because that accepts anything;
    // but if we wanted to read `err.message`, we'd have to narrow it first.
    console.error('[health] DB check failed:', err);
    res.status(503).json({
      status: 'error',
      database: 'unreachable',
      timestamp: new Date().toISOString(),
    });
  }
});