# GDL XP Pipeline

Guadalajara event aggregation API. Phase 1 delivers a TypeScript Express server with Postgres-backed venues and events CRUD, Zod validation, structured error handling, and smoke-test coverage.

---

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ LTS |
| Framework | Express 5.2.1 |
| Language | TypeScript 6 (strict mode) |
| ORM | Drizzle ORM |
| Database | Postgres (Neon) |
| Validation | Zod v4 |
| Testing | Vitest + supertest |
| Deployment | Railway |

---

## Local Setup

```bash
git clone https://github.com/ahbucio/gdlxp-pipeline.git
cd gdlxp-pipeline
npm install
```

Create a `.env` file in the project root. See `.env.example` for required variables. Never commit `.env`.

```bash
npm run migrate   # run pending migrations against your DB
npm run seed      # insert the 3 required seed venues
npm run dev       # start the dev server with hot reload
```

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server with hot reload (tsx watch) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled server from `dist/` |
| `npm run typecheck` | Type-check without emitting files |
| `npm run db:generate` | Generate Drizzle migration files from schema changes |
| `npm run migrate` | Apply pending migrations to the database |
| `npm run seed` | Insert seed data (idempotent — safe to re-run) |
| `npm test` | Run all tests once and exit |
| `npm run test:watch` | Run tests in watch mode (for local iteration) |

---

## Architecture

```
src/
├── server.ts          # Entry point: binds app to port, runs migrations, handles shutdown
├── app.ts             # Express app setup: routes, middleware, error handlers
├── config/env.ts      # Validates required env vars at startup, exits if missing
├── middleware/error.ts # AppError class, notFoundHandler, 4-arg errorHandler
├── schemas/           # Zod schemas for request validation (venues, events)
├── db/
│   ├── index.ts       # pg.Pool + Drizzle instance
│   ├── schema.ts      # Drizzle table definitions (venues, events)
│   ├── migrate.ts     # Programmatic migration runner
│   └── seed.ts        # Idempotent seed script
└── routes/
    ├── health.ts      # GET /health — process + DB liveness check
    ├── venues.ts      # CRUD routes for venues
    └── events.ts      # CRUD routes for events

drizzle/               # Generated migration files (committed to repo)
tests/                 # Vitest smoke tests (not compiled into dist/)
```

---

## API Reference

### Health

| Method | Path | Purpose | Status |
|---|---|---|---|
| GET | `/health` | Liveness check — confirms app and DB are up | 200, 503 |

### Venues

| Method | Path | Purpose | Status |
|---|---|---|---|
| GET | `/api/venues` | List all venues | 200 |
| GET | `/api/venues/:id` | Get venue by id | 200, 404 |
| POST | `/api/venues` | Create a venue | 201, 400 |
| PATCH | `/api/venues/:id` | Update a venue (partial) | 200, 400, 404 |
| DELETE | `/api/venues/:id` | Delete a venue | 200, 404 |

### Events

| Method | Path | Purpose | Status |
|---|---|---|---|
| GET | `/api/events` | List all events | 200 |
| GET | `/api/events/:id` | Get event by id | 200, 404 |
| POST | `/api/events` | Create an event | 201, 400, 409 |
| PATCH | `/api/events/:id` | Update an event (partial) | 200, 400, 404 |
| DELETE | `/api/events/:id` | Delete an event | 200, 404 |

### Example: POST /api/venues

**Request**
```json
POST /api/venues
Content-Type: application/json

{
  "name": "Teatro Diana",
  "slug": "teatro-diana",
  "website_url": "https://teatrodiana.com",
  "city": "Guadalajara"
}
```

**Response** `201 Created`
```json
{
  "status": "success",
  "data": {
    "id": 1,
    "name": "Teatro Diana",
    "slug": "teatro-diana",
    "website_url": "https://teatrodiana.com",
    "city": "Guadalajara",
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-01-01T00:00:00.000Z"
  }
}
```

---

## Error Envelope

All errors return a consistent JSON shape:

```json
{
  "status": "error",
  "message": "Human-readable description",
  "code": "MACHINE_READABLE_CODE"
}
```

Operational errors (validation failures, not found, FK violations) return 4xx with a meaningful message. Programmer errors and unhandled exceptions return 500 with a generic message — stack traces are never sent to clients.

---

## Testing

```bash
npm test          # run all 11 smoke tests once
npm run test:watch  # watch mode for local iteration
```

Tests run against the same Neon database as local dev (Option A — shared DB with cleanup discipline). Every test that creates a row deletes it in `afterAll`. The 3 seeded venues (Teatro Diana, Conjunto Santander, Auditorio Telmex) are required for tests to pass — do not delete them.

**Do not run tests against the production Railway URL.** Tests create and delete rows; a mid-test failure would leave orphaned data on the live database.

---

## Deployment

Railway auto-deploys on every push to `main`.

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Start command | `node --env-file=.env dist/server.js` |

Migrations run automatically on server startup (before `app.listen()`), so schema changes deploy without a manual step.

Live URL: `https://gdlxp-pipeline-production.up.railway.app`

---

## Known Deferred Items

- **SSL hardening** — `pg` SSL mode warnings are present. Full `sslmode=verify-full` config deferred to a later phase.
- **npm audit moderate severities** — 4 moderate vulnerabilities in dev deps. Under review; not blocking Phase 1.
- **Railway start command** — local `npm start` uses `--env-file=.env`; Railway injects env vars via its own mechanism. Divergence is intentional and documented.
- **CI/CD** — tests do not run automatically on push. Deferred to a future phase.
- **Coverage targets** — no coverage reporting configured. Deferred.