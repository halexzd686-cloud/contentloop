import { NextRequest, NextResponse } from "next/server";

import { transitionViaDrag, ReviewError } from "@/lib/review";
import { DRAG_TRANSITIONS } from "@/lib/validation/review";

const VALID_STATUSES = Object.keys(DRAG_TRANSITIONS);

/**
 * PATCH /api/contents/[id]/status — Pipeline drag thin entry (M1.6).
 *
 * This is NOT a generic status write. It only forwards to the domain
 * transition service, which enforces the frozen transition table:
 * protected transitions (review→scheduled, scheduled→*, any→published)
 * are always rejected here.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const to = body?.to;
    if (typeof to !== "string" || !VALID_STATUSES.includes(to)) {
      return NextResponse.json({ error: "Invalid target status" }, { status: 400 });
    }
    const result = await transitionViaDrag(id, to);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("PATCH /api/contents/[id]/status error:", error);
    return NextResponse.json({ error: "Failed to transition content" }, { status: 500 });
  }
}
