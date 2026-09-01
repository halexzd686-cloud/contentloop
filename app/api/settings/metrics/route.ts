import { NextResponse } from "next/server";

import { listMetrics } from "@/lib/metrics/definitions";
import { ReviewError } from "@/lib/review";

/**
 * GET /api/settings/metrics — M2.2
 * All metric definitions for the current Brand (UI groups by platform).
 */
export async function GET() {
  try {
    return NextResponse.json(await listMetrics());
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /api/settings/metrics error:", error);
    return NextResponse.json({ error: "Failed to load metrics" }, { status: 500 });
  }
}
