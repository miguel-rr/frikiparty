CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "frikiparty_faction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"introduced_in_version_id" uuid NOT NULL,
	"removed_in_version_id" uuid,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "frikiparty_game" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"is_official" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "frikiparty_game_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "frikiparty_game_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"version" text NOT NULL,
	"release_order" integer NOT NULL,
	CONSTRAINT "frikiparty_game_version_game_id_version_unique" UNIQUE("game_id","version")
);
--> statement-breakpoint
CREATE TABLE "frikiparty_tag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "frikiparty_tag_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "frikiparty_edition" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" integer NOT NULL,
	"order" integer DEFAULT 1 NOT NULL,
	"venue" text,
	"maps_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "frikiparty_edition_year_order_unique" UNIQUE("year","order")
);
--> statement-breakpoint
CREATE TABLE "frikiparty_match" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phase_id" uuid NOT NULL,
	"team_a_id" uuid,
	"team_b_id" uuid,
	"winner_team_id" uuid,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"played_at" timestamp,
	"leg" integer,
	"round_index" integer,
	"feeder_match_a_id" uuid,
	"feeder_match_b_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "frikiparty_match_game" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"winner_team_id" uuid,
	"map" text,
	"played_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "frikiparty_match_game_player_faction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_game_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"faction_id" uuid NOT NULL,
	CONSTRAINT "frikiparty_match_game_player_faction_match_game_id_player_id_unique" UNIQUE("match_game_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "frikiparty_match_game_save_file" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_game_id" uuid NOT NULL,
	"url" text NOT NULL,
	"file_size" integer,
	"extracted_metadata" jsonb,
	"uploaded_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "frikiparty_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"mime_type" text NOT NULL,
	"url" text NOT NULL,
	"thumbnail_url" text,
	"caption" text,
	"description" text,
	"width" integer,
	"height" integer,
	"duration_seconds" integer,
	"file_size" integer,
	"taken_at" timestamp,
	"uploaded_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "frikiparty_media_association" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"media_id" uuid NOT NULL,
	"edition_id" uuid,
	"tournament_id" uuid,
	"match_id" uuid,
	"match_game_id" uuid,
	"player_id" uuid,
	CONSTRAINT "media_association_single_target" CHECK (num_nonnulls("frikiparty_media_association"."edition_id", "frikiparty_media_association"."tournament_id", "frikiparty_media_association"."match_id", "frikiparty_media_association"."match_game_id", "frikiparty_media_association"."player_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "frikiparty_media_tag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"media_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "frikiparty_media_tag_media_id_tag_id_unique" UNIQUE("media_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "frikiparty_phase" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"phase_order" integer NOT NULL,
	"type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "frikiparty_phase_tournament_id_phase_order_unique" UNIQUE("tournament_id","phase_order")
);
--> statement-breakpoint
CREATE TABLE "frikiparty_phase_bracket_round_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phase_id" uuid NOT NULL,
	"round_index" integer NOT NULL,
	"games_to_win_match" integer NOT NULL,
	CONSTRAINT "frikiparty_phase_bracket_round_config_phase_id_round_index_unique" UNIQUE("phase_id","round_index")
);
--> statement-breakpoint
CREATE TABLE "frikiparty_phase_group_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phase_id" uuid NOT NULL,
	"rounds_format" text NOT NULL,
	"games_to_win_match" integer NOT NULL,
	"tiebreak_method" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "frikiparty_phase_group_config_phase_id_unique" UNIQUE("phase_id")
);
--> statement-breakpoint
CREATE TABLE "frikiparty_player" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"user_id" text,
	"avatar" text DEFAULT 'gandalf' NOT NULL,
	"image_url" text,
	"bio" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "frikiparty_player_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "frikiparty_auction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "frikiparty_auction_tournament_id_unique" UNIQUE("tournament_id")
);
--> statement-breakpoint
CREATE TABLE "frikiparty_auction_bid" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lot_id" uuid NOT NULL,
	"captain_player_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"bid_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "frikiparty_auction_lot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auction_id" uuid NOT NULL,
	"pot_index" integer NOT NULL,
	"player_id" uuid NOT NULL,
	"sold_at" timestamp NOT NULL,
	"winning_captain_player_id" uuid NOT NULL,
	"final_price" integer NOT NULL,
	"was_auto_assigned" boolean DEFAULT false NOT NULL,
	CONSTRAINT "frikiparty_auction_lot_auction_id_player_id_unique" UNIQUE("auction_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "frikiparty_draft" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"method" text NOT NULL,
	"captain_order_method" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "frikiparty_draft_tournament_id_unique" UNIQUE("tournament_id")
);
--> statement-breakpoint
CREATE TABLE "frikiparty_draft_pick" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"draft_id" uuid NOT NULL,
	"captain_player_id" uuid NOT NULL,
	"pot_index" integer NOT NULL,
	"picked_player_id" uuid NOT NULL,
	"picked_at" timestamp NOT NULL,
	CONSTRAINT "frikiparty_draft_pick_draft_id_picked_player_id_unique" UNIQUE("draft_id","picked_player_id")
);
--> statement-breakpoint
CREATE TABLE "frikiparty_team" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"name" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "frikiparty_team_formation_pot_player" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"pot_index" integer NOT NULL,
	"player_id" uuid NOT NULL,
	CONSTRAINT "frikiparty_team_formation_pot_player_tournament_id_player_id_unique" UNIQUE("tournament_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "frikiparty_team_member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"tournament_id" uuid NOT NULL,
	"is_captain" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "frikiparty_team_member_team_id_player_id_unique" UNIQUE("team_id","player_id"),
	CONSTRAINT "frikiparty_team_member_tournament_id_player_id_unique" UNIQUE("tournament_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "frikiparty_tournament" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"is_official" boolean NOT NULL,
	"game_version_id" uuid,
	"model" text,
	"team_ranking_snapshot" uuid[],
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "frikiparty_tournament_ranking_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"rings" integer NOT NULL,
	"individual_rings" integer NOT NULL,
	"editions_played" integer NOT NULL,
	CONSTRAINT "frikiparty_tournament_ranking_snapshot_tournament_id_player_id_unique" UNIQUE("tournament_id","player_id"),
	CONSTRAINT "frikiparty_tournament_ranking_snapshot_tournament_id_position_unique" UNIQUE("tournament_id","position")
);
--> statement-breakpoint
CREATE TABLE "frikiparty_tournament_swiss_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"elimination_losses" integer NOT NULL,
	"pairing_method" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "frikiparty_tournament_swiss_config_tournament_id_unique" UNIQUE("tournament_id")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_faction" ADD CONSTRAINT "frikiparty_faction_introduced_in_version_id_frikiparty_game_version_id_fk" FOREIGN KEY ("introduced_in_version_id") REFERENCES "public"."frikiparty_game_version"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_faction" ADD CONSTRAINT "frikiparty_faction_removed_in_version_id_frikiparty_game_version_id_fk" FOREIGN KEY ("removed_in_version_id") REFERENCES "public"."frikiparty_game_version"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_game_version" ADD CONSTRAINT "frikiparty_game_version_game_id_frikiparty_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."frikiparty_game"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_match" ADD CONSTRAINT "frikiparty_match_phase_id_frikiparty_phase_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."frikiparty_phase"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_match" ADD CONSTRAINT "frikiparty_match_team_a_id_frikiparty_team_id_fk" FOREIGN KEY ("team_a_id") REFERENCES "public"."frikiparty_team"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_match" ADD CONSTRAINT "frikiparty_match_team_b_id_frikiparty_team_id_fk" FOREIGN KEY ("team_b_id") REFERENCES "public"."frikiparty_team"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_match" ADD CONSTRAINT "frikiparty_match_winner_team_id_frikiparty_team_id_fk" FOREIGN KEY ("winner_team_id") REFERENCES "public"."frikiparty_team"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_match" ADD CONSTRAINT "frikiparty_match_feeder_match_a_id_frikiparty_match_id_fk" FOREIGN KEY ("feeder_match_a_id") REFERENCES "public"."frikiparty_match"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_match" ADD CONSTRAINT "frikiparty_match_feeder_match_b_id_frikiparty_match_id_fk" FOREIGN KEY ("feeder_match_b_id") REFERENCES "public"."frikiparty_match"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_match_game" ADD CONSTRAINT "frikiparty_match_game_match_id_frikiparty_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."frikiparty_match"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_match_game" ADD CONSTRAINT "frikiparty_match_game_winner_team_id_frikiparty_team_id_fk" FOREIGN KEY ("winner_team_id") REFERENCES "public"."frikiparty_team"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_match_game_player_faction" ADD CONSTRAINT "frikiparty_match_game_player_faction_match_game_id_frikiparty_match_game_id_fk" FOREIGN KEY ("match_game_id") REFERENCES "public"."frikiparty_match_game"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_match_game_player_faction" ADD CONSTRAINT "frikiparty_match_game_player_faction_player_id_frikiparty_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."frikiparty_player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_match_game_player_faction" ADD CONSTRAINT "frikiparty_match_game_player_faction_faction_id_frikiparty_faction_id_fk" FOREIGN KEY ("faction_id") REFERENCES "public"."frikiparty_faction"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_match_game_save_file" ADD CONSTRAINT "frikiparty_match_game_save_file_match_game_id_frikiparty_match_game_id_fk" FOREIGN KEY ("match_game_id") REFERENCES "public"."frikiparty_match_game"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_match_game_save_file" ADD CONSTRAINT "frikiparty_match_game_save_file_uploaded_by_user_id_user_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_media" ADD CONSTRAINT "frikiparty_media_uploaded_by_user_id_user_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_media_association" ADD CONSTRAINT "frikiparty_media_association_media_id_frikiparty_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."frikiparty_media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_media_association" ADD CONSTRAINT "frikiparty_media_association_edition_id_frikiparty_edition_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."frikiparty_edition"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_media_association" ADD CONSTRAINT "frikiparty_media_association_tournament_id_frikiparty_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."frikiparty_tournament"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_media_association" ADD CONSTRAINT "frikiparty_media_association_match_id_frikiparty_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."frikiparty_match"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_media_association" ADD CONSTRAINT "frikiparty_media_association_match_game_id_frikiparty_match_game_id_fk" FOREIGN KEY ("match_game_id") REFERENCES "public"."frikiparty_match_game"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_media_association" ADD CONSTRAINT "frikiparty_media_association_player_id_frikiparty_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."frikiparty_player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_media_tag" ADD CONSTRAINT "frikiparty_media_tag_media_id_frikiparty_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."frikiparty_media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_media_tag" ADD CONSTRAINT "frikiparty_media_tag_tag_id_frikiparty_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."frikiparty_tag"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_phase" ADD CONSTRAINT "frikiparty_phase_tournament_id_frikiparty_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."frikiparty_tournament"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_phase_bracket_round_config" ADD CONSTRAINT "frikiparty_phase_bracket_round_config_phase_id_frikiparty_phase_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."frikiparty_phase"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_phase_group_config" ADD CONSTRAINT "frikiparty_phase_group_config_phase_id_frikiparty_phase_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."frikiparty_phase"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_player" ADD CONSTRAINT "frikiparty_player_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_auction" ADD CONSTRAINT "frikiparty_auction_tournament_id_frikiparty_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."frikiparty_tournament"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_auction_bid" ADD CONSTRAINT "frikiparty_auction_bid_lot_id_frikiparty_auction_lot_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."frikiparty_auction_lot"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_auction_bid" ADD CONSTRAINT "frikiparty_auction_bid_captain_player_id_frikiparty_player_id_fk" FOREIGN KEY ("captain_player_id") REFERENCES "public"."frikiparty_player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_auction_lot" ADD CONSTRAINT "frikiparty_auction_lot_auction_id_frikiparty_auction_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."frikiparty_auction"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_auction_lot" ADD CONSTRAINT "frikiparty_auction_lot_player_id_frikiparty_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."frikiparty_player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_auction_lot" ADD CONSTRAINT "frikiparty_auction_lot_winning_captain_player_id_frikiparty_player_id_fk" FOREIGN KEY ("winning_captain_player_id") REFERENCES "public"."frikiparty_player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_draft" ADD CONSTRAINT "frikiparty_draft_tournament_id_frikiparty_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."frikiparty_tournament"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_draft_pick" ADD CONSTRAINT "frikiparty_draft_pick_draft_id_frikiparty_draft_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."frikiparty_draft"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_draft_pick" ADD CONSTRAINT "frikiparty_draft_pick_captain_player_id_frikiparty_player_id_fk" FOREIGN KEY ("captain_player_id") REFERENCES "public"."frikiparty_player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_draft_pick" ADD CONSTRAINT "frikiparty_draft_pick_picked_player_id_frikiparty_player_id_fk" FOREIGN KEY ("picked_player_id") REFERENCES "public"."frikiparty_player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_team" ADD CONSTRAINT "frikiparty_team_tournament_id_frikiparty_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."frikiparty_tournament"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_team_formation_pot_player" ADD CONSTRAINT "frikiparty_team_formation_pot_player_tournament_id_frikiparty_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."frikiparty_tournament"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_team_formation_pot_player" ADD CONSTRAINT "frikiparty_team_formation_pot_player_player_id_frikiparty_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."frikiparty_player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_team_member" ADD CONSTRAINT "frikiparty_team_member_team_id_frikiparty_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."frikiparty_team"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_team_member" ADD CONSTRAINT "frikiparty_team_member_player_id_frikiparty_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."frikiparty_player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_team_member" ADD CONSTRAINT "frikiparty_team_member_tournament_id_frikiparty_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."frikiparty_tournament"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_tournament" ADD CONSTRAINT "frikiparty_tournament_edition_id_frikiparty_edition_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."frikiparty_edition"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_tournament" ADD CONSTRAINT "frikiparty_tournament_game_id_frikiparty_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."frikiparty_game"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_tournament" ADD CONSTRAINT "frikiparty_tournament_game_version_id_frikiparty_game_version_id_fk" FOREIGN KEY ("game_version_id") REFERENCES "public"."frikiparty_game_version"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_tournament_ranking_snapshot" ADD CONSTRAINT "frikiparty_tournament_ranking_snapshot_tournament_id_frikiparty_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."frikiparty_tournament"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_tournament_ranking_snapshot" ADD CONSTRAINT "frikiparty_tournament_ranking_snapshot_player_id_frikiparty_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."frikiparty_player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_tournament_swiss_config" ADD CONSTRAINT "frikiparty_tournament_swiss_config_tournament_id_frikiparty_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."frikiparty_tournament"("id") ON DELETE no action ON UPDATE no action;