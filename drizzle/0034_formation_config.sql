ALTER TABLE "frikiparty_tournament" ADD COLUMN IF NOT EXISTS "formation_config" jsonb;--> statement-breakpoint
ALTER TABLE "frikiparty_tournament" ADD COLUMN IF NOT EXISTS "ranking_meta" jsonb;