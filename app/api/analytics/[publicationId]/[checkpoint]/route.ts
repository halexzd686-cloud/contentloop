import { NextRequest, NextResponse } from "next/server";

import { getAnalyticsDetail } from "@/lib/metrics/analytics";
import { ReviewError } from "@/lib/review";
import { isCheckpoint } from "@/lib/validation/snapshot";

/**
 * GET /api/analytics/[publicationId]/[checkpoint] — M2.5 detail.
 * Fact + active metrics + account/pillar baselines. Baseline failure
 * is returned as baselineError with the fact intact (separate failure
 * boundary).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ publicationId: string; checkpoint: string }> }
) {
  try {
    const { publicationId, checkpoint } = await params;
    if (!isCheckpoint(checkpoint)) {
      return NextResponse.json(
        { error: "Unsupported checkpoint (V1: 24h / 72h)" },
        { status: 400 }
      );
    }
    return NextResponse.json(await getAnalyticsDetail(publicationId, checkpoint));
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET analytics detail error:", error);
    return NextResponse.json(
      { error: "Failed to load analytics detail" },
      { status: 500 }
    );
  }
}
