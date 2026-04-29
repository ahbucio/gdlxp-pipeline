// End-to-end Auditorio Telmex ingest:
//   1. Scrape the events page (Playwright).
//   2. For each scraped event, call extractEvent() (Gemini LLM).
//   3. Insert into Postgres with status='pending'.
//
// Idempotency: skip insert if a row already exists with the same
// (venue_id, title, starts_at). The brief said don't over-engineer this —
// Phase 4 will add real dedup against Bubble using the source URL.
//
// Failure policy: skip-and-log. Retries are explicitly out of scope per
// the Phase 3 brief.

import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { events, venues } from '../db/schema.js';
import { scrapeAuditorioTelmex } from '../scrapers/auditorioTelmex.js';
import { extractEvent } from '../services/extractEvent.js';


const VENUE_SLUG = 'auditorio-telmex';

async function main() {
  console.log('[ingest] starting Auditorio Telmex ingest');

  // ----- 1. Look up the venue once. The scraper produces N events, all
  //          attached to this same venue. One DB hit instead of N.
  const venueRows = await db
    .select()
    .from(venues)
    .where(eq(venues.slug, VENUE_SLUG))
    .limit(1);

  if (venueRows.length === 0) {
    throw new Error(
      `Venue with slug='${VENUE_SLUG}' not found. Add it to the seed file ` +
      `(src/db/seed.ts) and re-run 'npm run seed' before this script.`
    );
  }
  const venue = venueRows[0];
  console.log(`[ingest] found venue: ${venue.name} (id=${venue.id})`);

  // ----- 2. Scrape.
  console.log('[ingest] scraping...');
  const scraped = await scrapeAuditorioTelmex();
  console.log(`[ingest] scraped ${scraped.length} events`);

  // ----- 3. Loop. Sequential by design — see brief on rate limits / politeness.
  let inserted = 0;
  let skipped = 0;
  let extractionFailed = 0;

for (const event of scraped) {    // 3a. Extract with the LLM.
    let extracted;
    try {
      extracted = await extractEvent(event.rawText);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      console.warn(
        `[ingest] extraction failed for sourceUrl=${event.sourceUrl}: ${msg}`
      );
      extractionFailed++;
      continue;
    }

    // 3b. Skip events without a parseable start time. The events table
    //     requires starts_at NOT NULL, so a null from the extractor is a
    //     dealbreaker. We log and move on.
    if (!extracted.starts_at) {
      console.warn(
        `[ingest] skipping ${extracted.title}: no parseable starts_at`
      );
      extractionFailed++;
      continue;
    }

    const startsAt = new Date(extracted.starts_at);
    const endsAt = extracted.ends_at ? new Date(extracted.ends_at) : null;

    // 3c. Idempotency check. Look for an existing row with the same
    //     (venue_id, title, starts_at). Cheap query — title and starts_at
    //     aren't indexed, but the venue_id filter narrows it hard.
    const existing = await db
      .select({ id: events.id })
      .from(events)
      .where(
        and(
          eq(events.venue_id, venue.id),
          eq(events.title, extracted.title),
          eq(events.starts_at, startsAt)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      skipped++;
      continue;
    }

    // 3d. Insert. status defaults to 'pending' via the schema, so we don't
    //     pass it explicitly — letting the DB-level default do its job.
    await db.insert(events).values({
      venue_id: venue.id,
      title: extracted.title,
      description: extracted.description,
      starts_at: startsAt,
      ends_at: endsAt,
      url: event.sourceUrl,
      image_url: event.imageUrl,
      raw_source: {
        scrapedAt: new Date().toISOString(),
        rawText: event.rawText,
        extracted,
      },
    });

    inserted++;
  }

  console.log(
    `[ingest] done. inserted=${inserted} skipped=${skipped} extraction_failed=${extractionFailed}`
  );
}

await main();