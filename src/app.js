// Express app configuration.
// Exports the configured app; does NOT start the server (that's server.js).
// This separation makes the app testable and swappable.

import express from 'express';
import { healthRouter } from './routes/health.js';

export const app = express();

// Middleware
app.use(express.json()); // Parses JSON request bodies into req.body

// Routes
app.use(healthRouter);

// 404 handler for any unmatched route
app.use((_req, res) => {
  res.status(404).json({ status: 'error', message: 'Route not found' });
});