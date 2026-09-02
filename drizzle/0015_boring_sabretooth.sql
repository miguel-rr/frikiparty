ALTER TABLE "frikiparty_media_association" DROP CONSTRAINT "media_association_single_target";--> statement-breakpoint
ALTER TABLE "frikiparty_media" ADD COLUMN "storage_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "frikiparty_media" ADD COLUMN "thumbnail_key" text;--> statement-breakpoint
ALTER TABLE "frikiparty_media" ADD COLUMN "display_key" text;--> statement-breakpoint
ALTER TABLE "frikiparty_media_association" ADD COLUMN "venue_id" uuid;--> statement-breakpoint
ALTER TABLE "frikiparty_player" ADD COLUMN "link_code" text;--> statement-breakpoint
ALTER TABLE "frikiparty_media_association" ADD CONSTRAINT "frikiparty_media_association_venue_id_frikiparty_venue_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."frikiparty_venue"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_media" DROP COLUMN "url";--> statement-breakpoint
ALTER TABLE "frikiparty_media" DROP COLUMN "thumbnail_url";--> statement-breakpoint
ALTER TABLE "frikiparty_player" ADD CONSTRAINT "frikiparty_player_link_code_unique" UNIQUE("link_code");--> statement-breakpoint
ALTER TABLE "frikiparty_media_association" ADD CONSTRAINT "media_association_single_target" CHECK (num_nonnulls("frikiparty_media_association"."edition_id", "frikiparty_media_association"."tournament_id", "frikiparty_media_association"."match_id", "frikiparty_media_association"."match_game_id", "frikiparty_media_association"."player_id", "frikiparty_media_association"."venue_id") = 1);