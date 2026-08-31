import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { contents, contentBriefs, signals, teamMembers } from "@/lib/db/schema";
import { requireSingleBrand } from "@/lib/brand";

/**
 * GET /api/contents/[id]
 * Studio detail: Content + owner/reviewer + linked Signal context + Brief.
 */
export async function GET(
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

    const [owner] = content.ownerId
      ? await db
          .select({ id: teamMembers.id, name: teamMembers.name })
          .from(teamMembers)
          .where(eq(teamMembers.id, content.ownerId))
      : [null];

    const [reviewer] = content.reviewerId
      ? await db
          .select({ id: teamMembers.id, name: teamMembers.name })
          .from(teamMembers)
          .where(eq(teamMembers.id, content.reviewerId))
      : [null];

    // Linked signal: decision context + analysis (Signal != Content)
    const [signal] = content.sourceSignalId
      ? await db
          .select({
            id: signals.id,
            title: signals.title,
            summary: signals.summary,
            sourceType: signals.sourceType,
            sourceUrl: signals.sourceUrl,
            status: signals.status,
            selectedAngle: signals.selectedAngle,
            primaryPlatform: signals.primaryPlatform,
            topicScore: signals.topicScore,
            whyItMatters: signals.whyItMatters,
            audienceMatch: signals.audienceMatch,
            contentRisk: signals.contentRisk,
            possibleAngles: signals.possibleAngles,
            analysisEvidence: signals.analysisEvidence,
            analysisConfidence: signals.analysisConfidence,
            analyzedAt: signals.analyzedAt,
          })
          .from(signals)
          .where(eq(signals.id, content.sourceSignalId))
      : [null];

    const [brief] = await db
      .select()
      .from(contentBriefs)
      .where(eq(contentBriefs.contentId, id));

    return NextResponse.json({
      content: { ...content, owner, reviewer },
      signal: signal ?? null,
      brief: brief ?? null,
    });
  } catch (error) {
    console.error("GET /api/contents/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to load content" },
      { status: 500 }
    );
  }
}
