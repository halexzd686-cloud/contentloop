import { NextRequest, NextResponse } from "next/server";

import { createManualContent, listContents } from "@/lib/contents";
import { ReviewError } from "@/lib/review";
import { manualCreateSchema } from "@/lib/validation/content";

/**
 * GET /api/contents
 * Lightweight content list for the current Brand (Studio index).
 * Includes brief status so the list can show "Brief: draft/approved/none".
 * Query lives in lib/contents.listContents (shared with the M9
 * attention read model — one source, no drift).
 */
export async function GET(request: NextRequest) {
  try {
    const archived =
      request.nextUrl.searchParams.get("archived") === "true";
    const rows = await listContents(archived);
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
