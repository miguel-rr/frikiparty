CREATE TABLE "frikiparty_poll" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"page" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"question" text NOT NULL,
	"options" jsonb NOT NULL,
	"edition_id" uuid NOT NULL,
	"closes_at" timestamp with time zone NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "frikiparty_poll_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "frikiparty_poll_vote" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poll_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"option_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "frikiparty_poll_vote_poll_id_user_id_unique" UNIQUE("poll_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "frikiparty_poll" ADD CONSTRAINT "frikiparty_poll_edition_id_frikiparty_edition_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."frikiparty_edition"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_poll_vote" ADD CONSTRAINT "frikiparty_poll_vote_poll_id_frikiparty_poll_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."frikiparty_poll"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_poll_vote" ADD CONSTRAINT "frikiparty_poll_vote_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "frikiparty_poll" ("slug", "page", "position", "question", "options", "edition_id", "closes_at")
SELECT 'team-formation-2026-auction', 'team-formation-2026', 0,
  '¿Quieres que los equipos se formen con la subasta?',
  '[{"key":"yes","label":"A favor"},{"key":"no","label":"En contra"}]'::jsonb,
  "id", '2026-11-12 21:00:00+01'
FROM "frikiparty_edition" WHERE "year" = 2026 AND "is_rehearsal" = false
ON CONFLICT ("slug") DO NOTHING;--> statement-breakpoint
INSERT INTO "frikiparty_poll" ("slug", "page", "position", "question", "options", "edition_id", "closes_at")
SELECT 'team-formation-2026-proposal', 'team-formation-2026', 1,
  '¿Qué propuesta prefieres para el paso previo?',
  '[{"key":"free","label":"Libre"},{"key":"intermediate","label":"Intermedia"},{"key":"strict","label":"Estricta"}]'::jsonb,
  "id", '2026-11-12 21:00:00+01'
FROM "frikiparty_edition" WHERE "year" = 2026 AND "is_rehearsal" = false
ON CONFLICT ("slug") DO NOTHING;
