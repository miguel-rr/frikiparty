ALTER TABLE "frikiparty_player" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "frikiparty_player" ADD CONSTRAINT "frikiparty_player_slug_unique" UNIQUE("slug");