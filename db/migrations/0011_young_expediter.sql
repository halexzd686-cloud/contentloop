ALTER TABLE "contents" ADD COLUMN "primary_platform" "platform";--> statement-breakpoint
ALTER TABLE "contents" ADD COLUMN "is_demo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- M4.1 one-time backfill: known DEMO baseline fixtures (exact identities)
UPDATE "contents" SET "is_demo" = true
WHERE "id" IN ('4109cb21-1a38-4ba2-b940-4fcc0cab9a99', '48167099-f24f-4225-b3a6-162be76a7314');--> statement-breakpoint
-- M4.1 one-time backfill: Content.primary_platform from linked Signal
UPDATE "contents" c
SET "primary_platform" = s."primary_platform"
FROM "signals" s
WHERE c."source_signal_id" = s."id"
  AND s."primary_platform" IS NOT NULL;
