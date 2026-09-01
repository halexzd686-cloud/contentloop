import { NextRequest, NextResponse } from "next/server";

import { createDerivedMetric } from "@/lib/metrics/definitions";
import { ReviewError } from "@/lib/review";
import { derivedCreateSchema } from "@/lib/validation/metric";

/**
 * POST /api/settings/metrics/derived — M2.2
 * Create a custom DERIVED metric (custom raw is not supported).
 * Machine key and canonical formula are server-generated.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = derivedCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid derived metric",
          details: parsed.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; ")
            .slice(0, 400),
        },
        { status: 400 }
      );
    }
    const result = await createDerivedMetric(parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/settings/metrics/derived error:", error);
    return NextResponse.json(
      { error: "Failed to create derived metric" },
      { status: 500 }
    );
  }
}
