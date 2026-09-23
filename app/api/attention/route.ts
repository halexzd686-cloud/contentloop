import { NextResponse } from "next/server";

import { listContents } from "@/lib/contents";
import { getAnalyticsIndex } from "@/lib/metrics/analytics";
import { listTests } from "@/lib/tests";
import { buildAttentionModel } from "@/lib/attention";
import { ReviewError } from "@/lib/review";

/**
 * GET /api/attention — M9 小环 attention read model.
 *
 * Reads the same authoritative sources as Home (listContents /
 * getAnalyticsIndex / listTests) and aggregates through
 * buildAttentionModel → buildHomeModel: demo exclusion (isDemo only)
 * and checkpointStatus-derived due semantics are never re-implemented
 * here. Compact response for the sidebar pet; no polling contract.
 */
export async function GET() {
  try {
    const [contentRows, analytics, testRows] = await Promise.all([
      listContents(false),
      getAnalyticsIndex(),
      listTests(),
    ]);
    return NextResponse.json(
      buildAttentionModel({
        contents: contentRows.map((c) => ({
          id: c.id,
          title: c.title,
          status: c.status,
          isDemo: c.isDemo,
          updatedAt: c.updatedAt.toISOString(),
        })),
        publications: analytics.publications,
        tests: testRows.tests.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          createdAt: t.createdAt.toISOString(),
        })),
      })
    );
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /api/attention error:", error);
    return NextResponse.json({ error: "Failed to load attention" }, { status: 500 });
  }
}
