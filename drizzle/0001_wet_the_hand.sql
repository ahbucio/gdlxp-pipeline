CREATE TYPE "public"."event_status" AS ENUM('pending', 'synced');--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "status" "event_status" DEFAULT 'pending' NOT NULL;