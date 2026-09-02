import { NextRequest, NextResponse } from "next/server";

import { getTestResult, getConcludedResult } from "@/lib/tests-result";
import { requireSingleBrand } from "@/lib/brand";
import { db } from "@/lib/db";
import { tests } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { ReviewError } from "@/lib/review";

/**
 * GET /api/tests/[id]/result — M3.2.
 * running → runtime observed result + readiness + previewFingerprint.
 * concluded → frozen resultEvidence + derived resultStale (never
 * silently swaps in current runtime values).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const brand = await requireSingleBrand();
    const [test] = await db
      .select({ status: tests.status })
      .from(tests)
      .where(and(eq(tests.id, id), eq(tests.brandId, brand.id)));
    if (!test) throw new ReviewError("Test not found", 404);

    if (test.status === "concluded") {
      return NextResponse.json(await getConcludedResult(id));
    }
    return NextResponse.json(await getTestResult(id));
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET test result error:", error);
    return NextResponse.json({ error: "Failed to load result" }, { status: 500 });
  }
}
