import { NextRequest, NextResponse } from "next/server";

import {
  getLearningContext,
  createLearning,
} from "@/lib/learnings";
import { ReviewError } from "@/lib/review";
import { learningSaveSchema } from "@/lib/validation/learning";

/**
 * /api/tests/[id]/learning — M3.3.
 * GET: create-context (server evidence preview + defaults + saved
 * state) or the saved Learning. POST: Human Save — server derives
 * brand/platform/sourceTestId/evidenceSummary; duplicate → 409.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    return NextResponse.json(await getLearningContext(id));
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET learning context error:", error);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = learningSaveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid learning" }, { status: 400 });
    }
    const result = await createLearning(id, parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST learning error:", error);
    return NextResponse.json({ error: "Failed to save learning" }, { status: 500 });
  }
}
