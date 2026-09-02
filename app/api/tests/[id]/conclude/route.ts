import { NextRequest, NextResponse } from "next/server";

import { concludeTest } from "@/lib/tests-result";
import { ReviewError } from "@/lib/review";
import { concludeTestSchema } from "@/lib/validation/test-result";

/**
 * POST /api/tests/[id]/conclude — M3.2. Human Complete.
 * Server rebuilds authoritative evidence, enforces preview freshness
 * and the readiness matrix, then freezes everything in ONE
 * transaction. Client submits only outcome + conclusion +
 * previewFingerprint.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = concludeTestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid conclusion payload" },
        { status: 400 }
      );
    }
    const result = await concludeTest(id, parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST conclude error:", error);
    return NextResponse.json({ error: "Failed to conclude test" }, { status: 500 });
  }
}
