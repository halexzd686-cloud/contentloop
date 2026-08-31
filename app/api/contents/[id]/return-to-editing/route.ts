import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { contents } from "@/lib/db/schema";
import { requireSingleBrand } from "@/lib/brand";
import { globalUpstreamInvalidation, loadAggregate, toSnapshot, ReviewError } from "@/lib/review";

/**
 * POST /api/contents/[id]/return-to-editing — M1.6
 *
 * Explicit Human Action on the Master while the content is in
 * review/scheduled. Runs Global Upstream Invalidation:
 * Content → in_progress, all active versions → draft, all checklists
 * reset. User content is never touched — only review authority.
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
      if (!content) throw new ReviewError("Content not found", 404);
      if (content.status !== "review" && content.status !== "scheduled") {
        throw new ReviewError(
          "Return to Editing only applies while the content is in review or scheduled.",
          409
        );
      }
      await globalUpstreamInvalidation(tx, content);
      const agg = await loadAggregate(tx, id, brand.id);
      return { workflow: toSnapshot(agg) };
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/contents/[id]/return-to-editing error:", error);
    return NextResponse.json({ error: "Failed to return to editing" }, { status: 500 });
  }
}
