import { NextRequest, NextResponse } from "next/server";

import { generateDiagnosisProposal } from "@/lib/metrics/diagnosis";
import { ReviewError } from "@/lib/review";
import { isCheckpoint } from "@/lib/validation/snapshot";

/**
 * POST .../diagnosis/proposal — M2.6
 * AI structured diagnosis proposal. Zero DB writes — the proposal is
 * persisted only via an explicit human Save (POST/PUT diagnosis).
 */
export async function POST(
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
    const result = await generateDiagnosisProposal(publicationId, checkpoint);
    if (!result.ok) {
      return NextResponse.json(
        { error: `Diagnosis generation failed: ${result.error}` },
        { status: 502 }
      );
    }
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST diagnosis proposal error:", error);
    return NextResponse.json(
      { error: "Diagnosis generation failed" },
      { status: 500 }
    );
  }
}
