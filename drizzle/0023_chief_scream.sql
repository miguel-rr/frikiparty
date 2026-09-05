ALTER TABLE "frikiparty_faction" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "frikiparty_faction_hero" ADD COLUMN "build_time_seconds" integer;--> statement-breakpoint
ALTER TABLE "frikiparty_faction_hero" ADD COLUMN "health" integer;--> statement-breakpoint
ALTER TABLE "frikiparty_faction_hero" ADD COLUMN "armour_set" text;--> statement-breakpoint
ALTER TABLE "frikiparty_faction_hero" ADD COLUMN "attack_type" text;--> statement-breakpoint
ALTER TABLE "frikiparty_faction_hero" ADD COLUMN "is_summon" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "frikiparty_faction_hero" ADD COLUMN "stats" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "frikiparty_faction_hero" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "frikiparty_faction_hero" ADD COLUMN "portrait_url" text;--> statement-breakpoint
ALTER TABLE "frikiparty_faction_power" ADD COLUMN "position" text;--> statement-breakpoint
ALTER TABLE "frikiparty_faction_power" ADD COLUMN "kind" text;--> statement-breakpoint
ALTER TABLE "frikiparty_faction_power" ADD COLUMN "requires" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "frikiparty_faction_power" ADD COLUMN "stats" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "frikiparty_faction_power" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "frikiparty_faction_structure" ADD COLUMN "kind" text;--> statement-breakpoint
ALTER TABLE "frikiparty_faction_structure" ADD COLUMN "build_time_seconds" integer;--> statement-breakpoint
ALTER TABLE "frikiparty_faction_structure" ADD COLUMN "health_by_level" integer[] DEFAULT '{}'::integer[] NOT NULL;--> statement-breakpoint
ALTER TABLE "frikiparty_faction_structure" ADD COLUMN "armour_set" text;--> statement-breakpoint
ALTER TABLE "frikiparty_faction_structure" ADD COLUMN "max_count" integer;--> statement-breakpoint
ALTER TABLE "frikiparty_faction_structure" ADD COLUMN "produces" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "frikiparty_faction_structure" ADD COLUMN "upgrades" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "frikiparty_faction_structure" ADD COLUMN "abilities" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "frikiparty_faction_structure" ADD COLUMN "stats" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "frikiparty_faction_structure" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "frikiparty_faction_unit" ADD COLUMN "health" integer;--> statement-breakpoint
ALTER TABLE "frikiparty_faction_unit" ADD COLUMN "build_time_seconds" integer;--> statement-breakpoint
ALTER TABLE "frikiparty_faction_unit" ADD COLUMN "armour_set" text;--> statement-breakpoint
ALTER TABLE "frikiparty_faction_unit" ADD COLUMN "attack_type" text;--> statement-breakpoint
ALTER TABLE "frikiparty_faction_unit" ADD COLUMN "max_count" integer;--> statement-breakpoint
ALTER TABLE "frikiparty_faction_unit" ADD COLUMN "is_summon" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "frikiparty_faction_unit" ADD COLUMN "strong_against" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "frikiparty_faction_unit" ADD COLUMN "weak_against" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "frikiparty_faction_unit" ADD COLUMN "abilities" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "frikiparty_faction_unit" ADD COLUMN "upgrades" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "frikiparty_faction_unit" ADD COLUMN "stats" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "frikiparty_faction_unit" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "frikiparty_faction_unit" ADD COLUMN "portrait_url" text;