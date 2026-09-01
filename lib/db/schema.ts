/**
 * ContentLoop V1 — Database Schema
 * Source of truth: docs/ContentLoop_data-model_v1.md
 *
 * 20 core tables (M0). Deferred: content_version_history, metric_import_jobs.
 *
 * Key rules:
 * - null means unavailable, never use 0 for missing data
 * - All timestamps are timestamptz (UTC)
 * - JSONB for flexible nested data (modules, platform data, metrics, etc.)
 * - Soft delete via deleted_at on Content, Signal, Publication
 */

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  boolean,
  integer,
  timestamp,
  jsonb,
  unique,
  index,
} from "drizzle-orm/pg-core";
import type { AnalysisEvidenceItem } from "@/lib/ai/schemas";

// ─── Enums ──────────────────────────────────────────────────────────────────

export const platformEnum = pgEnum("platform", [
  "xiaohongshu",
  "bilibili",
  "douyin",
]);

export const signalInputTypeEnum = pgEnum("signal_input_type", ["url", "idea"]);

export const signalSourceTypeEnum = pgEnum("signal_source_type", [
  "official",
  "community",
  "competitor",
  "news",
  "idea",
  "other",
]);

export const signalStatusEnum = pgEnum("signal_status", [
  "new",
  "reviewing",
  "selected",
  "skipped",
]);

export const skipReasonEnum = pgEnum("skip_reason", [
  "too_late",
  "saturated",
  "low_audience_fit",
  "insufficient_information",
  "high_production_cost",
  "no_clear_angle",
  "other",
]);

export const contentStatusEnum = pgEnum("content_status", [
  "planning",
  "in_progress",
  "review",
  "scheduled",
  "published",
]);

export const contentPriorityEnum = pgEnum("content_priority", [
  "normal",
  "breaking",
]);

export const sourceTypeEnum = pgEnum("source_type", [
  "official",
  "community",
  "competitor",
  "note",
]);

export const verificationStatusEnum = pgEnum("verification_status", [
  "verified",
  "unverified",
  "community",
  "internal_note",
]);

export const briefStatusEnum = pgEnum("brief_status", ["draft", "approved"]);

export const platformVersionStatusEnum = pgEnum("platform_version_status", [
  "draft",
  "review",
  "approved",
  "published",
]);

export const metricCheckpointEnum = pgEnum("metric_checkpoint", [
  "24h",
  "72h",
  "manual",
]);

export const metricSourceEnum = pgEnum("metric_source", [
  "manual",
  "csv",
  "xlsx",
]);

export const metricTypeEnum = pgEnum("metric_type", ["raw", "derived"]);
export const metricFormatEnum = pgEnum("metric_format", [
  "count",
  "percentage",
  "ratio",
]);

export const confidenceEnum = pgEnum("confidence", [
  "high",
  "medium",
  "low",
  "insufficient_evidence",
]);

export const testMethodEnum = pgEnum("test_method", [
  "ab",
  "sequential",
  "before_after",
  "content_comparison",
]);

export const testStatusEnum = pgEnum("test_status", ["running", "concluded"]);

export const testOutcomeEnum = pgEnum("test_outcome", [
  "win",
  "trade_off",
  "no_clear_result",
  "loss",
]);

export const testPublicationRoleEnum = pgEnum("test_publication_role", [
  "control",
  "variant",
  "comparison",
]);

export const learningActionEnum = pgEnum("learning_action", [
  "applied",
  "dismissed",
]);

// ─── Base Config ────────────────────────────────────────────────────────────

