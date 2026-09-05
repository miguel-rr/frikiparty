ALTER TABLE "frikiparty_match_game_save_file" ADD COLUMN "file_name" text;--> statement-breakpoint
ALTER TABLE "frikiparty_phase_group" ADD COLUMN "tie_resolutions" jsonb DEFAULT '[]'::jsonb NOT NULL;