import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  contents,
  signals,
  contentPillars,
  platformPlaybooks,
  teamMembers,
} from "@/lib/db/schema";
import { requireSingleBrand } from "@/lib/brand";
import { createDeepSeekProvider } from "@/lib/ai/provider";
import { draftBrief } from "@/lib/ai/draft-brief";
import { aiUserMessage } from "@/lib/ai/user-error";

/**
 * POST /api/contents/[id]/brief/draft
 *
 * AI Draft Brief (M1.3): returns a PROPOSAL only — never writes to the
 * database. The human must explicitly Apply the draft before any
 * persistence can occur (Suggest → Human Confirm).
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const brand = await requireSingleBrand();

    const [content] = await db
      .select()
      .from(contents)
      .where(
        and(
          eq(contents.id, id),
          eq(contents.brandId, brand.id),
          isNull(contents.deletedAt)
        )
      );

    if (!content) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    // Linked signal context (Signal != Content)
    const [signal] = content.sourceSignalId
      ? await db.select().from(signals).where(eq(signals.id, content.sourceSignalId))
      : [null];

    const [owner] = content.ownerId
      ? await db
          .select({ name: teamMembers.name })
          .from(teamMembers)
          .where(eq(teamMembers.id, content.ownerId))
      : [null];

    const [reviewer] = content.reviewerId
      ? await db
          .select({ name: teamMembers.name })
          .from(teamMembers)
          .where(eq(teamMembers.id, content.reviewerId))
      : [null];

    const pillars = await db
      .select({
        name: contentPillars.name,
        description: contentPillars.description,
        primaryGoal: contentPillars.primaryGoal,
      })
      .from(contentPillars)
      .where(
        and(
          eq(contentPillars.brandId, brand.id),
          eq(contentPillars.isActive, true)
        )
      );

    // Playbook for the signal's primary platform (strategy context only)
    const [playbook] = signal?.primaryPlatform
      ? await db
          .select({
            voice: platformPlaybooks.voice,
            titleStyle: platformPlaybooks.titleStyle,
            hookStyle: platformPlaybooks.hookStyle,
            structure: platformPlaybooks.structure,
            cta: platformPlaybooks.cta,
            avoid: platformPlaybooks.avoid,
          })
          .from(platformPlaybooks)
          .where(
            and(
              eq(platformPlaybooks.brandId, brand.id),
              eq(platformPlaybooks.platform, signal.primaryPlatform)
            )
          )
      : [null];

    let provider;
    try {
      provider = createDeepSeekProvider();
    } catch (err) {
      console.error("brief draft provider init failed:", err);
      return NextResponse.json(
        {
          error: aiUserMessage(
            err instanceof Error ? err.message : "AI not configured"
          ),
        },
        { status: 503 }
      );
    }

    const result = await draftBrief(
      {
        content: {
          title: content.title,
          status: content.status,
          ownerName: owner?.name ?? null,
          reviewerName: reviewer?.name ?? null,
        },
        signal: signal
          ? {
              title: signal.title,
              summary: signal.summary,
              sourceType: signal.sourceType,
              sourceUrl: signal.sourceUrl,
              selectedAngle: signal.selectedAngle,
              primaryPlatform: signal.primaryPlatform,
              whyItMatters: signal.whyItMatters,
              audienceMatch: signal.audienceMatch,
              contentRisk: signal.contentRisk,
              possibleAngles: signal.possibleAngles,
              topicScore: signal.topicScore,
              evidence: signal.analysisEvidence,
            }
          : null,
        brandTargetAudience: brand.targetAudience,
        brandEnabledPlatforms: brand.enabledPlatforms,
        pillars,
        playbook: playbook ?? null,
      },
      provider
    );

    if (!result.ok) {
      console.error("brief draft failed:", result.error);
      return NextResponse.json(
        { error: aiUserMessage(result.error) },
        { status: 502 }
      );
    }

    // Proposal only — no DB write here.
    return NextResponse.json({ draft: result.draft });
  } catch (error) {
    console.error("POST /api/contents/[id]/brief/draft error:", error);
    return NextResponse.json(
      { error: "Failed to generate brief draft" },
      { status: 500 }
    );
  }
}