export const brands = pgTable("brands", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  logoUrl: text("logo_url"),
  description: text("description"),
  targetAudience: text("target_audience").notNull(),
  enabledPlatforms: jsonb("enabled_platforms").$type<string[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const teamMembers = pgTable("team_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  brandId: uuid("brand_id")
    .references(() => brands.id)
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  avatarUrl: text("avatar_url"),
  title: varchar("title", { length: 255 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const contentPillars = pgTable("content_pillars", {
  id: uuid("id").defaultRandom().primaryKey(),
  brandId: uuid("brand_id")
    .references(() => brands.id)
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  primaryGoal: text("primary_goal"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const platformPlaybooks = pgTable(
  "platform_playbooks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    brandId: uuid("brand_id")
      .references(() => brands.id)
      .notNull(),
    platform: platformEnum("platform").notNull(),
    voice: text("voice"),
    titleStyle: text("title_style"),
    hookStyle: text("hook_style"),
    structure: text("structure"),
    cta: text("cta"),
    avoid: jsonb("avoid").$type<string[]>(),
    goodExamples: jsonb("good_examples").$type<
      { title: string; note?: string; url?: string }[]
    >(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [unique().on(table.brandId, table.platform)]
);

export const metricDefinitions = pgTable(
  "metric_definitions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    brandId: uuid("brand_id")
      .references(() => brands.id)
      .notNull(),
    platform: platformEnum("platform").notNull(),
    key: varchar("key", { length: 100 }).notNull(),
    displayName: varchar("display_name", { length: 255 }).notNull(),
    alias: varchar("alias", { length: 255 }),
    type: metricTypeEnum("type").notNull(),
    numeratorKey: varchar("numerator_key", { length: 100 }),
    denominatorKey: varchar("denominator_key", { length: 100 }),
    formula: text("formula"),
    format: metricFormatEnum("format").default("count").notNull(),
    meaning: text("meaning"),
    caution: text("caution"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  // One (brand, platform, key) pair = one definition (M2.2 invariant)
  (table) => [unique().on(table.brandId, table.platform, table.key)]
);

// ─── Radar ──────────────────────────────────────────────────────────────────

export const signals = pgTable(
  "signals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    brandId: uuid("brand_id")
      .references(() => brands.id)
      .notNull(),
    inputType: signalInputTypeEnum("input_type").notNull(),
    sourceUrl: text("source_url"),
    sourceType: signalSourceTypeEnum("source_type"),
    title: varchar("title", { length: 500 }).notNull(),
    summary: text("summary"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    status: signalStatusEnum("status").default("new").notNull(),
    audienceFitScore: integer("audience_fit_score"),
    timingScore: integer("timing_score"),
    contentPotentialScore: integer("content_potential_score"),
    topicScore: integer("topic_score"),
    whyItMatters: text("why_it_matters"),
    audienceMatch: text("audience_match"),
    contentRisk: text("content_risk"),
    possibleAngles: jsonb("possible_angles").$type<string[]>(),
    skipReason: skipReasonEnum("skip_reason"),
    selectedAngle: text("selected_angle"),
    primaryPlatform: platformEnum("primary_platform"),
    ownerId: uuid("owner_id").references(() => teamMembers.id),
    competitorGap: text("competitor_gap"),
    suggestedAngle: text("suggested_angle"),
    // AI analysis metadata (M1.2B). Status is derived:
    // analyzed_at null → not analyzed; confidence insufficient_evidence → insufficient evidence.
    analysisConfidence: confidenceEnum("analysis_confidence"),
    analysisEvidence: jsonb("analysis_evidence").$type<AnalysisEvidenceItem[]>(),
    analyzedAt: timestamp("analyzed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [index("signals_brand_status_idx").on(table.brandId, table.status)]
);

export const competitorReferences = pgTable("competitor_references", {
  id: uuid("id").defaultRandom().primaryKey(),
  signalId: uuid("signal_id")
    .references(() => signals.id)
    .notNull(),
  platform: platformEnum("platform"),
  url: text("url").notNull(),
  title: varchar("title", { length: 500 }),
  angle: text("angle"),
  hook: text("hook"),
  structure: text("structure"),
  whatWorks: text("what_works"),
  whatToAvoid: text("what_to_avoid"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ─── Content ────────────────────────────────────────────────────────────────

export const contents = pgTable(
  "contents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    brandId: uuid("brand_id")
      .references(() => brands.id)
      .notNull(),
    sourceSignalId: uuid("source_signal_id").references(() => signals.id),
    pillarId: uuid("pillar_id").references(() => contentPillars.id),
    title: varchar("title", { length: 500 }).notNull(),
    status: contentStatusEnum("status").default("planning").notNull(),
    ownerId: uuid("owner_id").references(() => teamMembers.id),
    reviewerId: uuid("reviewer_id").references(() => teamMembers.id),
    priority: contentPriorityEnum("priority").default("normal").notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    deadlineAt: timestamp("deadline_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("contents_brand_status_idx").on(table.brandId, table.status),
    unique("contents_source_signal_id_unique").on(table.sourceSignalId),
  ]
);

export const sources = pgTable("sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  contentId: uuid("content_id")
    .references(() => contents.id)
    .notNull(),
  type: sourceTypeEnum("type").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  url: text("url"),
  summary: text("summary"),
  verificationStatus: verificationStatusEnum("verification_status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const contentBriefs = pgTable(
  "content_briefs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contentId: uuid("content_id")
      .references(() => contents.id)
      .notNull(),
    targetAudience: text("target_audience").notNull(),
    userProblem: text("user_problem").notNull(),
    coreQuestion: text("core_question").notNull(),
    mainAngle: text("main_angle").notNull(),
    contentPromise: text("content_promise").notNull(),
    keyEvidence: text("key_evidence").notNull(),
    differentiation: text("differentiation").notNull(),
    cta: text("cta").notNull(),
    status: briefStatusEnum("status").default("draft").notNull(),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: uuid("approved_by").references(() => teamMembers.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  // Content 1 → 0..1 ContentBrief (data-model §10.1)
  (table) => [unique("content_briefs_content_id_unique").on(table.contentId)]
);

export const contentMasters = pgTable(
  "content_masters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contentId: uuid("content_id")
      .references(() => contents.id)
      .notNull(),
    modules: jsonb("modules")
      .$type<
        {
          id: string;
          type:
            | "hook"
            | "core_message"
            | "section"
            | "demo"
            | "evidence"
            | "conclusion"
            | "cta";
          title?: string;
          content: string;
          sourceIds?: string[];
          order: number;
        }[]
      >()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  // Content 1 → 0..1 ContentMaster (data-model §11)
  (table) => [unique("content_masters_content_id_unique").on(table.contentId)]
);

export const platformVersions = pgTable(
  "platform_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contentId: uuid("content_id")
      .references(() => contents.id)
      .notNull(),
    platform: platformEnum("platform").notNull(),
    status: platformVersionStatusEnum("status").default("draft").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>().notNull(),
    visualBrief: jsonb("visual_brief").$type<{
      coverCopy?: string;
      mainSubject?: string;
      composition?: string;
      background?: string;
      visualAccent?: string;
      imagePrompt?: string;
    }>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [unique().on(table.contentId, table.platform)]
);

export const contentReviews = pgTable("content_reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  platformVersionId: uuid("platform_version_id")
    .references(() => platformVersions.id)
    .notNull(),
  factsConfirmed: boolean("facts_confirmed").default(false).notNull(),
  titleCoverMatch: boolean("title_cover_match").default(false).notNull(),
  platformFitConfirmed: boolean("platform_fit_confirmed")
    .default(false)
    .notNull(),
  riskChecked: boolean("risk_checked").default(false).notNull(),
  humanReviewed: boolean("human_reviewed").default(false).notNull(),
  reviewerId: uuid("reviewer_id").references(() => teamMembers.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => [
  // PlatformVersion 1 → 0..1 current ContentReview (data-model §15; no review history in V1)
  unique("content_reviews_platform_version_id_unique").on(table.platformVersionId),
]);

// ─── Publication & Metrics ──────────────────────────────────────────────────

export const publications = pgTable(
  "publications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    platformVersionId: uuid("platform_version_id")
      .references(() => platformVersions.id)
      .notNull(),
    contentId: uuid("content_id")
      .references(() => contents.id)
      .notNull(),
    platform: platformEnum("platform").notNull(),
    finalTitle: varchar("final_title", { length: 500 }).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    url: text("url").notNull(),
    coverUrl: text("cover_url"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [unique().on(table.platformVersionId)]
);

export const metricSnapshots = pgTable(
  "metric_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicationId: uuid("publication_id")
      .references(() => publications.id)
      .notNull(),
    checkpoint: metricCheckpointEnum("checkpoint").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
    metrics: jsonb("metrics").$type<Record<string, number | null>>().notNull(),
    source: metricSourceEnum("source").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [unique().on(table.publicationId, table.checkpoint)]
);

// ─── Analytics & Learning ───────────────────────────────────────────────────

export const diagnoses = pgTable(
  "diagnoses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicationId: uuid("publication_id")
      .references(() => publications.id)
      .notNull(),
    // M2.6: Diagnosis identity = MetricSnapshot (Publication + Checkpoint).
    // No snapshot-less diagnosis; one current diagnosis per snapshot.
    metricSnapshotId: uuid("metric_snapshot_id")
      .references(() => metricSnapshots.id)
      .notNull(),
    whatHappened: text("what_happened").notNull(),
    evidence: jsonb("evidence")
      .$type<
        {
          metricKey: string;
          baselineScope?: "account" | "pillar";
          currentValue?: number | null;
          baselineValue?: number | null;
          sampleCount?: number | null;
          absoluteDelta?: number | null;
          comparisonText: string;
        }[]
      >()
      .notNull(),
    possibleReasons: jsonb("possible_reasons").$type<string[]>().notNull(),
    confidence: confidenceEnum("confidence").notNull(),
    nextActions: jsonb("next_actions").$type<string[]>().notNull(),
    // Deterministic subject fingerprint at save time; staleness is derived
    // by comparing it to the current subject fingerprint on read.
    subjectFingerprint: text("subject_fingerprint").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [unique().on(table.metricSnapshotId)]
);

export const tests = pgTable("tests", {
  id: uuid("id").defaultRandom().primaryKey(),
  brandId: uuid("brand_id")
    .references(() => brands.id)
    .notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  hypothesis: text("hypothesis").notNull(),
  change: text("change").notNull(),
  primaryMetricKey: varchar("primary_metric_key", { length: 100 }).notNull(),
  keepConsistent: text("keep_consistent"),
  compareWith: text("compare_with"),
  method: testMethodEnum("method").notNull(),
  status: testStatusEnum("status").default("running").notNull(),
  outcome: testOutcomeEnum("outcome"),
  conclusion: text("conclusion"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  concludedAt: timestamp("concluded_at", { withTimezone: true }),
});

export const testPublications = pgTable(
  "test_publications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    testId: uuid("test_id")
      .references(() => tests.id)
      .notNull(),
    publicationId: uuid("publication_id")
      .references(() => publications.id)
      .notNull(),
    role: testPublicationRoleEnum("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [unique().on(table.testId, table.publicationId)]
);

export const learnings = pgTable("learnings", {
  id: uuid("id").defaultRandom().primaryKey(),
  brandId: uuid("brand_id")
    .references(() => brands.id)
    .notNull(),
  text: text("text").notNull(),
  platform: platformEnum("platform"),
  pillarId: uuid("pillar_id").references(() => contentPillars.id),
  sourceTestId: uuid("source_test_id").references(() => tests.id),
  evidenceSummary: text("evidence_summary"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const learningApplications = pgTable(
  "learning_applications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    learningId: uuid("learning_id")
      .references(() => learnings.id)
      .notNull(),
    contentId: uuid("content_id")
      .references(() => contents.id)
      .notNull(),
    action: learningActionEnum("action").notNull(),
    appliedAt: timestamp("applied_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [unique().on(table.learningId, table.contentId)]
);
