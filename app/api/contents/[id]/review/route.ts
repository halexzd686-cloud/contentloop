import { NextRequest, NextResponse } from "next/server";

import { sendToReview, ReviewError } from "@/lib/review";

/**
 * POST /api/contents/[id]/review — Send to Review (M1.6).
 * in_progress → review with full entry gate; all active draft
 * versions move to review with emptied checklists. One transaction.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await sendToReview(id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/contents/[id]/review error:", error);
    return NextResponse.json({ error: "Failed to send to review" }, { status: 500 });
  }
}
