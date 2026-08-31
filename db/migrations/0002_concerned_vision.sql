ALTER TABLE "signals" ADD COLUMN "analysis_confidence" "confidence";--> statement-breakpoint
ALTER TABLE "signals" ADD COLUMN "analysis_evidence" jsonb;--> statement-breakpoint
ALTER TABLE "signals" ADD COLUMN "analyzed_at" timestamp with time zone;