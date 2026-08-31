import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { contents, contentBriefs } from "@/lib/db/schema";
import { requireSingleBrand } from "@/lib/brand";

/**
 * POST /api/contents/[id]/brief/edit
 *
 * Explicit "Edit Brief" action on an approved brief:
 * - Brief: approved → draft, approval metadata cleared
 * - Content: stays in_progress (no implicit status regression)
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

    const [content] = await db
      .select({ id: contents.id })
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

    const [brief] = await db
      .select()
      .from(contentBriefs)
      .where(eq(contentBriefs.contentId, id));

    if (!brief) {
      return NextResponse.json({ error: "No brief exists yet." }, { status: 400 });
    }

    if (brief.status !== "approved") {
      return NextResponse.json(
        { error: "Only an approved brief needs Edit Brief." },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(contentBriefs)
      .set({
        status: "draft",
        approvedAt: null,
        approvedBy: null,
        updatedAt: new Date(),
      })
      .where(eq(contentBriefs.id, brief.id))
      .returning();

    return NextResponse.json({ brief: updated });
  } catch (error) {
    console.error("POST /api/contents/[id]/brief/edit error:", error);
    return NextResponse.json(
      { error: "Failed to reopen brief" },
      { status: 500 }
    );
  }
}
