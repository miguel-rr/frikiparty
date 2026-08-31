ALTER TABLE "frikiparty_edition" ADD COLUMN "starts_at" date;--> statement-breakpoint
ALTER TABLE "frikiparty_edition" ADD COLUMN "ends_at" date;--> statement-breakpoint
ALTER TABLE "frikiparty_venue" ADD COLUMN "maps_embed_query" text;