import { NextRequest, NextResponse } from "next/server";

import { patchLearning } from "@/lib/learnings";
import { ReviewError } from "@/lib/review";
import { learningPatchSchema } from "@/lib/validation/learning";

/**
 * PATCH /api/learnings/[id] — M3.3 wording/scope correction only
 * (text, pillarId). platform / sourceTestId / evidenceSummary are
 * immutable; evidenceSummary is never rewritten by edits.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = learningPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid learning update" }, { status: 400 });
    }
    return NextResponse.json(await patchLearning(id, parsed.data));
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("PATCH learning error:", error);
    return NextResponse.json({ error: "Failed to update learning" }, { status: 500 });
  }
}
