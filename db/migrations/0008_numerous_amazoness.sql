ALTER TABLE "tests" ADD COLUMN "platform" "platform" NOT NULL;--> statement-breakpoint
ALTER TABLE "tests" ADD COLUMN "checkpoint" "metric_checkpoint" NOT NULL;--> statement-breakpoint
ALTER TABLE "tests" ADD CONSTRAINT "tests_checkpoint_24h_72h" CHECK ("checkpoint" IN ('24h', '72h'));
