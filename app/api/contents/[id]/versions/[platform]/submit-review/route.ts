import { NextRequest, NextResponse } from "next/server";

import { submitVersionToReview, ReviewError } from "@/lib/review";
import { isPlatform } from "@/lib/validation/platform-version";

/**
 * POST /api/contents/[id]/versions/[platform]/submit-review
 * Re-submit a locally re-edited version: draft → review with an
 * emptied checklist. Only while the content is in review/scheduled.
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
    const result = await submitVersionToReview(id, platform);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST submit-review error:", error);
    return NextResponse.json({ error: "Failed to submit version to review" }, { status: 500 });
  }
}
