import express from 'express';
import { healthRouter } from './routes/health.js';
import { venuesRouter } from './routes/venues.js';
import { eventsRouter } from './routes/events.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';

export const app = express();

app.use(express.json());

app.use(healthRouter);
app.use('/api/venues', venuesRouter);
app.use('/api/events', eventsRouter);

app.use(notFoundHandler);
app.use(errorHandler);