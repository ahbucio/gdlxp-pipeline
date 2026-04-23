// Source of truth for our database structure.
// drizzle-kit reads this at dev time to generate migrations (CREATE TABLE ... SQL).
// drizzle-orm reads this at runtime so queries are typechecked against it.
// If this file and the actual database drift apart, drizzle-kit's next `generate`
// run writes a migration that brings the database back in line.

import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ---------- venues ----------
export const venues = pgTable('venues', {
  // serial = auto-incrementing integer primary key. Postgres picks the next number.
  id: serial('id').primaryKey(),

  // .notNull() is the NOT NULL constraint we decided on.
  name: text('name').notNull(),

  // .unique() attaches a unique constraint at the column level.
  // This is what Decision 1 locked in. It also gives us a free index on slug.
  slug: text('slug').notNull().unique(),

  // Nullable by default — we don't chain .notNull().
  website_url: text('website_url'),
  city: text('city'),

  // withTimezone: true => Postgres type `timestamptz`. Always store timestamps with TZ;
  // storing without TZ causes ambiguity when you later deploy across regions.
  // defaultNow() => the database fills this in on INSERT if we don't provide it.
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),

  // $onUpdate() => drizzle-orm's hook. On any UPDATE through drizzle, it sets this
  // to `new Date()` automatically. Not a database trigger — it's drizzle-orm
  // injecting the value into the UPDATE statement. So raw SQL updates bypassing
  // drizzle wouldn't touch this column; that's fine because we control all writes.
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ---------- events ----------
export const events = pgTable(
  'events',
  {
    id: serial('id').primaryKey(),

    // Foreign key. integer column that references venues.id.
    // .references(() => venues.id) tells Postgres: reject any venue_id that doesn't
    // exist in venues. The arrow function is a drizzle convention to avoid circular
    // import issues when tables reference each other.
    venue_id: integer('venue_id')
      .notNull()
      .references(() => venues.id),

    title: text('title').notNull(),
    description: text('description'),
    starts_at: timestamp('starts_at', { withTimezone: true }).notNull(),
    ends_at: timestamp('ends_at', { withTimezone: true }),
    url: text('url'),

    // jsonb = binary JSON. Parsed on write, stored efficiently, fast to query into later.
    // Nullable because human-created events (via CRUD later) won't have a raw source.
    raw_source: jsonb('raw_source'),

    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  // Second argument to pgTable: table-level constraints/indexes.
  // These can't be expressed on a single column because they span multiple columns
  // or need a name we control.
  (table) => [
    // Decision 2: dedup key. Unique across (venue_id, url).
    // uniqueIndex, not unique() here, because this spans two columns.
    // Recall from Decision 2: Postgres treats NULL as not-equal-to-anything, so rows
    // with url IS NULL don't conflict under this constraint. That's the behavior we want.
    uniqueIndex('events_venue_url_unique').on(table.venue_id, table.url),

    // Decision 3: index on starts_at for date-range queries.
    // Note: this is a plain index, not unique. Multiple events can start at the same time.
    index('events_starts_at_idx').on(table.starts_at),
  ]
);