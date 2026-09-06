import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { tests } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireSingleBrand } from "@/lib/brand";
import { ReviewError } from "@/lib/review";
import { draftLearning } from "@/lib/ai/draft-learning";
import { createDeepSeekProvider } from "@/lib/ai/provider";
import { aiUserMessage } from "@/lib/ai/user-error";

/**
 * POST /api/tests/[id]/learning/draft — M3.3 AI draft (wording only).
 * Zero DB writes. concluded only; frozen evidence only; max 1 model
 * request.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const brand = await requireSingleBrand();
    const [test] = await db
      .select()
      .from(tests)
      .where(and(eq(tests.id, id), eq(tests.brandId, brand.id)));
    if (!test) throw new ReviewError("Test not found", 404);
    if (test.status !== "concluded") {
      throw new ReviewError(
        "Learning drafts require a concluded test.",
        409
      );
    }

    const result = await draftLearning(
      {
        test: {
          title: test.title,
          hypothesis: test.hypothesis,
          change: test.change,
          method: test.method,
          platform: test.platform,
          checkpoint: test.checkpoint,
          primaryMetricKey: test.primaryMetricKey,
          keepConsistent: test.keepConsistent,
          compareWith: test.compareWith,
          outcome: test.outcome ?? "no_clear_result",
          conclusion: test.conclusion ?? "",
          resultEvidence: (test.resultEvidence ?? {}) as never,
        },
      },
      createDeepSeekProvider()
    );

    if (!result.ok) {
      console.error("learning draft failed:", result.error);
      return NextResponse.json(
        { error: aiUserMessage(result.error) },
        { status: 502 }
      );
    }
    return NextResponse.json({ draft: result.draft });
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST learning draft error:", error);
    return NextResponse.json({ error: "Draft failed" }, { status: 500 });
  }
}
