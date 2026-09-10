/**
 * ContentLoop V1 — Bootstrap seed (pnpm db:seed)
 *
 * Creates ONLY the required bootstrap configuration:
 *   Brand, Team Members, Content Pillars, Platform Playbooks,
 *   Metric Definitions.
 *
 * Idempotent: if a Brand already exists, the workspace is considered
 * bootstrapped and the script is a no-op. Identity uses stable
 * deterministic seed UUIDs (never name heuristics); playbooks and
 * metric definitions upsert on their natural unique keys.
 *
 * No Signals / Contents / Publications / Metrics / Tests / Learnings
 * here — demo data lives in db/seed/demo.ts (pnpm db:seed:demo).
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../../lib/db/schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error(
    "DATABASE_URL is required. Copy .env.example to .env and fill in your connection string."
  );
  process.exit(1);
}

const client = postgres(connectionString, { prepare: false });
const db = drizzle(client, { schema });

export async function closeSeedClient() {
  await client.end();
}

// Stable deterministic seed identity (fixed UUIDs, not name matching).
export const SEED_IDS = {
  brand: "00000000-0000-4000-8000-00000000b001",
  members: {
    alex: "00000000-0000-4000-8000-000000000101",
    sarah: "00000000-0000-4000-8000-000000000102",
    mike: "00000000-0000-4000-8000-000000000103",
  },
  pillars: {
    aiAgentTutorial: "00000000-0000-4000-8000-000000000201",
    aiToolReview: "00000000-0000-4000-8000-000000000202",
    workflow: "00000000-0000-4000-8000-000000000203",
  },
} as const;

export async function seedBootstrap() {
  console.log("🌱 Bootstrapping ContentLoop V1...\n");

  // Single-brand product: an existing Brand means bootstrap is done.
  const existing = await db.select({ id: schema.brands.id }).from(schema.brands).limit(1);
  if (existing.length > 0) {
    console.log("Bootstrap already present (a Brand exists). Nothing to do.");
    return existing[0].id;
  }

  const brandId: string = SEED_IDS.brand;

  await db
    .insert(schema.brands)
    .values({
      id: brandId,
      name: "ContentLoop Demo",
      description: "DEMO — AI content operations workspace",
      targetAudience: "AI tool users and content creators",
      enabledPlatforms: ["xiaohongshu", "bilibili", "douyin"],
    })
    .onConflictDoNothing();
  console.log("  ✓ Brand");

  await db
    .insert(schema.teamMembers)
    .values([
      { id: SEED_IDS.members.alex, brandId, name: "Alex Chen", title: "Content Lead", isActive: true },
      { id: SEED_IDS.members.sarah, brandId, name: "Sarah Wang", title: "Content Operator", isActive: true },
      { id: SEED_IDS.members.mike, brandId, name: "Mike Li", title: "Video Editor", isActive: true },
    ])
    .onConflictDoNothing();
  console.log("  ✓ 3 Team Members");

  await db
    .insert(schema.contentPillars)
    .values([
      {
        id: SEED_IDS.pillars.aiAgentTutorial,
        brandId,
        name: "AI Agent Tutorial",
        description: "How-to guides for AI agent tools and workflows",
        primaryGoal: "Drive saves and follows",
        isActive: true,
      },
      {
        id: SEED_IDS.pillars.aiToolReview,
        brandId,
        name: "AI Tool Review",
        description: "Hands-on reviews of AI tools and platforms",
        primaryGoal: "Drive engagement and discussion",
        isActive: true,
      },
      {
        id: SEED_IDS.pillars.workflow,
        brandId,
        name: "Workflow",
        description: "Content creation and productivity workflows",
        primaryGoal: "Drive shares and saves",
        isActive: true,
      },
    ])
    .onConflictDoNothing();
  console.log("  ✓ 3 Content Pillars");

  await db
    .insert(schema.platformPlaybooks)
    .values([
      {
        brandId,
        platform: "xiaohongshu" as const,
        voice: "Conversational, helpful, authentic",
        titleStyle: "Numbered lists, how-to, question hooks",
        hookStyle: "Pain point or curiosity gap in first line",
        structure: "Cover → Hook → Value points → CTA",
        cta: "Follow for more AI tips",
        avoid: ["Overly promotional language", "Unverified claims"],
        goodExamples: [
          { title: "5 AI tools that save me 10 hours/week", note: "Clear value proposition, specific numbers" },
        ],
      },
      {
        brandId,
        platform: "bilibili" as const,
        voice: "In-depth, educational, slightly casual",
        titleStyle: "Descriptive with key benefit",
        hookStyle: "Problem statement or surprising fact",
        structure: "Intro → Demo → Deep dive → Summary",
        cta: "一键三连 + 关注",
        avoid: ["Clickbait without substance"],
        goodExamples: [{ title: "实测 Claude Agent：它能替代多少重复工作？", note: "Hands-on demo format works well" }],
      },
      {
        brandId,
        platform: "douyin" as const,
        voice: "Fast-paced, direct, engaging",
        titleStyle: "Bold claim or question",
        hookStyle: "Visual hook in first 3 seconds",
        structure: "Hook → Demo → Result → CTA",
        cta: "评论区告诉我你的想法",
        avoid: ["Long intros", "Slow pacing"],
        goodExamples: [{ title: "这个AI工具让我的效率翻倍", note: "Quick demo, immediate value" }],
      },
    ])
    .onConflictDoNothing({ target: [schema.platformPlaybooks.brandId, schema.platformPlaybooks.platform] });
  console.log("  ✓ 3 Platform Playbooks");

  // Metric definitions: core raw active; optional raw inactive; derived
  // = unambiguous formulas only. Upsert on UNIQUE(brand, platform, key).
  const CORE_RAW = [
    { key: "views", displayName: "Views", alias: "播放/阅读", meaning: "Times the content was viewed or read." },
    { key: "likes", displayName: "Likes", alias: "点赞", meaning: "Number of likes." },
    { key: "saves", displayName: "Saves", alias: "收藏", meaning: "Number of saves / favorites." },
    { key: "comments", displayName: "Comments", alias: "评论", meaning: "Number of comments." },
  ];
  const OPTIONAL_RAW = [
    { key: "impressions", displayName: "Impressions", alias: "曝光", meaning: "Times the content was shown in feeds." },
    { key: "followers_gained", displayName: "Followers Gained", alias: "新增关注", meaning: "New followers attributed to the content." },
  ];
  const DERIVED = [
    { key: "like_rate", displayName: "Like Rate", alias: "点赞率", numeratorKey: "likes", denominatorKey: "views" },
    { key: "save_rate", displayName: "Save Rate", alias: "收藏率", numeratorKey: "saves", denominatorKey: "views" },
    { key: "comment_rate", displayName: "Comment Rate", alias: "评论率", numeratorKey: "comments", denominatorKey: "views" },
  ];
  const OPTIONAL_CAUTION =
    "Only enable when this metric is available from the platform analytics source.";

  const metricRows = [];
  for (const platform of ["xiaohongshu", "bilibili", "douyin"] as const) {
    for (const m of CORE_RAW) {
      metricRows.push({ brandId, platform, key: m.key, displayName: m.displayName, alias: m.alias, type: "raw" as const, format: "count" as const, meaning: m.meaning, isActive: true });
    }
    for (const m of OPTIONAL_RAW) {
      metricRows.push({ brandId, platform, key: m.key, displayName: m.displayName, alias: m.alias, type: "raw" as const, format: "count" as const, meaning: m.meaning, caution: OPTIONAL_CAUTION, isActive: false });
    }
    for (const m of DERIVED) {
      metricRows.push({ brandId, platform, key: m.key, displayName: m.displayName, alias: m.alias, type: "derived" as const, numeratorKey: m.numeratorKey, denominatorKey: m.denominatorKey, formula: `${m.numeratorKey} / ${m.denominatorKey} * 100`, format: "percentage" as const, isActive: true });
    }
  }
  await db
    .insert(schema.metricDefinitions)
    .values(metricRows)
    .onConflictDoNothing({
      target: [schema.metricDefinitions.brandId, schema.metricDefinitions.platform, schema.metricDefinitions.key],
    });
  console.log("  ✓ 27 Metric Definitions");

  console.log("\n✅ Bootstrap complete.");
  return brandId;
}
