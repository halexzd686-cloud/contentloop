import { NextRequest, NextResponse } from "next/server";

import { listTests, createTest } from "@/lib/tests";
import { ReviewError } from "@/lib/review";
import { createTestSchema } from "@/lib/validation/test";

/**
 * /api/tests — M3.1 Test Core.
 * GET: list. POST: Human-confirmed create (server owns status=running;
 * client never submits status/outcome/conclusion).
 */
export async function GET() {
  try {
    return NextResponse.json(await listTests());
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /api/tests error:", error);
    return NextResponse.json({ error: "Failed to load tests" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createTestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid test",
          details: parsed.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; ")
            .slice(0, 500),
        },
        { status: 400 }
      );
    }
    const result = await createTest(parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/tests error:", error);
    return NextResponse.json({ error: "Failed to create test" }, { status: 500 });
  }
}
