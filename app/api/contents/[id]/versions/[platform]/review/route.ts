import { NextRequest, NextResponse } from "next/server";

import { saveChecklist, ReviewError } from "@/lib/review";
import { isPlatform } from "@/lib/validation/platform-version";
import { reviewChecklistSchema } from "@/lib/validation/review";

/**
 * PUT /api/contents/[id]/versions/[platform]/review — checklist save.
 * Human-only, partial allowed. Only while the version is in review.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; platform: string }> }
) {
  try {
    const { id, platform } = await params;
    if (!isPlatform(platform)) {
      return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });
    }
    const body = await request.json();
    const parsed = reviewChecklistSchema.safeParse(body.checklist ?? body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid checklist" }, { status: 400 });
    }
    const result = await saveChecklist(id, platform, parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("PUT /api/contents/[id]/versions/[platform]/review error:", error);
    return NextResponse.json({ error: "Failed to save checklist" }, { status: 500 });
  }
}
