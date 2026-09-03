CREATE TABLE "frikiparty_edition_player" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"confirmed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "frikiparty_edition_player_edition_id_player_id_unique" UNIQUE("edition_id","player_id")
);
--> statement-breakpoint
ALTER TABLE "frikiparty_edition_player" ADD CONSTRAINT "frikiparty_edition_player_edition_id_frikiparty_edition_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."frikiparty_edition"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_edition_player" ADD CONSTRAINT "frikiparty_edition_player_player_id_frikiparty_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."frikiparty_player"("id") ON DELETE cascade ON UPDATE no action;