import { NextRequest, NextResponse } from "next/server";

import { returnVersionToDraft, ReviewError } from "@/lib/review";
import { isPlatform } from "@/lib/validation/platform-version";

/**
 * POST /api/contents/[id]/versions/[platform]/return-to-draft
 * Single-platform re-edit: only this version is invalidated
 * (review|approved → draft, its checklist reset). Other platforms
 * keep their state. scheduled Content drops to review.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; platform: string }> }
) {
  try {
    const { id, platform } = await params;
    if (!isPlatform(platform)) {
      return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });
    }
    const result = await returnVersionToDraft(id, platform);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST return-to-draft error:", error);
    return NextResponse.json({ error: "Failed to return version to draft" }, { status: 500 });
  }
}
