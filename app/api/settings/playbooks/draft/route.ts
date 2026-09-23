import { NextRequest, NextResponse } from "next/server";
import { eq, and, or, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { learnings, platformPlaybooks } from "@/lib/db/schema";
import { requireSingleBrand } from "@/lib/brand";
import { isPlatform } from "@/lib/validation/platform-version";
import { draftPlaybook } from "@/lib/ai/draft-playbook";
import { createDeepSeekProvider, AIProviderError } from "@/lib/ai/provider";
import { aiUserMessage } from "@/lib/ai/user-error";

/**
 * AI request budgets run up to the 60s provider timeout. Declare the
 * matching route ceiling so hosts (e.g. Vercel) don't cut earlier.
 */
export const maxDuration = 60;

/**
 * POST /api/settings/playbooks/draft
 *
 * AI Playbook Draft (PRD §15.4, AGENTS §21): returns a PROPOSAL only —
 * never writes to the database. The draft fills the human edit form;
 * persistence happens exclusively via PUT /api/settings/playbooks.
 */
export async function POST(request: NextRequest) {
  try {
    const brand = await requireSingleBrand();
    const body = await request.json().catch(() => null);
    const platform = typeof body?.platform === "string" ? body.platform : null;
    if (!platform || !isPlatform(platform)) {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    }

    const [[current], platformLearnings] = await Promise.all([
      db
        .select({
          voice: platformPlaybooks.voice,
          titleStyle: platformPlaybooks.titleStyle,
          hookStyle: platformPlaybooks.hookStyle,
          structure: platformPlaybooks.structure,
          cta: platformPlaybooks.cta,
          avoid: platformPlaybooks.avoid,
          goodExamples: platformPlaybooks.goodExamples,
        })
        .from(platformPlaybooks)
        .where(
          and(
            eq(platformPlaybooks.brandId, brand.id),
            eq(platformPlaybooks.platform, platform)
          )
        ),
      db
        .select({ text: learnings.text })
        .from(learnings)
        .where(
          and(
            eq(learnings.brandId, brand.id),
            or(eq(learnings.platform, platform), isNull(learnings.platform))
          )
        ),
    ]);

    const result = await draftPlaybook(
      {
        platform,
        current: current ?? null,
        learnings: platformLearnings.map((l) => l.text),
      },
      createDeepSeekProvider()
    );
    if (!result.ok) {
      console.error("playbook draft failed:", result.error);
      return NextResponse.json(
        { error: aiUserMessage(result.error) },
        { status: 502 }
      );
    }
    return NextResponse.json({ draft: result.draft });
  } catch (error) {
    if (error instanceof AIProviderError) {
      // kind + technical message stay server-side; client gets sanitized copy.
      console.error("playbook draft provider error:", error.kind, error.message);
      return NextResponse.json(
        { error: aiUserMessage(error.message) },
        { status: 502 }
      );
    }
    console.error("POST playbooks/draft error:", error);
    return NextResponse.json(
      { error: "Failed to draft playbook" },
      { status: 500 }
    );
  }
}
