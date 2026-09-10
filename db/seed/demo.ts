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
  // M5.5: exactly one coherent published DEMO journey (Publication +
  // 24h + 72h). For demonstrating metrics/Analytics/cold-start
  // Diagnosis — never an operational baseline provider (isDemo).
  journey: {
    content: "00000000-0000-4000-8000-000000000a01",
    brief: "00000000-0000-4000-8000-000000000a02",
    master: "00000000-0000-4000-8000-000000000a03",
    version: "00000000-0000-4000-8000-000000000a04",
    publication: "00000000-0000-4000-8000-000000000a05",
    snapshot24: "00000000-0000-4000-8000-000000000a06",
    snapshot72: "00000000-0000-4000-8000-000000000a07",
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

  // ── One coherent published DEMO journey (M5.5) ─────────
  // Demonstrates Publication → 24h/72h metrics → derived metrics →
  // Analytics → cold-start Diagnosis readiness. Never an operational
  // baseline provider. Diagnosis/Test/Learning intentionally NOT
  // preseeded — they are live demo actions.
  const jPubAt = new Date(Date.now() - 5 * 86400000);
  const j24 = new Date(jPubAt.getTime() + 25 * 3600000);
  const j72 = new Date(jPubAt.getTime() + 74 * 3600000);

  await db
    .insert(schema.contents)
    .values({
      id: DEMO.journey.content, brandId, pillarId: pillarTutorial,
      title: "[DEMO] Claude Agent 实测（完整旅程示例）",
      status: "published" as const, ownerId: alex, reviewerId: sarah,
      priority: "normal" as const, isDemo: true,
      primaryPlatform: "xiaohongshu" as const,
    })
    .onConflictDoNothing();

  await db
    .insert(schema.contentBriefs)
    .values({
      id: DEMO.journey.brief, contentId: DEMO.journey.content,
      targetAudience: "想用 AI 提效的内容创作者（DEMO 示例）",
      userProblem: "听说 AI Agent 很强但不知道实际能做什么（DEMO 示例）",
      coreQuestion: "Claude Agent 在真实内容工作中到底能替代多少重复劳动（DEMO 示例）",
      mainAngle: "一周真实场景实测（DEMO 示例）",
      contentPromise: "看完知道它适合/不适合什么工作（DEMO 示例）",
      keyEvidence: "DEMO 示例文案，非真实测评证据",
      differentiation: "真实工作流实测而非功能罗列（DEMO 示例）",
      cta: "收藏备用，评论区交流你的场景（DEMO 示例）",
      status: "approved" as const, approvedAt: new Date(), approvedBy: alex,
    })
    .onConflictDoNothing();

  await db
    .insert(schema.contentMasters)
    .values({
      id: DEMO.journey.master, contentId: DEMO.journey.content,
      modules: [
        { id: "jm-1", type: "hook", order: 0, content: "我把一整周的内容杂活都丢给了 Claude Agent（DEMO 示例）" },
        { id: "jm-2", type: "core_message", order: 1, content: "它能做的是可拆解的重复步骤，不是替你判断（DEMO 示例）" },
        { id: "jm-3", type: "section", order: 2, content: "场景一：资料整理与初稿框架（DEMO 示例）" },
        { id: "jm-4", type: "section", order: 3, content: "场景二：多平台改写与校对（DEMO 示例）" },
        { id: "jm-5", type: "demo", order: 4, content: "屏幕实录：一次完整任务的过程（DEMO 示例）" },
        { id: "jm-6", type: "evidence", order: 5, content: "DEMO 示例，非真实测评数据" },
        { id: "jm-7", type: "conclusion", order: 6, content: "适合：流程化杂活；不适合：需要品味与判断的部分（DEMO 示例）" },
        { id: "jm-8", type: "cta", order: 7, content: "收藏 + 评论区说说你的场景（DEMO 示例）" },
      ],
    })
    .onConflictDoNothing();

  await db
    .insert(schema.platformVersions)
    .values({
      id: DEMO.journey.version, contentId: DEMO.journey.content,
      platform: "xiaohongshu" as const, status: "published" as const,
      data: {
        title: "[DEMO] Claude Agent 实测：一周内容杂活交给它",
        coverCopy: "AI Agent 到底能替我省多少事（DEMO）",
        openingHook: "我把一整周的内容杂活都丢给了 Claude Agent（DEMO 示例）",
        body: "DEMO 示例正文。",
        tags: ["AI", "效率工具", "Claude"],
        cta: "收藏备用（DEMO）",
      },
    })
    .onConflictDoNothing();

  await db
    .insert(schema.publications)
    .values({
      id: DEMO.journey.publication, platformVersionId: DEMO.journey.version,
      contentId: DEMO.journey.content, platform: "xiaohongshu" as const,
      finalTitle: "[DEMO] Claude Agent 实测：一周内容杂活交给它",
      publishedAt: jPubAt, url: "https://example.com/demo-journey-claude-agent",
      notes: "DEMO journey fixture — synthetic metrics for product exploration, not real performance.",
    })
    .onConflictDoNothing();

  await db
    .insert(schema.metricSnapshots)
    .values([
      {
        id: DEMO.journey.snapshot24, publicationId: DEMO.journey.publication,
        checkpoint: "24h" as const, capturedAt: j24,
        metrics: { views: 3200, likes: 180, saves: 210, comments: 42 }, source: "manual" as const,
      },
      {
        id: DEMO.journey.snapshot72, publicationId: DEMO.journey.publication,
        checkpoint: "72h" as const, capturedAt: j72,
        metrics: { views: 8600, likes: 460, saves: 590, comments: 118 }, source: "manual" as const,
      },
    ])
    .onConflictDoNothing();
  console.log("  ✓ 1 DEMO journey content (published + 24h/72h metrics)");

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
