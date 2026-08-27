CREATE TABLE "frikiparty_venue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"maps_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "frikiparty_team_member" ALTER COLUMN "player_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "frikiparty_edition" ADD COLUMN "venue_id" uuid;--> statement-breakpoint
ALTER TABLE "frikiparty_edition" ADD CONSTRAINT "frikiparty_edition_venue_id_frikiparty_venue_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."frikiparty_venue"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_edition" DROP COLUMN "venue";--> statement-breakpoint
ALTER TABLE "frikiparty_edition" DROP COLUMN "maps_url";