# GDL XP Pipeline

Guadalajara event aggregation API. A TypeScript Express server with Postgres-backed venues and events CRUD, an LLM-powered event extraction endpoint (Google Gemini 2.5 Flash with native structured output), a Playwright scraper that ingests events end-to-end into Postgres, Zod validation, structured error handling, and smoke-test coverage.

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
| LLM | Google Gemini 2.5 Flash (`@google/genai`) |
| Scraping | Playwright (headless Chromium) |
| Testing | Vitest + supertest |
| Deployment | Railway |

---

## Local Setup

```bash
git clone https://github.com/ahbucio/gdlxp-pipeline.git
cd gdlxp-pipeline
npm install
npx playwright install chromium
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
| `npm run scrape:auditorio` | Scrape Auditorio Telmex, extract via Gemini, insert events with `status='pending'` |
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
├── schemas/           # Zod schemas for request validation (venues, events, extract-event)
├── db/
│   ├── index.ts       # pg.Pool + Drizzle instance
│   ├── schema.ts      # Drizzle table definitions (venues, events)
│   ├── migrate.ts     # Programmatic migration runner
│   └── seed.ts        # Idempotent seed script
├── routes/
│   ├── health.ts      # GET /health — process + DB liveness check
│   ├── venues.ts      # CRUD routes for venues
│   ├── events.ts      # CRUD routes for events
│   └── extractEvent.ts # POST /api/extract-event — LLM extraction (Gemini 2.5 Flash)
├── services/
│   └── extractEvent.ts # Gemini SDK call + prompt + Zod-validated output
├── scrapers/
│   └── auditorioTelmex.ts # Playwright scraper for Auditorio Telmex listings page
└── scripts/
    └── scrapeAndIngest.ts # End-to-end glue: scrape → extract → insert with status='pending'

drizzle/               # Generated migration files (committed to repo)
test/                  # Vitest smoke tests (not compiled into dist/)
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

### Event Extraction (LLM)

| Method | Path | Purpose | Status |
|---|---|---|---|
| POST | `/api/extract-event` | Extract structured event data from raw text using Gemini 2.5 Flash | 200, 400, 502 |

This endpoint is **manual-only**: it takes raw text in (e.g. an Instagram caption), calls Google Gemini with a hand-written prompt and a response schema, and returns structured event data. It does **not** persist to the database — that is a future phase. The model's output is defensively validated with Zod at the service boundary; malformed LLM responses return 502.

Requires the `GEMINI_API_KEY` environment variable.

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

### Example: POST /api/extract-event

**Request**
```json
POST /api/extract-event
Content-Type: application/json

{
  "raw_text": "Te esperamos este jueves a las 8pm en el Foro Independencia para la presentación del nuevo álbum de la banda. Cover $150."
}
```

**Response** `200 OK`
```json
{
  "status": "success",
  "data": {
    "title": "Presentación del nuevo álbum",
    "starts_at": "2025-11-13T20:00:00-06:00",
    "ends_at": null,
    "description": "Presentación del nuevo álbum de la banda. Cover de $150.",
    "venue_hint": "Foro Independencia",
    "location_hint": null
  }
}
```

LLM output is non-deterministic: identical inputs may produce slightly different `title` or `description` values across calls. The response shape is guaranteed by Zod validation.

---

## Scraping Pipeline

The scraper ingests events from a public Mexican event venue (Auditorio Telmex) end-to-end:

1. **Scrape** the venue's listings page with Playwright (headless Chromium).
2. **Extract** structured fields from each event's raw text by calling the `extractEvent()` service directly (no HTTP hop — same function backs both this pipeline and the `POST /api/extract-event` route).
3. **Insert** into the `events` table with `status = 'pending'`, FK to the venue, captured image URL, and the extracted structured fields. The `raw_source` column stores both the scraped text and the LLM's extraction for audit.

### Run it

```bash
npm run scrape:auditorio
```

By default Playwright runs headless. To watch the browser drive the page (useful for debugging selectors):

```powershell
$env:SCRAPER_HEADED=1; npm run scrape:auditorio
```

### Status column

The `events` table has a `status` enum column with two values:

- `pending` — newly inserted by the scraper, awaiting human approval in the existing Bubble admin UI.
- `synced` — pushed to Bubble. Phase 4 will flip the status as part of the push process.

### Idempotency

The scraper uses a simple dedup key: `(venue_id, title, starts_at)`. Re-running the script does not produce duplicates. Phase 4 will replace this with a stronger key (the source URL `evento.php?e=NNNN`, already captured in the `url` column).

### Current scope

- **Auditorio Telmex only.** Teatro Diana was the original target but was unreachable for ~1 week at sprint start; target swap was approved and applied.
- **Listings page only.** Each event has a richer detail page with a full poster and Spanish description. Phase 4+ will visit detail pages to enrich `description` and `image_url`.

### Architecture notes

- **Date anchoring.** The LLM prompt receives today's date and resolves year-less dates (e.g. *"Miércoles 29 Abril 21:00 hrs"*) to the upcoming occurrence.
- **No retries.** Extraction failures are logged and the script continues. Retry policy is intentionally deferred.
- **Polite by design.** Single-navigation per run, realistic User-Agent, no concurrency, no anti-detection.

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

Operational errors (validation failures, not found, FK violations) return 4xx with a meaningful message. LLM upstream failures (Gemini network errors, malformed model output, schema mismatch) return 502 with a distinct code per failure mode (`LLM_UPSTREAM_ERROR`, `LLM_EMPTY_RESPONSE`, `LLM_INVALID_JSON`, `LLM_SCHEMA_MISMATCH`). Programmer errors and unhandled exceptions return 500 with a generic message — stack traces are never sent to clients.

---

## Testing

```bash
npm test          # run all smoke tests once
npm run test:watch  # watch mode for local iteration
```

Tests run against the same Neon database as local dev (Option A — shared DB with cleanup discipline). Every test that creates a row deletes it in `afterAll`. The 3 seeded venues (Teatro Diana, Conjunto Santander, Auditorio Telmex) are required for tests to pass — do not delete them.

The `extractEvent` test hits the **real Gemini API** (no mocks). This is intentional: it verifies the full integration end-to-end, including SDK behavior, prompt correctness, and response schema validation. Gemini's free tier comfortably covers the test load.

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
- **npm audit moderate severities** — 4 moderate vulnerabilities in dev deps. Under review; not blocking.
- **Railway start command** — local `npm start` uses `--env-file=.env`; Railway injects env vars via its own mechanism. Divergence is intentional and documented.
- **CI/CD** — tests do not run automatically on push. Deferred to a future phase.
- **Coverage targets** — no coverage reporting configured. Deferred.
- **Detail-page enrichment** — the scraper currently extracts data only from the listings page. Each event has a richer detail page with a full poster image and a Spanish description. Phase 4+ will visit detail pages per event to populate `description` and upgrade `image_url`.
- **Source-URL dedup** — Phase 3 dedup uses `(venue_id, title, starts_at)`. Phase 4 will switch to the `evento.php?e=NNNN` source URL (already captured in the `url` column) as the canonical dedup key.