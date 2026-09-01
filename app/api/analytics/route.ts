import { NextResponse } from "next/server";

import { getAnalyticsIndex } from "@/lib/metrics/analytics";
import { ReviewError } from "@/lib/review";

/**
 * GET /api/analytics — M2.5 index read model.
 * Published publications + checkpoint availability only.
 * No baseline math, no aggregates, no N+1.
 */
export async function GET() {
  try {
    return NextResponse.json(await getAnalyticsIndex());
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /api/analytics error:", error);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
