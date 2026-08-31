import { NextRequest, NextResponse } from "next/server";

import { approveForPublishing, ReviewError } from "@/lib/review";

/**
 * POST /api/contents/[id]/review/approve — Approve for Publishing (M1.6).
 * The ONLY path review → scheduled. Every active version must be
 * approved or review+complete-checklist; only review versions move to
 * approved. No Publication is created.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await approveForPublishing(id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/contents/[id]/review/approve error:", error);
    return NextResponse.json({ error: "Failed to approve for publishing" }, { status: 500 });
  }
}
