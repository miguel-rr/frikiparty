CREATE TABLE "frikiparty_game_map_board" (
	"game_map_id" uuid PRIMARY KEY NOT NULL,
	"image_url" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"rings" jsonb NOT NULL,
	"halves" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "frikiparty_match_game_player_position" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_game_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"ring" integer NOT NULL,
	CONSTRAINT "frikiparty_match_game_player_position_match_game_id_player_id_unique" UNIQUE("match_game_id","player_id"),
	CONSTRAINT "frikiparty_match_game_player_position_match_game_id_ring_unique" UNIQUE("match_game_id","ring")
);
--> statement-breakpoint
ALTER TABLE "frikiparty_match_game" ADD COLUMN "ring_sides" jsonb;--> statement-breakpoint
ALTER TABLE "frikiparty_game_map_board" ADD CONSTRAINT "frikiparty_game_map_board_game_map_id_frikiparty_game_map_id_fk" FOREIGN KEY ("game_map_id") REFERENCES "public"."frikiparty_game_map"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_match_game_player_position" ADD CONSTRAINT "frikiparty_match_game_player_position_match_game_id_frikiparty_match_game_id_fk" FOREIGN KEY ("match_game_id") REFERENCES "public"."frikiparty_match_game"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_match_game_player_position" ADD CONSTRAINT "frikiparty_match_game_player_position_player_id_frikiparty_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."frikiparty_player"("id") ON DELETE no action ON UPDATE no action;