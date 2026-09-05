CREATE TABLE "frikiparty_faction_hero" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision_id" uuid NOT NULL,
	"name" text NOT NULL,
	"title" text,
	"recruited_at" text,
	"cost" integer,
	"description" text,
	"abilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "frikiparty_faction_power" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision_id" uuid NOT NULL,
	"name" text NOT NULL,
	"tier" integer,
	"cost" integer,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "frikiparty_faction_revision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"faction_id" uuid NOT NULL,
	"game_version_id" uuid NOT NULL,
	"summary" text,
	"overview" text,
	"strengths" text[] DEFAULT '{}'::text[] NOT NULL,
	"weaknesses" text[] DEFAULT '{}'::text[] NOT NULL,
	"changes" text,
	"ring_hero" text,
	"source_url" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "frikiparty_faction_revision_faction_id_game_version_id_unique" UNIQUE("faction_id","game_version_id")
);
--> statement-breakpoint
CREATE TABLE "frikiparty_faction_structure" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision_id" uuid NOT NULL,
	"name" text NOT NULL,
	"cost" integer,
	"health" integer,
	"description" text,
	"bonus" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "frikiparty_faction_unit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"recruited_at" text,
	"requirements" text,
	"cost" integer,
	"command_points" integer,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "frikiparty_faction" ADD COLUMN "kind" text DEFAULT 'core' NOT NULL;--> statement-breakpoint
ALTER TABLE "frikiparty_faction" ADD COLUMN "transforms_faction_id" uuid;--> statement-breakpoint
ALTER TABLE "frikiparty_game" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "frikiparty_game" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "frikiparty_game" ADD COLUMN "website_url" text;--> statement-breakpoint
ALTER TABLE "frikiparty_game_map" ADD COLUMN "introduced_in_version_id" uuid;--> statement-breakpoint
ALTER TABLE "frikiparty_game_map" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "frikiparty_game_version" ADD COLUMN "released_at" date;--> statement-breakpoint
ALTER TABLE "frikiparty_game_version" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "frikiparty_game_version" ADD COLUMN "changelog_url" text;--> statement-breakpoint
ALTER TABLE "frikiparty_faction_hero" ADD CONSTRAINT "frikiparty_faction_hero_revision_id_frikiparty_faction_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."frikiparty_faction_revision"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_faction_power" ADD CONSTRAINT "frikiparty_faction_power_revision_id_frikiparty_faction_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."frikiparty_faction_revision"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_faction_revision" ADD CONSTRAINT "frikiparty_faction_revision_faction_id_frikiparty_faction_id_fk" FOREIGN KEY ("faction_id") REFERENCES "public"."frikiparty_faction"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_faction_revision" ADD CONSTRAINT "frikiparty_faction_revision_game_version_id_frikiparty_game_version_id_fk" FOREIGN KEY ("game_version_id") REFERENCES "public"."frikiparty_game_version"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_faction_structure" ADD CONSTRAINT "frikiparty_faction_structure_revision_id_frikiparty_faction_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."frikiparty_faction_revision"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_faction_unit" ADD CONSTRAINT "frikiparty_faction_unit_revision_id_frikiparty_faction_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."frikiparty_faction_revision"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_faction" ADD CONSTRAINT "frikiparty_faction_transforms_faction_id_frikiparty_faction_id_fk" FOREIGN KEY ("transforms_faction_id") REFERENCES "public"."frikiparty_faction"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_game_map" ADD CONSTRAINT "frikiparty_game_map_introduced_in_version_id_frikiparty_game_version_id_fk" FOREIGN KEY ("introduced_in_version_id") REFERENCES "public"."frikiparty_game_version"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_game" ADD CONSTRAINT "frikiparty_game_slug_unique" UNIQUE("slug");