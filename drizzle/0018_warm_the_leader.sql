CREATE TABLE "frikiparty_comment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"media_id" uuid,
	"edition_id" uuid,
	"player_id" uuid,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"edited_at" timestamp,
	CONSTRAINT "comment_single_target" CHECK (num_nonnulls("frikiparty_comment"."media_id", "frikiparty_comment"."edition_id", "frikiparty_comment"."player_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "frikiparty_like" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"media_id" uuid,
	"edition_id" uuid,
	"player_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "like_single_target" CHECK (num_nonnulls("frikiparty_like"."media_id", "frikiparty_like"."edition_id", "frikiparty_like"."player_id") = 1)
);
--> statement-breakpoint
ALTER TABLE "frikiparty_comment" ADD CONSTRAINT "frikiparty_comment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_comment" ADD CONSTRAINT "frikiparty_comment_media_id_frikiparty_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."frikiparty_media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_comment" ADD CONSTRAINT "frikiparty_comment_edition_id_frikiparty_edition_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."frikiparty_edition"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_comment" ADD CONSTRAINT "frikiparty_comment_player_id_frikiparty_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."frikiparty_player"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_like" ADD CONSTRAINT "frikiparty_like_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_like" ADD CONSTRAINT "frikiparty_like_media_id_frikiparty_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."frikiparty_media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_like" ADD CONSTRAINT "frikiparty_like_edition_id_frikiparty_edition_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."frikiparty_edition"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_like" ADD CONSTRAINT "frikiparty_like_player_id_frikiparty_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."frikiparty_player"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "like_user_media_unique" ON "frikiparty_like" USING btree ("user_id","media_id") WHERE "frikiparty_like"."media_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "like_user_edition_unique" ON "frikiparty_like" USING btree ("user_id","edition_id") WHERE "frikiparty_like"."edition_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "like_user_player_unique" ON "frikiparty_like" USING btree ("user_id","player_id") WHERE "frikiparty_like"."player_id" IS NOT NULL;