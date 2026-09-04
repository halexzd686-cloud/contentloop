import { NextRequest, NextResponse } from "next/server";

import { getTest, patchTest, discardTest } from "@/lib/tests";
import { ReviewError } from "@/lib/review";
import { patchTestSchema } from "@/lib/validation/test";

/**
 * /api/tests/[id] — M3.1. GET detail; PATCH descriptive fields only
 * (title / keepConsistent / compareWith), running tests only. Core
 * definition fields are immutable — rejected by the strict schema.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    return NextResponse.json(await getTest(id));
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /api/tests/[id] error:", error);
    return NextResponse.json({ error: "Failed to load test" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = patchTestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Only title / keepConsistent / compareWith may be edited." },
        { status: 400 }
      );
    }
    return NextResponse.json(await patchTest(id, parsed.data));
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("PATCH /api/tests/[id] error:", error);
    return NextResponse.json({ error: "Failed to update test" }, { status: 500 });
  }
}

/**
 * DELETE /api/tests/[id] — Discard Test (M4.1). Running tests only;
 * concluded → 409. Removes the test and its membership links in one
 * transaction; publications and metric data are never touched.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    return NextResponse.json(await discardTest(id));
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("DELETE /api/tests/[id] error:", error);
    return NextResponse.json({ error: "Failed to discard test" }, { status: 500 });
  }
}
