// Seeds the database with the three Guadalajara venues we'll scrape in Phase 3.
// Idempotent: running it twice doesn't create duplicates. Relies on the
// unique constraint on venues.slug + onConflictDoNothing() to skip
// already-seeded rows silently.

import { drizzle } from 'drizzle-orm/node-postgres';
import { pool } from './index.js';
import { venues } from './schema.js';

async function main(): Promise<void> {
  const db = drizzle(pool);

  const seedVenues = [
    {
      name: 'Teatro Diana',
      slug: 'teatro-diana',
      website_url: 'https://www.teatrodiana.com/',
      city: 'Guadalajara',
    },
    {
      name: 'Conjunto Santander',
      slug: 'conjunto-santander',
      website_url: 'https://conjuntosantander.com/',
      city: 'Guadalajara',
    },
    {
      name: 'Auditorio Telmex',
      slug: 'auditorio-telmex',
      website_url: 'https://www.auditorio-telmex.com/',
      city: 'Guadalajara',
    },
  ];

  console.log('Seeding venues...');
  const result = await db
    .insert(venues)
    .values(seedVenues)
    // If a slug already exists, skip that row. No error, no overwrite.
    .onConflictDoNothing({ target: venues.slug })
    // Returning the inserted rows lets us report how many were actually new
    // (vs. skipped because they already existed).
    .returning({ id: venues.id, slug: venues.slug });

  console.log(`Inserted ${result.length} new venue(s).`);
  if (result.length < seedVenues.length) {
    console.log(
      `Skipped ${seedVenues.length - result.length} (already present).`
    );
  }

  await pool.end();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});