CREATE TYPE "public"."brief_status" AS ENUM('draft', 'approved');--> statement-breakpoint
CREATE TYPE "public"."confidence" AS ENUM('high', 'medium', 'low', 'insufficient_evidence');--> statement-breakpoint
CREATE TYPE "public"."content_priority" AS ENUM('normal', 'breaking');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('planning', 'in_progress', 'review', 'scheduled', 'published');--> statement-breakpoint
CREATE TYPE "public"."learning_action" AS ENUM('applied', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."metric_checkpoint" AS ENUM('24h', '72h', 'manual');--> statement-breakpoint
CREATE TYPE "public"."metric_source" AS ENUM('manual', 'csv', 'xlsx');--> statement-breakpoint
CREATE TYPE "public"."metric_type" AS ENUM('raw', 'derived');--> statement-breakpoint
CREATE TYPE "public"."platform" AS ENUM('xiaohongshu', 'bilibili', 'douyin');--> statement-breakpoint
CREATE TYPE "public"."platform_version_status" AS ENUM('draft', 'review', 'approved', 'published');--> statement-breakpoint
CREATE TYPE "public"."signal_input_type" AS ENUM('url', 'idea');--> statement-breakpoint
CREATE TYPE "public"."signal_source_type" AS ENUM('official', 'community', 'competitor', 'news', 'idea', 'other');--> statement-breakpoint
CREATE TYPE "public"."signal_status" AS ENUM('new', 'reviewing', 'selected', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."skip_reason" AS ENUM('too_late', 'saturated', 'low_audience_fit', 'insufficient_information', 'high_production_cost', 'no_clear_angle', 'other');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('official', 'community', 'competitor', 'note');--> statement-breakpoint
CREATE TYPE "public"."test_method" AS ENUM('ab', 'sequential', 'before_after', 'content_comparison');--> statement-breakpoint
CREATE TYPE "public"."test_outcome" AS ENUM('win', 'trade_off', 'no_clear_result', 'loss');--> statement-breakpoint
CREATE TYPE "public"."test_publication_role" AS ENUM('control', 'variant', 'comparison');--> statement-breakpoint
CREATE TYPE "public"."test_status" AS ENUM('running', 'concluded');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('verified', 'unverified', 'community', 'internal_note');--> statement-breakpoint
CREATE TABLE "brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"logo_url" text,
	"description" text,
	"target_audience" text NOT NULL,
	"enabled_platforms" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competitor_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"signal_id" uuid NOT NULL,
	"platform" "platform",
	"url" text NOT NULL,
	"title" varchar(500),
	"angle" text,
	"hook" text,
	"structure" text,
	"what_works" text,
	"what_to_avoid" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_briefs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" uuid NOT NULL,
	"target_audience" text NOT NULL,
	"user_problem" text NOT NULL,
	"core_question" text NOT NULL,
	"main_angle" text NOT NULL,
	"content_promise" text NOT NULL,
	"key_evidence" text NOT NULL,
	"differentiation" text NOT NULL,
	"cta" text NOT NULL,
	"status" "brief_status" DEFAULT 'draft' NOT NULL,
	"approved_at" timestamp with time zone,
	"approved_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_masters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" uuid NOT NULL,
	"modules" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_pillars" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"primary_goal" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform_version_id" uuid NOT NULL,
	"facts_confirmed" boolean DEFAULT false NOT NULL,
	"title_cover_match" boolean DEFAULT false NOT NULL,
	"platform_fit_confirmed" boolean DEFAULT false NOT NULL,
	"risk_checked" boolean DEFAULT false NOT NULL,
	"human_reviewed" boolean DEFAULT false NOT NULL,
	"reviewer_id" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"source_signal_id" uuid,
	"pillar_id" uuid,
	"title" varchar(500) NOT NULL,
	"status" "content_status" DEFAULT 'planning' NOT NULL,
	"owner_id" uuid,
	"reviewer_id" uuid,
	"priority" "content_priority" DEFAULT 'normal' NOT NULL,
	"scheduled_at" timestamp with time zone,
	"deadline_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "diagnoses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"publication_id" uuid NOT NULL,
	"metric_snapshot_id" uuid,
	"what_happened" text NOT NULL,
	"evidence" jsonb NOT NULL,
	"possible_reasons" jsonb NOT NULL,
	"confidence" "confidence" NOT NULL,
	"next_actions" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learning_id" uuid NOT NULL,
	"content_id" uuid NOT NULL,
	"action" "learning_action" NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learning_applications_learning_id_content_id_unique" UNIQUE("learning_id","content_id")
);
--> statement-breakpoint
CREATE TABLE "learnings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"text" text NOT NULL,
	"platform" "platform",
	"pillar_id" uuid,
	"source_test_id" uuid,
	"evidence_summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metric_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"platform" "platform" NOT NULL,
	"key" varchar(100) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"alias" varchar(255),
	"type" "metric_type" NOT NULL,
	"numerator_key" varchar(100),
	"denominator_key" varchar(100),
	"formula" text,
	"meaning" text,
	"caution" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metric_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"publication_id" uuid NOT NULL,
	"checkpoint" "metric_checkpoint" NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"metrics" jsonb NOT NULL,
	"source" "metric_source" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "metric_snapshots_publication_id_checkpoint_unique" UNIQUE("publication_id","checkpoint")
);
--> statement-breakpoint
CREATE TABLE "platform_playbooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"platform" "platform" NOT NULL,
	"voice" text,
	"title_style" text,
	"hook_style" text,
	"structure" text,
	"cta" text,
	"avoid" jsonb,
	"good_examples" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_playbooks_brand_id_platform_unique" UNIQUE("brand_id","platform")
);
--> statement-breakpoint
CREATE TABLE "platform_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" uuid NOT NULL,
	"platform" "platform" NOT NULL,
	"status" "platform_version_status" DEFAULT 'draft' NOT NULL,
	"data" jsonb NOT NULL,
	"visual_brief" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_versions_content_id_platform_unique" UNIQUE("content_id","platform")
);
--> statement-breakpoint
CREATE TABLE "publications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform_version_id" uuid NOT NULL,
	"content_id" uuid NOT NULL,
	"platform" "platform" NOT NULL,
	"final_title" varchar(500) NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"url" text NOT NULL,
	"cover_url" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "publications_platform_version_id_unique" UNIQUE("platform_version_id")
);
--> statement-breakpoint
CREATE TABLE "signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"input_type" "signal_input_type" NOT NULL,
	"source_url" text,
	"source_type" "signal_source_type",
	"title" varchar(500) NOT NULL,
	"summary" text,
	"published_at" timestamp with time zone,
	"status" "signal_status" DEFAULT 'new' NOT NULL,
	"audience_fit_score" integer,
	"timing_score" integer,
	"content_potential_score" integer,
	"topic_score" integer,
	"why_it_matters" text,
	"audience_match" text,
	"content_risk" text,
	"possible_angles" jsonb,
	"skip_reason" "skip_reason",
	"selected_angle" text,
	"primary_platform" "platform",
	"owner_id" uuid,
	"competitor_gap" text,
	"suggested_angle" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" uuid NOT NULL,
	"type" "source_type" NOT NULL,
	"title" varchar(500) NOT NULL,
	"url" text,
	"summary" text,
	"verification_status" "verification_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"avatar_url" text,
	"title" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_publications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"test_id" uuid NOT NULL,
	"publication_id" uuid NOT NULL,
	"role" "test_publication_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "test_publications_test_id_publication_id_unique" UNIQUE("test_id","publication_id")
);
--> statement-breakpoint
CREATE TABLE "tests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"hypothesis" text NOT NULL,
	"change" text NOT NULL,
	"primary_metric_key" varchar(100) NOT NULL,
	"keep_consistent" text,
	"compare_with" text,
	"method" "test_method" NOT NULL,
	"status" "test_status" DEFAULT 'running' NOT NULL,
	"outcome" "test_outcome",
	"conclusion" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"concluded_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "competitor_references" ADD CONSTRAINT "competitor_references_signal_id_signals_id_fk" FOREIGN KEY ("signal_id") REFERENCES "public"."signals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_briefs" ADD CONSTRAINT "content_briefs_content_id_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."contents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_briefs" ADD CONSTRAINT "content_briefs_approved_by_team_members_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_masters" ADD CONSTRAINT "content_masters_content_id_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."contents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_pillars" ADD CONSTRAINT "content_pillars_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reviews" ADD CONSTRAINT "content_reviews_platform_version_id_platform_versions_id_fk" FOREIGN KEY ("platform_version_id") REFERENCES "public"."platform_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reviews" ADD CONSTRAINT "content_reviews_reviewer_id_team_members_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contents" ADD CONSTRAINT "contents_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contents" ADD CONSTRAINT "contents_source_signal_id_signals_id_fk" FOREIGN KEY ("source_signal_id") REFERENCES "public"."signals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contents" ADD CONSTRAINT "contents_pillar_id_content_pillars_id_fk" FOREIGN KEY ("pillar_id") REFERENCES "public"."content_pillars"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contents" ADD CONSTRAINT "contents_owner_id_team_members_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contents" ADD CONSTRAINT "contents_reviewer_id_team_members_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_publication_id_publications_id_fk" FOREIGN KEY ("publication_id") REFERENCES "public"."publications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_metric_snapshot_id_metric_snapshots_id_fk" FOREIGN KEY ("metric_snapshot_id") REFERENCES "public"."metric_snapshots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_applications" ADD CONSTRAINT "learning_applications_learning_id_learnings_id_fk" FOREIGN KEY ("learning_id") REFERENCES "public"."learnings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_applications" ADD CONSTRAINT "learning_applications_content_id_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."contents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learnings" ADD CONSTRAINT "learnings_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learnings" ADD CONSTRAINT "learnings_pillar_id_content_pillars_id_fk" FOREIGN KEY ("pillar_id") REFERENCES "public"."content_pillars"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learnings" ADD CONSTRAINT "learnings_source_test_id_tests_id_fk" FOREIGN KEY ("source_test_id") REFERENCES "public"."tests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metric_definitions" ADD CONSTRAINT "metric_definitions_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metric_snapshots" ADD CONSTRAINT "metric_snapshots_publication_id_publications_id_fk" FOREIGN KEY ("publication_id") REFERENCES "public"."publications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_playbooks" ADD CONSTRAINT "platform_playbooks_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_versions" ADD CONSTRAINT "platform_versions_content_id_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."contents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publications" ADD CONSTRAINT "publications_platform_version_id_platform_versions_id_fk" FOREIGN KEY ("platform_version_id") REFERENCES "public"."platform_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publications" ADD CONSTRAINT "publications_content_id_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."contents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_owner_id_team_members_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_content_id_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."contents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_publications" ADD CONSTRAINT "test_publications_test_id_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_publications" ADD CONSTRAINT "test_publications_publication_id_publications_id_fk" FOREIGN KEY ("publication_id") REFERENCES "public"."publications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tests" ADD CONSTRAINT "tests_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contents_brand_status_idx" ON "contents" USING btree ("brand_id","status");--> statement-breakpoint
CREATE INDEX "signals_brand_status_idx" ON "signals" USING btree ("brand_id","status");