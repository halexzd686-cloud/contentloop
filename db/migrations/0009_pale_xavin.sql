ALTER TABLE "tests" ADD COLUMN "result_evidence" jsonb;--> statement-breakpoint
ALTER TABLE "tests" ADD COLUMN "result_fingerprint" text;--> statement-breakpoint
ALTER TABLE "tests" ADD CONSTRAINT "tests_concluded_completeness" CHECK (
  "status" <> 'concluded'
  OR ("outcome" IS NOT NULL AND "conclusion" IS NOT NULL AND "concluded_at" IS NOT NULL
      AND "result_evidence" IS NOT NULL AND "result_fingerprint" IS NOT NULL)
);
