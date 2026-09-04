import { NextResponse } from "next/server";

import { listLearnings } from "@/lib/learnings";
import { ReviewError } from "@/lib/review";

/**
 * /api/learnings — M3.3 read list (lightweight; no resultEvidence).
 */
export async function GET() {
  try {
    return NextResponse.json(await listLearnings());
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /api/learnings error:", error);
    return NextResponse.json({ error: "Failed to load learnings" }, { status: 500 });
  }
}
