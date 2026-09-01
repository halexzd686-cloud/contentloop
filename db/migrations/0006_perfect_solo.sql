CREATE TYPE "public"."metric_format" AS ENUM('count', 'percentage', 'ratio');--> statement-breakpoint
ALTER TABLE "metric_definitions" ADD COLUMN "format" "metric_format" DEFAULT 'count' NOT NULL;--> statement-breakpoint
ALTER TABLE "metric_definitions" ADD CONSTRAINT "metric_definitions_brand_id_platform_key_unique" UNIQUE("brand_id","platform","key");