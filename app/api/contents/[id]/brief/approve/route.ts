import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { contents, contentBriefs, teamMembers } from "@/lib/db/schema";
import { requireSingleBrand } from "@/lib/brand";
import { briefApproveSchema } from "@/lib/validation/brief";
import { resolveApprover } from "@/lib/brief";

/**
 * POST /api/contents/[id]/brief/approve
 *
 * Human approval gate. In one transaction:
 * 1. Load Content + Brief (brand-scoped)
 * 2. Brief must exist and be draft
 * 3. All 8 fields must be non-empty after trim (briefApproveSchema)
 * 4. Resolve approver: reviewer (active) → owner (active) → reject
 * 5. Brief → approved (approvedAt + approvedBy)
 * 6. Content planning → in_progress (never regresses a later status)
 *
 * An incomplete draft can be saved, but cannot be approved.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const brand = await requireSingleBrand();

    const result = await db.transaction(async (tx) => {
      const [content] = await tx
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
        throw new BriefError("Content not found", 404);
      }

      const [brief] = await tx
        .select()
        .from(contentBriefs)
        .where(eq(contentBriefs.contentId, id));

      if (!brief) {
        throw new BriefError("No brief exists yet. Save a draft first.", 400);
      }

      if (brief.status === "approved") {
        throw new BriefError("This brief is already approved.", 409);
      }

      // Approval gate: all 8 fields non-empty after trim
      const parsed = briefApproveSchema.safeParse({
        targetAudience: brief.targetAudience,
        userProblem: brief.userProblem,
        coreQuestion: brief.coreQuestion,
        mainAngle: brief.mainAngle,
        contentPromise: brief.contentPromise,
        keyEvidence: brief.keyEvidence,
        differentiation: brief.differentiation,
        cta: brief.cta,
      });

      if (!parsed.success) {
        const missing = parsed.error.issues
          .map((i) => i.path.join("."))
          .join(", ");
        throw new BriefError(
          `Brief is incomplete. Required fields empty: ${missing}`,
          400
        );
      }

      // Approver: designated reviewer → owner → reject
      const [reviewer] = content.reviewerId
        ? await tx
            .select({ id: teamMembers.id, isActive: teamMembers.isActive })
            .from(teamMembers)
            .where(
              and(
                eq(teamMembers.id, content.reviewerId),
                eq(teamMembers.brandId, brand.id)
              )
            )
        : [null];

      const [owner] = content.ownerId
        ? await tx
            .select({ id: teamMembers.id, isActive: teamMembers.isActive })
            .from(teamMembers)
            .where(
              and(
                eq(teamMembers.id, content.ownerId),
                eq(teamMembers.brandId, brand.id)
              )
            )
        : [null];

      const approver = resolveApprover(reviewer ?? null, owner ?? null);

      if (!approver) {
        throw new BriefError(
          "No valid approver: this content has neither an active reviewer nor an active owner.",
          400
        );
      }

      const [approvedBrief] = await tx
        .update(contentBriefs)
        .set({
          status: "approved",
          approvedAt: new Date(),
          approvedBy: approver.id,
          updatedAt: new Date(),
        })
        .where(eq(contentBriefs.id, brief.id))
        .returning();

      // Brief approved → production starts (never regress a later status)
      let updatedContent = content;
      if (content.status === "planning") {
        [updatedContent] = await tx
          .update(contents)
          .set({ status: "in_progress", updatedAt: new Date() })
          .where(eq(contents.id, id))
          .returning();
      }

      return { brief: approvedBrief, content: updatedContent };
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof BriefError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("POST /api/contents/[id]/brief/approve error:", error);
    return NextResponse.json(
      { error: "Failed to approve brief" },
      { status: 500 }
    );
  }
}

class BriefError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "BriefError";
  }
}
