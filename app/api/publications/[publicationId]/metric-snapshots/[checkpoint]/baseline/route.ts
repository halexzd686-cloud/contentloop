import { NextRequest, NextResponse } from "next/server";

import { getBaselineForSnapshot } from "@/lib/metrics/baseline-service";
import { ReviewError } from "@/lib/review";
import { isCheckpoint } from "@/lib/validation/snapshot";

/**
 * GET .../metric-snapshots/[checkpoint]/baseline — M2.4
 *
 * Runtime-computed Account + Pillar median baselines for the target
 * snapshot. Read-only: no writes, no persistence, no cache.
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
    const result = await getBaselineForSnapshot(publicationId, checkpoint);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET baseline error:", error);
    return NextResponse.json(
      { error: "Failed to compute baseline" },
      { status: 500 }
    );
  }
}
