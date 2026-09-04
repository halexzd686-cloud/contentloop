import { NextRequest, NextResponse } from "next/server";

import { archiveContent } from "@/lib/contents";
import { ReviewError } from "@/lib/review";

/**
 * POST /api/contents/[id]/archive — M4.1. Workflow cleanup only:
 * deletedAt=now. Children preserved. Published or publication-bearing
 * content can never be archived. Client never submits deletedAt.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    return NextResponse.json(await archiveContent(id));
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST archive error:", error);
    return NextResponse.json({ error: "Failed to archive" }, { status: 500 });
  }
}
