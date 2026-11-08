CREATE TABLE "frikiparty_game_file" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"game_version_id" uuid,
	"game_map_id" uuid,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"storage_key" text NOT NULL,
	"file_size" bigint NOT NULL,
	"download_count" integer DEFAULT 0 NOT NULL,
	"uploaded_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "frikiparty_game_file" ADD CONSTRAINT "frikiparty_game_file_game_id_frikiparty_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."frikiparty_game"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_game_file" ADD CONSTRAINT "frikiparty_game_file_game_version_id_frikiparty_game_version_id_fk" FOREIGN KEY ("game_version_id") REFERENCES "public"."frikiparty_game_version"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_game_file" ADD CONSTRAINT "frikiparty_game_file_game_map_id_frikiparty_game_map_id_fk" FOREIGN KEY ("game_map_id") REFERENCES "public"."frikiparty_game_map"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_game_file" ADD CONSTRAINT "frikiparty_game_file_uploaded_by_user_id_user_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;