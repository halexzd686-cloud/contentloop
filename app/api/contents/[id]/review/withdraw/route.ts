import { NextRequest, NextResponse } from "next/server";

import { withdrawFromReview, ReviewError } from "@/lib/review";

/**
 * POST /api/contents/[id]/review/withdraw — Withdraw (M1.6).
 * review → in_progress; versions review|approved → draft; all
 * checklists reset (rows kept). The previous review round is no
 * longer authoritative. One transaction.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await withdrawFromReview(id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/contents/[id]/review/withdraw error:", error);
    return NextResponse.json({ error: "Failed to withdraw from review" }, { status: 500 });
  }
}
