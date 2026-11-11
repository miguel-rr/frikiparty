ALTER TABLE "frikiparty_poll" ALTER COLUMN "closes_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "frikiparty_poll" ADD COLUMN "visible" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "frikiparty_poll" ADD COLUMN "voting_open" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "frikiparty_poll" ADD COLUMN "opens_at" timestamp with time zone;