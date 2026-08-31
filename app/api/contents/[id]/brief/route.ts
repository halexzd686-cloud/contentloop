import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { contents, contentBriefs } from "@/lib/db/schema";
import { requireSingleBrand } from "@/lib/brand";
import { briefSaveSchema } from "@/lib/validation/brief";

/**
 * PUT /api/contents/[id]/brief
 *
 * Human draft persistence (manual Save / Auto Save).
 * - Incomplete drafts allowed (empty strings OK)
 * - First save creates the row (status=draft); later saves UPDATE
 * - An approved brief is read-only: it must be explicitly returned to
 *   draft via POST .../brief/edit before saving again
 * - UNIQUE(content_briefs.content_id) is the final concurrency guard
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const input = briefSaveSchema.parse(body);

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

    const [existing] = await db
      .select()
      .from(contentBriefs)
      .where(eq(contentBriefs.contentId, id));

    if (existing?.status === "approved") {
      return NextResponse.json(
        {
          error:
            "This brief is approved and read-only. Use Edit Brief to make changes (approval will be required again).",
        },
        { status: 409 }
      );
    }

    const [brief] = existing
      ? await db
          .update(contentBriefs)
          .set({ ...input, updatedAt: new Date() })
          .where(eq(contentBriefs.contentId, id))
          .returning()
      : await db
          .insert(contentBriefs)
          .values({ contentId: id, ...input })
          .returning();

    return NextResponse.json({ brief });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid brief data", details: error.message },
        { status: 400 }
      );
    }
    console.error("PUT /api/contents/[id]/brief error:", error);
    return NextResponse.json(
      { error: "Failed to save brief" },
      { status: 500 }
    );
  }
}
