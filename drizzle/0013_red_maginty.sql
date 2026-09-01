ALTER TABLE "frikiparty_venue" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "frikiparty_venue" ADD COLUMN "is_place" boolean DEFAULT true NOT NULL;--> statement-breakpoint
UPDATE "frikiparty_venue" SET "is_place" = false WHERE "name" IN ('Despedida Richar', 'Madrid', 'Ávila');
