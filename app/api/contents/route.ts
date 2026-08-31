import { NextResponse } from "next/server";
import { eq, and, isNull, desc } from "drizzle-orm";

import { db } from "@/lib/db";
import { contents, contentBriefs, teamMembers } from "@/lib/db/schema";
import { requireSingleBrand } from "@/lib/brand";

/**
 * GET /api/contents
 * Lightweight content list for the current Brand (Studio index).
 * Includes brief status so the list can show "Brief: draft/approved/none".
 */
export async function GET() {
  try {
    const brand = await requireSingleBrand();

    const rows = await db
      .select({
        id: contents.id,
        title: contents.title,
        status: contents.status,
        priority: contents.priority,
        ownerId: contents.ownerId,
        ownerName: teamMembers.name,
        briefStatus: contentBriefs.status,
        sourceSignalId: contents.sourceSignalId,
        updatedAt: contents.updatedAt,
      })
      .from(contents)
      .leftJoin(teamMembers, eq(contents.ownerId, teamMembers.id))
      .leftJoin(contentBriefs, eq(contentBriefs.contentId, contents.id))
      .where(and(eq(contents.brandId, brand.id), isNull(contents.deletedAt)))
      .orderBy(desc(contents.updatedAt));

    return NextResponse.json({ contents: rows });
  } catch (error) {
    console.error("GET /api/contents error:", error);
    return NextResponse.json(
      { error: "Failed to load contents" },
      { status: 500 }
    );
  }
}
