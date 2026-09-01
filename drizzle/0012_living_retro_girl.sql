ALTER TABLE "frikiparty_venue" ADD COLUMN "slug" text;--> statement-breakpoint
UPDATE "frikiparty_venue" SET "slug" = trim(both '-' from regexp_replace(
  lower(translate("name",
    'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
    'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC')),
  '[^a-z0-9]+', '-', 'g')) WHERE "slug" IS NULL;--> statement-breakpoint
ALTER TABLE "frikiparty_venue" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "frikiparty_venue" ADD CONSTRAINT "frikiparty_venue_slug_unique" UNIQUE("slug");
