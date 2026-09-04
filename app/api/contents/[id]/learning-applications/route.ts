import { NextRequest, NextResponse } from "next/server";

import {
  getApplicationsForContent,
  applyAction,
} from "@/lib/learning-applications";
import { ReviewError } from "@/lib/review";
import { applyActionSchema } from "@/lib/validation/learning-application";

/**
 * /api/contents/[contentId]/learning-applications — M3.4.
 * GET: applied[] / dismissed[] / available[] (server-owned read model
 * including evidenceSummary). POST: create a relation (action).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contentId } = await params;
    return NextResponse.json(await getApplicationsForContent(contentId));
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET learning-applications error:", error);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contentId } = await params;
    const body = await request.json();
    const parsed = applyActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    const result = await applyAction(contentId, parsed.data.learningId, parsed.data.action);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST learning-applications error:", error);
    return NextResponse.json({ error: "Failed to apply" }, { status: 500 });
  }
}
