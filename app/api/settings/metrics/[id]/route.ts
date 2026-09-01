import { NextRequest, NextResponse } from "next/server";

import { editMetric } from "@/lib/metrics/definitions";
import { ReviewError } from "@/lib/review";
import { metricEditSchema } from "@/lib/validation/metric";

/**
 * PUT /api/settings/metrics/[id] — M2.2
 * Edit allowed fields only (alias / meaning / caution / isActive;
 * derived pre-Snapshot also numeratorKey / denominatorKey / format).
 * key / platform / type / displayName are immutable. Server
 * regenerates canonical formula text on any formula-field change.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = metricEditSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid metric update" }, { status: 400 });
    }
    const result = await editMetric(id, parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("PUT /api/settings/metrics/[id] error:", error);
    return NextResponse.json({ error: "Failed to update metric" }, { status: 500 });
  }
}
