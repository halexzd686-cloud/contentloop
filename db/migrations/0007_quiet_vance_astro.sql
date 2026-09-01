ALTER TABLE "diagnoses" ALTER COLUMN "metric_snapshot_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "diagnoses" ADD COLUMN "subject_fingerprint" text NOT NULL;--> statement-breakpoint
ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_metric_snapshot_id_unique" UNIQUE("metric_snapshot_id");