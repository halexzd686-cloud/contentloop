/**
 * ContentLoop V1 — Optional demo seed (pnpm db:seed:demo)
 *
 * Product-exploration data only: 5 Signals, 3 demo Contents, and 2
 * published DEMO baseline fixtures (with Publication + 24h snapshot)
 * so Analytics baselines have a visible cohort.
 *
 * Idempotent: every row uses a stable deterministic UUID with
 * onConflictDoNothing. Re-running never duplicates. Insert-only:
 * real user content is never overwritten. Every demo Content has
 * isDemo=true (the only demo authority) and demo metrics are preset
 * values for exploration — never real performance data.
 *
 * Requires: pnpm db:seed (bootstrap) first.
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../../lib/db/schema";
import { SEED_IDS, closeSeedClient } from "./bootstrap";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const client = postgres(connectionString, { prepare: false });
const db = drizzle(client, { schema });

const DEMO = {
  signals: [
    "00000000-0000-4000-8000-000000000d01",
    "00000000-0000-4000-8000-000000000d02",
    "00000000-0000-4000-8000-000000000d03",
    "00000000-0000-4000-8000-000000000d04",
    "00000000-0000-4000-8000-000000000d05",
  ],
  contents: [
    "00000000-0000-4000-8000-000000000e01",
    "00000000-0000-4000-8000-000000000e02",
    "00000000-0000-4000-8000-000000000e03",
  ],
  fixtureA: {
    content: "00000000-0000-4000-8000-000000000f0a",
    version: "00000000-0000-4000-8000-000000000f1a",
    publication: "00000000-0000-4000-8000-000000000f2a",
    snapshot: "00000000-0000-4000-8000-000000000f3a",
  },
  fixtureB: {
    content: "00000000-0000-4000-8000-000000000f0b",
    version: "00000000-0000-4000-8000-000000000f1b",
    publication: "00000000-0000-4000-8000-000000000f2b",
    snapshot: "00000000-0000-4000-8000-000000000f3b",
  },
} as const;

export async function seedDemo() {
  console.log("🌱 Seeding demo data...");

  const [brand] = await db.select().from(schema.brands).limit(1);
  if (!brand) {
    throw new Error("No Brand found. Run pnpm db:seed (bootstrap) first.");
  }
  const brandId = brand.id;
  const alex = SEED_IDS.members.alex;
  const sarah = SEED_IDS.members.sarah;
  const pillarTutorial = SEED_IDS.pillars.aiAgentTutorial;
  const pillarReview = SEED_IDS.pillars.aiToolReview;
  const pillarWorkflow = SEED_IDS.pillars.workflow;

  // ── Signals ────────────────────────────────────────────
  await db
    .insert(schema.signals)
    .values([
      {
        id: DEMO.signals[0], brandId, inputType: "url" as const,
        sourceUrl: "https://example.com/claude-agent-update", sourceType: "official" as const,
        title: "Claude releases new Agent capabilities",
        summary: "Anthropic announces enhanced agent features for Claude",
        status: "selected" as const,
        whyItMatters: "Major platform update directly relevant to our audience",
        audienceMatch: "High — our audience actively uses Claude",
        possibleAngles: ["Hands-on review", "Comparison with previous version", "Tutorial for beginners"],
        selectedAngle: "Hands-on review", primaryPlatform: "xiaohongshu" as const, ownerId: alex,
      },
      {
        id: DEMO.signals[1], brandId, inputType: "idea" as const, sourceType: "idea" as const,
        title: "AI content workflow optimization",
        summary: "How we streamlined our content production with AI tools",
        status: "new" as const,
      },
      {
        id: DEMO.signals[2], brandId, inputType: "url" as const,
        sourceUrl: "https://example.com/ai-video-tool", sourceType: "community" as const,
        title: "New AI video editing tool gaining traction",
        summary: "Community discussion about an emerging AI video editor",
        status: "reviewing" as const,
      },
      {
        id: DEMO.signals[3], brandId, inputType: "url" as const,
        sourceUrl: "https://example.com/gpt-5-rumor", sourceType: "news" as const,
        title: "GPT-5 announcement expected next month",
        summary: "Industry speculation about upcoming GPT-5 release",
        status: "new" as const,
      },
      {
        id: DEMO.signals[4], brandId, inputType: "idea" as const, sourceType: "idea" as const,
        title: "Behind the scenes: Our content creation process",
        summary: "Show the real workflow from idea to published content",
        status: "skipped" as const, skipReason: "low_audience_fit",
      },
    ])
    .onConflictDoNothing();
  console.log("  ✓ 5 demo Signals");

  // ── Demo Contents (isDemo authority) ───────────────────
  await db
    .insert(schema.contents)
    .values([
      {
        id: DEMO.contents[0], brandId, sourceSignalId: DEMO.signals[0], pillarId: pillarTutorial,
        title: "Claude Agent 实测", status: "in_progress" as const,
        ownerId: alex, reviewerId: sarah, priority: "normal" as const, isDemo: true,
      },
      {
        id: DEMO.contents[1], brandId, pillarId: pillarReview,
        title: "Top 5 AI Tools for Content Creators", status: "planning" as const,
        ownerId: sarah, priority: "normal" as const, isDemo: true,
      },
      {
        id: DEMO.contents[2], brandId, pillarId: pillarWorkflow,
        title: "Our Content Workflow 2026", status: "planning" as const,
        ownerId: alex, priority: "normal" as const, isDemo: true,
      },
    ])
    .onConflictDoNothing();
  console.log("  ✓ 3 demo Contents (isDemo)");

  // ── DEMO baseline fixtures: published + 24h snapshot ───
  // Gives Analytics a visible historical cohort for exploration.
  const publishedAtA = new Date(Date.now() - 14 * 86400000);
  const publishedAtB = new Date(Date.now() - 13 * 86400000);
  const capturedA = new Date(publishedAtA.getTime() + 25 * 3600000);
  const capturedB = new Date(publishedAtB.getTime() + 25 * 3600000);

  await db
    .insert(schema.contents)
    .values([
      {
        id: DEMO.fixtureA.content, brandId, pillarId: pillarTutorial,
        title: "[DEMO] Baseline Fixture A (same pillar)", status: "published" as const,
        priority: "normal" as const, isDemo: true,
      },
      {
        id: DEMO.fixtureB.content, brandId, pillarId: pillarWorkflow,
        title: "[DEMO] Baseline Fixture B (other pillar)", status: "published" as const,
        priority: "normal" as const, isDemo: true,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.platformVersions)
    .values([
      { id: DEMO.fixtureA.version, contentId: DEMO.fixtureA.content, platform: "xiaohongshu" as const, status: "published" as const, data: { title: "[DEMO] Baseline Fixture A (same pillar)" } },
      { id: DEMO.fixtureB.version, contentId: DEMO.fixtureB.content, platform: "xiaohongshu" as const, status: "published" as const, data: { title: "[DEMO] Baseline Fixture B (other pillar)" } },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.publications)
    .values([
      {
        id: DEMO.fixtureA.publication, platformVersionId: DEMO.fixtureA.version,
        contentId: DEMO.fixtureA.content, platform: "xiaohongshu" as const,
        finalTitle: "[DEMO] Baseline Fixture A (same pillar)",
        publishedAt: publishedAtA, url: "https://example.com/demo-baseline-fixture-a",
      },
      {
        id: DEMO.fixtureB.publication, platformVersionId: DEMO.fixtureB.version,
        contentId: DEMO.fixtureB.content, platform: "xiaohongshu" as const,
        finalTitle: "[DEMO] Baseline Fixture B (other pillar)",
        publishedAt: publishedAtB, url: "https://example.com/demo-baseline-fixture-b",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.metricSnapshots)
    .values([
      {
        id: DEMO.fixtureA.snapshot, publicationId: DEMO.fixtureA.publication,
        checkpoint: "24h" as const, capturedAt: capturedA,
        metrics: { views: 2000, likes: 120, saves: 150, comments: 30 }, source: "manual" as const,
      },
      {
        id: DEMO.fixtureB.snapshot, publicationId: DEMO.fixtureB.publication,
        checkpoint: "24h" as const, capturedAt: capturedB,
        metrics: { views: 1500, likes: 90, saves: 100, comments: 20 }, source: "manual" as const,
      },
    ])
    .onConflictDoNothing();
  console.log("  ✓ 2 DEMO baseline fixtures (published + 24h metrics)");

  console.log("\n✅ Demo seed complete. Demo metrics are preset exploration values, never real performance.");
}

export async function closeDemoClient() {
  await client.end();
  await closeSeedClient();
}

// Script entry (pnpm db:seed:demo → tsx db/seed/demo.ts)
seedDemo()
  .catch((err) => {
    console.error("❌ Demo seed failed:", err);
    process.exit(1);
  })
  .finally(() => closeDemoClient());
