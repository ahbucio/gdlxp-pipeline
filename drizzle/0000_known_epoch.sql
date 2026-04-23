CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"url" text,
	"raw_source" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"website_url" text,
	"city" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "venues_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "events_venue_url_unique" ON "events" USING btree ("venue_id","url");--> statement-breakpoint
CREATE INDEX "events_starts_at_idx" ON "events" USING btree ("starts_at");