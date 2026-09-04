import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull, isNotNull, desc } from "drizzle-orm";

import { createManualContent } from "@/lib/contents";
import { ReviewError } from "@/lib/review";
import { manualCreateSchema } from "@/lib/validation/content";

import { db } from "@/lib/db";
import { contents, contentBriefs, teamMembers } from "@/lib/db/schema";
import { requireSingleBrand } from "@/lib/brand";

/**
 * GET /api/contents
 * Lightweight content list for the current Brand (Studio index).
 * Includes brief status so the list can show "Brief: draft/approved/none".
 */
export async function GET(request: NextRequest) {
  try {
    const brand = await requireSingleBrand();
    const archived =
      request.nextUrl.searchParams.get("archived") === "true";

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
        primaryPlatform: contents.primaryPlatform,
        isDemo: contents.isDemo,
        deletedAt: contents.deletedAt,
        updatedAt: contents.updatedAt,
      })
      .from(contents)
      .leftJoin(teamMembers, eq(contents.ownerId, teamMembers.id))
      .leftJoin(contentBriefs, eq(contentBriefs.contentId, contents.id))
      .where(
        and(
          eq(contents.brandId, brand.id),
          archived
            ? isNotNull(contents.deletedAt)
            : isNull(contents.deletedAt)
        )
      )
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

/**
 * POST /api/contents — M4.1 manual New Content.
 * Human fields only: title / primaryPlatform / pillarId? / ownerId.
 * Server owns brand, status=planning, sourceSignalId=null, isDemo=false.
 * No Brief / Master / PlatformVersion / fake Signal is created.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = manualCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid content" },
        { status: 400 }
      );
    }
    const result = await createManualContent(parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/contents error:", error);
    return NextResponse.json(
      { error: "Failed to create content" },
      { status: 500 }
    );
  }
}
