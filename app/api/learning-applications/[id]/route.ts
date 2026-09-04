import { NextRequest, NextResponse } from "next/server";

import { transitionAction } from "@/lib/learning-applications";
import { ReviewError } from "@/lib/review";
import { transitionActionSchema } from "@/lib/validation/learning-application";

/**
 * PATCH /api/learning-applications/[id] — M3.4 action transition.
 * applied→dismissed: allowed on any non-published content.
 * dismissed→applied: must re-pass current eligibility.
 * published: 409. Same action: 409 (no fake timestamp churn).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = transitionActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    return NextResponse.json(await transitionAction(id, parsed.data.action));
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("PATCH learning-applications error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
