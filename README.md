# gdlxp-pipeline

AI-powered event aggregation pipeline for [GDL XP](https://gdlxp.com). Scrapes venue websites, enriches events through LLMs, and exposes them via REST (and later GraphQL) APIs.

> **Status:** Phase 0 — Foundation. Deployed skeleton with a `/health` endpoint that confirms database connectivity. Scrapers, LLM enrichment, and scheduled jobs are coming in later phases.

## Tech stack

- **Runtime:** Node.js ≥ 20 (ESM)
- **Web framework:** Express 5
- **Database:** PostgreSQL 17 (managed by [Neon](https://neon.tech))
- **Driver:** `pg` (raw SQL; lightweight ORM may be added later)
- **Deployment:** Railway (containerized Cloud Run migration planned)

## Architecture
src/
├── server.js          Entry point: binds HTTP, handles graceful shutdown
├── app.js             Express app configuration (middleware, routes)
├── config/
│   └── env.js         Centralized env-var loading + validation (fail-fast)
├── db/
│   └── index.js       Shared PostgreSQL connection pool
└── routes/
└── health.js      GET /health — app + database liveness check

The `server.js` / `app.js` split keeps the Express app independently importable (for tests) from the process that binds a TCP port. Environment variables are validated once at startup; the rest of the app imports a typed `config` object rather than reading `process.env` directly.

## Running locally

### Prerequisites

- Node.js ≥ 20 (`node --version`)
- A PostgreSQL database (free tier on [Neon](https://neon.tech) works fine)

### Setup

1. Clone the repo and install dependencies:

```bash
   git clone https://github.com/ahbucio/gdlxp-pipeline.git
   cd gdlxp-pipeline
   npm install
```

2. Copy the environment template and fill in your database URL:

```bash
   cp .env.example .env
   # then edit .env
```

3. Run in development mode (auto-restarts on file changes):

```bash
   npm run dev
```

4. Confirm it works:

```bash
   curl http://localhost:3000/health
   # { "status": "ok", "database": "connected", ... }
```

## Scripts

- `npm run dev` — Development mode with `--watch` auto-restart and `.env` auto-loading
- `npm start` — Production mode (no watcher, no dotenv; expects env from the host)

## Environment variables

See `.env.example` for the full list. Required:

| Variable       | Purpose                               |
| -------------- | ------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string          |
| `PORT`         | HTTP server port (default `3000`)     |
| `NODE_ENV`     | `development` \| `production`         |

## Roadmap

- [x] **Phase 0** — Foundation, `/health`, Railway deploy
- [ ] **Phase 1** — Event & venue schema, migrations, CRUD
- [ ] **Phase 2** — Playwright scrapers for target venues
- [ ] **Phase 3** — LLM enrichment (OpenAI/Anthropic), Redis job queue
- [ ] **Phase 4** — GraphQL API, GDL XP Bubble integration
- [ ] **Phase 5** — Dockerize, migrate to Google Cloud Run