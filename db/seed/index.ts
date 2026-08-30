/**
 * ContentLoop V1 — Seed Script
 *
 * Creates minimal DEMO data per implementation-plan §5.4:
 *   1 Brand, 3 Team Members, 3 Content Pillars, 3 Platform Playbooks,
 *   5 Signals, 3 Contents
 *
 * All data is marked as DEMO. Never use seed data as real operational data.
 *
 * Usage: pnpm db:seed
 * Requires: DATABASE_URL environment variable
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../../lib/db/schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required. Copy .env.example to .env and fill in your Supabase connection string.");
  process.exit(1);
}

const client = postgres(connectionString, { prepare: false });
const db = drizzle(client, { schema });

async function seed() {
  console.log("🌱 Seeding ContentLoop V1...\n");

  // ── Brand ──────────────────────────────────────────────
  console.log("Creating brand...");
  const [brand] = await db
    .insert(schema.brands)
    .values({
      name: "ContentLoop Demo",
      description: "DEMO — AI content operations workspace",
      targetAudience: "AI tool users and content creators",
      enabledPlatforms: ["xiaohongshu", "bilibili", "douyin"],
    })
    .returning();
  console.log(`  ✓ Brand: ${brand.name} (${brand.id})\n`);

  // ── Team Members ───────────────────────────────────────
  console.log("Creating team members...");
  const members = await db
    .insert(schema.teamMembers)
    .values([
      {
        brandId: brand.id,
        name: "Alex Chen",
        title: "Content Lead",
        isActive: true,
      },
      {
        brandId: brand.id,
        name: "Sarah Wang",
        title: "Content Operator",
        isActive: true,
      },
      {
        brandId: brand.id,
        name: "Mike Li",
        title: "Video Editor",
        isActive: true,
      },
    ])
    .returning();
  members.forEach((m) => console.log(`  ✓ ${m.name} — ${m.title}`));
  console.log();

  // ── Content Pillars ────────────────────────────────────
  console.log("Creating content pillars...");
  const pillars = await db
    .insert(schema.contentPillars)
    .values([
      {
        brandId: brand.id,
        name: "AI Agent Tutorial",
        description: "How-to guides for AI agent tools and workflows",
        primaryGoal: "Drive saves and follows",
        isActive: true,
      },
      {
        brandId: brand.id,
        name: "AI Tool Review",
        description: "Hands-on reviews of AI tools and platforms",
        primaryGoal: "Drive engagement and discussion",
        isActive: true,
      },
      {
        brandId: brand.id,
        name: "Workflow",
        description: "Content creation and productivity workflows",
        primaryGoal: "Drive shares and saves",
        isActive: true,
      },
    ])
    .returning();
  pillars.forEach((p) => console.log(`  ✓ ${p.name}`));
  console.log();

  // ── Platform Playbooks ─────────────────────────────────
  console.log("Creating platform playbooks...");
  const playbooks = await db
    .insert(schema.platformPlaybooks)
    .values([
      {
        brandId: brand.id,
        platform: "xiaohongshu",
        voice: "Conversational, helpful, authentic",
        titleStyle: "Numbered lists, how-to, question hooks",
        hookStyle: "Pain point or curiosity gap in first line",
        structure: "Cover → Hook → Value points → CTA",
        cta: "Follow for more AI tips",
        avoid: ["Overly promotional language", "Unverified claims"],
        goodExamples: [
          {
            title: "5 AI tools that save me 10 hours/week",
            note: "Clear value proposition, specific numbers",
          },
        ],
      },
      {
        brandId: brand.id,
        platform: "bilibili",
        voice: "In-depth, educational, slightly casual",
        titleStyle: "Descriptive with key benefit",
        hookStyle: "Problem statement or surprising fact",
        structure: "Intro → Demo → Deep dive → Summary",
        cta: "一键三连 + 关注",
        avoid: ["Clickbait without substance"],
        goodExamples: [
          {
            title: "实测 Claude Agent：它能替代多少重复工作？",
            note: "Hands-on demo format works well",
          },
        ],
      },
      {
        brandId: brand.id,
        platform: "douyin",
        voice: "Fast-paced, direct, engaging",
        titleStyle: "Bold claim or question",
        hookStyle: "Visual hook in first 3 seconds",
        structure: "Hook → Demo → Result → CTA",
        cta: "评论区告诉我你的想法",
        avoid: ["Long intros", "Slow pacing"],
        goodExamples: [
          {
            title: "这个AI工具让我的效率翻倍",
            note: "Quick demo, immediate value",
          },
        ],
      },
    ])
    .returning();
  playbooks.forEach((p) => console.log(`  ✓ ${p.platform}`));
  console.log();

  // ── Signals ────────────────────────────────────────────
  console.log("Creating signals...");
  const signals = await db
    .insert(schema.signals)
    .values([
      {
        brandId: brand.id,
        inputType: "url",
        sourceUrl: "https://example.com/claude-agent-update",
        sourceType: "official",
        title: "Claude releases new Agent capabilities",
        summary: "Anthropic announces enhanced agent features for Claude",
        status: "selected",
        topicScore: 85,
        audienceFitScore: 90,
        timingScore: 80,
        contentPotentialScore: 85,
        whyItMatters: "Major platform update directly relevant to our audience",
        audienceMatch: "High — our audience actively uses Claude",
        possibleAngles: [
          "Hands-on review",
          "Comparison with previous version",
          "Tutorial for beginners",
        ],
        selectedAngle: "Hands-on review",
        primaryPlatform: "xiaohongshu",
        ownerId: members[0].id,
      },
      {
        brandId: brand.id,
        inputType: "idea",
        sourceType: "idea",
        title: "AI content workflow optimization",
        summary: "How we streamlined our content production with AI tools",
        status: "new",
        topicScore: 72,
        audienceFitScore: 75,
        timingScore: 70,
        contentPotentialScore: 70,
      },
      {
        brandId: brand.id,
        inputType: "url",
        sourceUrl: "https://example.com/ai-video-tool",
        sourceType: "community",
        title: "New AI video editing tool gaining traction",
        summary: "Community discussion about an emerging AI video editor",
        status: "reviewing",
        topicScore: 68,
        audienceFitScore: 65,
        timingScore: 75,
        contentPotentialScore: 65,
      },
      {
        brandId: brand.id,
        inputType: "url",
        sourceUrl: "https://example.com/gpt-5-rumor",
        sourceType: "news",
        title: "GPT-5 announcement expected next month",
        summary: "Industry speculation about upcoming GPT-5 release",
        status: "new",
        topicScore: 78,
        audienceFitScore: 85,
        timingScore: 60,
        contentPotentialScore: 90,
      },
      {
        brandId: brand.id,
        inputType: "idea",
        sourceType: "idea",
        title: "Behind the scenes: Our content creation process",
        summary: "Show the real workflow from idea to published content",
        status: "skipped",
        skipReason: "low_audience_fit",
        topicScore: 45,
      },
    ])
    .returning();
  signals.forEach((s) => console.log(`  ✓ [${s.status}] ${s.title}`));
  console.log();

  // ── Contents ───────────────────────────────────────────
  console.log("Creating contents...");
  const contents = await db
    .insert(schema.contents)
    .values([
      {
        brandId: brand.id,
        sourceSignalId: signals[0].id,
        pillarId: pillars[0].id,
        title: "Claude Agent 实测",
        status: "in_progress",
        ownerId: members[0].id,
        reviewerId: members[1].id,
        priority: "normal",
      },
      {
        brandId: brand.id,
        pillarId: pillars[1].id,
        title: "Top 5 AI Tools for Content Creators",
        status: "planning",
        ownerId: members[1].id,
        priority: "normal",
      },
      {
        brandId: brand.id,
        pillarId: pillars[2].id,
        title: "Our Content Workflow 2026",
        status: "planning",
        ownerId: members[0].id,
        priority: "normal",
      },
    ])
    .returning();
  contents.forEach((c) => console.log(`  ✓ [${c.status}] ${c.title}`));
  console.log();

  console.log("✅ Seed complete!\n");
  console.log("Created:");
  console.log(`  1 Brand`);
  console.log(`  3 Team Members`);
  console.log(`  3 Content Pillars`);
  console.log(`  3 Platform Playbooks`);
  console.log(`  5 Signals`);
  console.log(`  3 Contents`);
  console.log(`\nAll data marked as DEMO.`);
}

seed()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(() => {
    client.end();
  });
