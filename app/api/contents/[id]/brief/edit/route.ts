import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { contents, contentBriefs } from "@/lib/db/schema";
import { requireSingleBrand } from "@/lib/brand";
import { globalUpstreamInvalidation, loadAggregate, toSnapshot } from "@/lib/review";

/**
 * POST /api/contents/[id]/brief/edit
 *
 * Explicit "Edit Brief" action on an approved brief:
 * - Brief: approved → draft, approval metadata cleared
 * - Content in_progress: stays in_progress (M1.3 behavior)
 * - Content review/scheduled: Global Upstream Invalidation (M1.6) —
 *   Content → in_progress, all active versions → draft, all
 *   checklists reset. Review authority never survives an upstream
 *   change. One transaction.
 *
 * This is the ONLY way an approved brief becomes editable;
 * ordinary auto-save cannot silently revert approval.
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
        return { error: "Content not found", status: 404 as const };
      }

      const [brief] = await tx
        .select()
        .from(contentBriefs)
        .where(eq(contentBriefs.contentId, id));

      if (!brief) {
        return { error: "No brief exists yet.", status: 400 as const };
      }

      if (brief.status !== "approved") {
        return {
          error: "Only an approved brief needs Edit Brief.",
          status: 400 as const,
        };
      }

      const [updated] = await tx
        .update(contentBriefs)
        .set({
          status: "draft",
          approvedAt: null,
          approvedBy: null,
          updatedAt: new Date(),
        })
        .where(eq(contentBriefs.id, brief.id))
        .returning();

      // M1.6: upstream change invalidates any downstream review authority.
      const invalidated = await globalUpstreamInvalidation(tx, content);

      // One aggregate read → authoritative workflow snapshot (no client refetch).
      const agg = await loadAggregate(tx, id, brand.id);

      return { brief: updated, workflow: toSnapshot(agg), invalidated };
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/contents/[id]/brief/edit error:", error);
    return NextResponse.json(
      { error: "Failed to reopen brief" },
      { status: 500 }
    );
  }
}

