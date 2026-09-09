CREATE TABLE "frikiparty_custom_string" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"note" text,
	"base_en_file_id" uuid,
	"base_en_value" text,
	"base_es_value" text,
	"status" text DEFAULT 'ok' NOT NULL,
	"created_by_user_id" text,
	"updated_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "frikiparty_custom_string_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "frikiparty_str_entry" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "frikiparty_str_entry_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"file_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"comment" text
);
--> statement-breakpoint
CREATE TABLE "frikiparty_str_file" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_version_id" uuid NOT NULL,
	"language" text NOT NULL,
	"source" text,
	"uploaded_by_user_id" text,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"entry_count" integer NOT NULL,
	"sha256" text NOT NULL,
	"r2_key" text NOT NULL,
	"header" text,
	"issues" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "frikiparty_str_file_game_version_id_language_unique" UNIQUE("game_version_id","language")
);
--> statement-breakpoint
ALTER TABLE "frikiparty_custom_string" ADD CONSTRAINT "frikiparty_custom_string_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_custom_string" ADD CONSTRAINT "frikiparty_custom_string_updated_by_user_id_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_custom_string" ADD CONSTRAINT "custom_string_base_en_file_fk" FOREIGN KEY ("base_en_file_id") REFERENCES "public"."frikiparty_str_file"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_str_entry" ADD CONSTRAINT "frikiparty_str_entry_file_id_frikiparty_str_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."frikiparty_str_file"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_str_file" ADD CONSTRAINT "frikiparty_str_file_uploaded_by_user_id_user_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frikiparty_str_file" ADD CONSTRAINT "str_file_game_version_fk" FOREIGN KEY ("game_version_id") REFERENCES "public"."frikiparty_game_version"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "str_entry_file_key_idx" ON "frikiparty_str_entry" USING btree ("file_id","key");--> statement-breakpoint
CREATE INDEX "str_entry_file_seq_idx" ON "frikiparty_str_entry" USING btree ("file_id","seq");