CREATE TABLE "frikiparty_game_map" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"name" text NOT NULL,
	"players" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "frikiparty_game_map_game_id_name_unique" UNIQUE("game_id","name")
);
--> statement-breakpoint
CREATE TABLE "frikiparty_live_room" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"state" jsonb NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"last_seq" integer DEFAULT 0 NOT NULL,
	"deadline_at" timestamp,
	"paused_remaining_ms" integer,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "frikiparty_live_room_tournament_id_kind_unique" UNIQUE("tournament_id","kind")
);
--> statement-breakpoint
CREATE TABLE "frikiparty_live_version" (
	"tournament_id" uuid PRIMARY KEY NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "frikiparty_tournament_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"stream" text NOT NULL,
	"seq" integer NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"at" timestamp NOT NULL,
	"actor_user_id" text,
	"impersonated_by_user_id" text,
	"undone_by_seq" integer,
	CONSTRAINT "frikiparty_tournament_event_tournament_id_seq_unique" UNIQUE("tournament_id","seq")
);
--> statement-breakpoint
CREATE TABLE "frikiparty_match_game_faction_draw" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_game_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"faction_id" uuid NOT NULL,
	"draw_order" integer NOT NULL,
	CONSTRAINT "frikiparty_match_game_faction_draw_match_game_id_team_id_faction_id_unique" UNIQUE("match_game_id","team_id","faction_id")
);
--> statement-breakpoint
CREATE TABLE "frikiparty_phase_bracket_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phase_id" uuid NOT NULL,
	"has_third_place_match" boolean DEFAULT false NOT NULL,
	"seeding_source" text DEFAULT 'previous_phase' NOT NULL,
	CONSTRAINT "frikiparty_phase_bracket_config_phase_id_unique" UNIQUE("phase_id")
);
--> statement-breakpoint
CREATE TABLE "frikiparty_phase_faction_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phase_id" uuid NOT NULL,
	"allow_repeat_across_teams" boolean DEFAULT true NOT NULL,
	"pool_mode" text DEFAULT 'fresh' NOT NULL,
	"pool_carries_over" boolean DEFAULT false NOT NULL,
	CONSTRAINT "frikiparty_phase_faction_rules_phase_id_unique" UNIQUE("phase_id")
);
--> statement-breakpoint
CREATE TABLE "frikiparty_phase_group" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phase_id" uuid NOT NULL,
	"group_index" integer NOT NULL,
	"label" text NOT NULL,
	CONSTRAINT "frikiparty_phase_group_phase_id_group_index_unique" UNIQUE("phase_id","group_index")
);
--> statement-breakpoint
CREATE TABLE "frikiparty_phase_group_team" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"seed" integer NOT NULL,
	CONSTRAINT "frikiparty_phase_group_team_group_id_team_id_unique" UNIQUE("group_id","team_id")
);
--> statement-breakpoint
CREATE TABLE "frikiparty_tournament_vote" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"voter_player_id" uuid NOT NULL,
	"order" uuid[] NOT NULL,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "frikiparty_tournament_vote_tournament_id_voter_player_id_unique" UNIQUE("tournament_id","voter_player_id")
);
--> statement-breakpoint
ALTER TABLE "frikiparty_comment" DROP CONSTRAINT "comment_single_target";--> statement-breakpoint
ALTER TABLE "frikiparty_like" DROP CONSTRAINT "like_single_target";--> statement-breakpoint
ALTER TABLE "frikiparty_match" DROP CONSTRAINT "frikiparty_match_phase_id_frikiparty_phase_id_fk";
--> statement-breakpoint
ALTER TABLE "frikiparty_match_game" DROP CONSTRAINT "frikiparty_match_game_match_id_frikiparty_match_id_fk";
--> statement-breakpoint
ALTER TABLE "frikiparty_match_game_player_faction" DROP CONSTRAINT "frikiparty_match_game_player_faction_match_game_id_frikiparty_match_game_id_fk";
--> statement-breakpoint
ALTER TABLE "frikiparty_match_game_save_file" DROP CONSTRAINT "frikiparty_match_game_save_file_match_game_id_frikiparty_match_game_id_fk";
--> statement-breakpoint
ALTER TABLE "frikiparty_phase" DROP CONSTRAINT "frikiparty_phase_tournament_id_frikiparty_tournament_id_fk";
--> statement-breakpoint
ALTER TABLE "frikiparty_phase_bracket_round_config" DROP CONSTRAINT "frikiparty_phase_bracket_round_config_phase_id_frikiparty_phase_id_fk";
--> statement-breakpoint
ALTER TABLE "frikiparty_phase_group_config" DROP CONSTRAINT "frikiparty_phase_group_config_phase_id_frikiparty_phase_id_fk";
--> statement-breakpoint
ALTER TABLE "frikiparty_auction" DROP CONSTRAINT "frikiparty_auction_tournament_id_frikiparty_tournament_id_fk";
--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "impersonated_by" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "banned" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ban_reason" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ban_expires" timestamp;--> statement-breakpoint
ALTER TABLE "frikiparty_faction" ADD COLUMN "code" text;--> statement-breakpoint
ALTER TABLE "frikiparty_faction" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "frikiparty_match" ADD COLUMN "group_id" uuid;--> statement-breakpoint
ALTER TABLE "frikiparty_match" ADD COLUMN "order" integer;--> statement-breakpoint
ALTER TABLE "frikiparty_match" ADD COLUMN "is_third_place" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "frikiparty_match" ADD COLUMN "is_tiebreak" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "frikiparty_match" ADD COLUMN "bye_team_id" uuid;--> statement-breakpoint
ALTER TABLE "frikiparty_match_game" ADD COLUMN "map_id" uuid;--> statement-breakpoint
ALTER TABLE "frikiparty_match_game" ADD COLUMN "status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "frikiparty_match_game" ADD COLUMN "ready_team_a_at" timestamp;--> statement-breakpoint
ALTER TABLE "frikiparty_match_game" ADD COLUMN "ready_team_b_at" timestamp;--> statement-breakpoint
ALTER TABLE "frikiparty_match_game" ADD COLUMN "confirmed_team_a_at" timestamp;--> statement-breakpoint
ALTER TABLE "frikiparty_match_game" ADD COLUMN "confirmed_team_b_at" timestamp;--> statement-breakpoint
ALTER TABLE "frikiparty_match_game" ADD COLUMN "started_at" timestamp;--> statement-breakpoint
ALTER TABLE "frikiparty_phase" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "frikiparty_phase_group_config" ADD COLUMN "tiebreak_chain" jsonb DEFAULT '["head_to_head","ranking_inverse","draw"]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "frikiparty_phase_group_config" ADD COLUMN "group_count" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "frikiparty_phase_group_config" ADD COLUMN "qualifiers_per_group" integer DEFAULT 4 NOT NULL;--> statement-breakpoint
ALTER TABLE "frikiparty_phase_group_config" ADD COLUMN "group_distribution" text DEFAULT 'random' NOT NULL;--> statement-breakpoint
ALTER TABLE "frikiparty_comment" ADD COLUMN "match_id" uuid;--> statement-breakpoint
ALTER TABLE "frikiparty_like" ADD COLUMN "match_id" uuid;--> statement-breakpoint
ALTER TABLE "frikiparty_auction" ADD COLUMN "initial_timer_ms" integer DEFAULT 30000 NOT NULL;--> statement-breakpoint
ALTER TABLE "frikiparty_auction" ADD COLUMN "countdown_ms" integer DEFAULT 20000 NOT NULL;--> statement-breakpoint
ALTER TABLE "frikiparty_auction" ADD COLUMN "countdown_short_ms" integer DEFAULT 15000 NOT NULL;--> statement-breakpoint
ALTER TABLE "frikiparty_auction" ADD COLUMN "countdown_short_after_bids" integer DEFAULT 6 NOT NULL;--> statement-breakpoint
ALTER TABLE "frikiparty_auction" ADD COLUMN "lockout_ms" integer DEFAULT 1500 NOT NULL;--> statement-breakpoint
ALTER TABLE "frikiparty_tournament" ADD COLUMN "kind" text;--> statement-breakpoint
ALTER TABLE "frikiparty_tournament" ADD COLUMN "stage" text;--> statement-breakpoint
ALTER TABLE "frikiparty_tournament" ADD COLUMN "stage_changed_at" timestamp;--> statement-breakpoint
ALTER TABLE "frikiparty_tournament" ADD COLUMN "team_size" integer;--> statement-breakpoint
ALTER TABLE "frikiparty_tournament" ADD COLUMN "ranking_source" text;--> statement-breakpoint
ALTER TABLE "frikiparty_tournament" ADD COLUMN "historical_weight_percent" integer;--> statement-breakpoint
ALTER TABLE "frikiparty_tournament" ADD COLUMN "formation_method" text;--> statement-breakpoint
ALTER TABLE "frikiparty_tournament" ADD COLUMN "captain_pot_index" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "frikiparty_tournament" ADD COLUMN "created_by_user_id" text;--> statement-breakpoint
ALTER TABLE "frikiparty_game_map" ADD CONSTRAINT "frikiparty_game_map_game_id_frikiparty_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."frikiparty_game"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_live_room" ADD CONSTRAINT "frikiparty_live_room_tournament_id_frikiparty_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."frikiparty_tournament"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_live_version" ADD CONSTRAINT "frikiparty_live_version_tournament_id_frikiparty_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."frikiparty_tournament"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_tournament_event" ADD CONSTRAINT "frikiparty_tournament_event_tournament_id_frikiparty_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."frikiparty_tournament"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_tournament_event" ADD CONSTRAINT "frikiparty_tournament_event_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_match_game_faction_draw" ADD CONSTRAINT "frikiparty_match_game_faction_draw_match_game_id_frikiparty_match_game_id_fk" FOREIGN KEY ("match_game_id") REFERENCES "public"."frikiparty_match_game"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_match_game_faction_draw" ADD CONSTRAINT "frikiparty_match_game_faction_draw_team_id_frikiparty_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."frikiparty_team"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_match_game_faction_draw" ADD CONSTRAINT "frikiparty_match_game_faction_draw_faction_id_frikiparty_faction_id_fk" FOREIGN KEY ("faction_id") REFERENCES "public"."frikiparty_faction"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_phase_bracket_config" ADD CONSTRAINT "frikiparty_phase_bracket_config_phase_id_frikiparty_phase_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."frikiparty_phase"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_phase_faction_rules" ADD CONSTRAINT "frikiparty_phase_faction_rules_phase_id_frikiparty_phase_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."frikiparty_phase"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_phase_group" ADD CONSTRAINT "frikiparty_phase_group_phase_id_frikiparty_phase_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."frikiparty_phase"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_phase_group_team" ADD CONSTRAINT "frikiparty_phase_group_team_group_id_frikiparty_phase_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."frikiparty_phase_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_phase_group_team" ADD CONSTRAINT "frikiparty_phase_group_team_team_id_frikiparty_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."frikiparty_team"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_tournament_vote" ADD CONSTRAINT "frikiparty_tournament_vote_tournament_id_frikiparty_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."frikiparty_tournament"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_tournament_vote" ADD CONSTRAINT "frikiparty_tournament_vote_voter_player_id_frikiparty_player_id_fk" FOREIGN KEY ("voter_player_id") REFERENCES "public"."frikiparty_player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_match" ADD CONSTRAINT "frikiparty_match_group_id_frikiparty_phase_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."frikiparty_phase_group"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_match" ADD CONSTRAINT "frikiparty_match_bye_team_id_frikiparty_team_id_fk" FOREIGN KEY ("bye_team_id") REFERENCES "public"."frikiparty_team"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_match" ADD CONSTRAINT "frikiparty_match_phase_id_frikiparty_phase_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."frikiparty_phase"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_match_game" ADD CONSTRAINT "frikiparty_match_game_map_id_frikiparty_game_map_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."frikiparty_game_map"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_match_game" ADD CONSTRAINT "frikiparty_match_game_match_id_frikiparty_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."frikiparty_match"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_match_game_player_faction" ADD CONSTRAINT "frikiparty_match_game_player_faction_match_game_id_frikiparty_match_game_id_fk" FOREIGN KEY ("match_game_id") REFERENCES "public"."frikiparty_match_game"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_match_game_save_file" ADD CONSTRAINT "frikiparty_match_game_save_file_match_game_id_frikiparty_match_game_id_fk" FOREIGN KEY ("match_game_id") REFERENCES "public"."frikiparty_match_game"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_phase" ADD CONSTRAINT "frikiparty_phase_tournament_id_frikiparty_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."frikiparty_tournament"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_phase_bracket_round_config" ADD CONSTRAINT "frikiparty_phase_bracket_round_config_phase_id_frikiparty_phase_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."frikiparty_phase"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_phase_group_config" ADD CONSTRAINT "frikiparty_phase_group_config_phase_id_frikiparty_phase_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."frikiparty_phase"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_comment" ADD CONSTRAINT "frikiparty_comment_match_id_frikiparty_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."frikiparty_match"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_like" ADD CONSTRAINT "frikiparty_like_match_id_frikiparty_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."frikiparty_match"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_auction" ADD CONSTRAINT "frikiparty_auction_tournament_id_frikiparty_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."frikiparty_tournament"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_tournament" ADD CONSTRAINT "frikiparty_tournament_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "like_user_match_unique" ON "frikiparty_like" USING btree ("user_id","match_id") WHERE "frikiparty_like"."match_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "frikiparty_phase_group_config" DROP COLUMN "tiebreak_method";--> statement-breakpoint
ALTER TABLE "frikiparty_faction" ADD CONSTRAINT "frikiparty_faction_code_unique" UNIQUE("code");--> statement-breakpoint
ALTER TABLE "frikiparty_comment" ADD CONSTRAINT "comment_single_target" CHECK (num_nonnulls("frikiparty_comment"."media_id", "frikiparty_comment"."edition_id", "frikiparty_comment"."player_id", "frikiparty_comment"."match_id") = 1);--> statement-breakpoint
ALTER TABLE "frikiparty_like" ADD CONSTRAINT "like_single_target" CHECK (num_nonnulls("frikiparty_like"."media_id", "frikiparty_like"."edition_id", "frikiparty_like"."player_id", "frikiparty_like"."match_id") = 1);