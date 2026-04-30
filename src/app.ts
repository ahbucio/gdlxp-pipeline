import express from 'express';
import { healthRouter } from './routes/health.js';
import { venuesRouter } from './routes/venues.js';
import { eventsRouter } from './routes/events.js';
import { extractEventRouter } from './routes/extractEvent.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';

export const app = express();

app.use(express.json());

// Landing page for the root URL. Recruiter-facing; everything else is JSON.
app.get('/', (_req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>GDL XP Pipeline</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
           max-width: 640px; margin: 3rem auto; padding: 0 1rem;
           color: #222; line-height: 1.5; }
    h1 { margin-bottom: 0.25rem; }
    .lede { color: #555; margin-top: 0; }
    code { background: #f4f4f4; padding: 0.1rem 0.35rem; border-radius: 3px;
           font-size: 0.95em; }
    ul { padding-left: 1.25rem; }
    li { margin: 0.4rem 0; }
    a { color: #0366d6; }
  </style>
</head>
<body>
  <h1>GDL XP Pipeline</h1>
  <p class="lede">An AI-powered event aggregation pipeline. Scrapes venue websites,
     extracts structured event data via LLM, persists to Postgres.</p>

  <h2>Endpoints</h2>
  <ul>
    <li><code>GET /health</code> &mdash; service health check</li>
    <li><code>GET /api/venues</code> &mdash; list venues</li>
    <li><code>GET /api/events</code> &mdash; list events</li>
<li><code>POST /api/extract-event</code> &mdash; LLM-powered event extraction from raw text</li>  </ul>

  <p><a href="https://github.com/ahbucio/gdlxp-pipeline">View source on GitHub &rarr;</a></p>
</body>
</html>`);
});

app.use(healthRouter);
app.use('/api/venues', venuesRouter);
app.use('/api/events', eventsRouter);
app.use('/api/extract-event', extractEventRouter);

app.use(notFoundHandler);
app.use(errorHandler);