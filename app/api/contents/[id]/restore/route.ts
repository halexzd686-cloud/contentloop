import { NextRequest, NextResponse } from "next/server";

import { restoreContent } from "@/lib/contents";
import { ReviewError } from "@/lib/review";

/**
 * POST /api/contents/[id]/restore — M4.1. deletedAt=null, same
 * authoritative row with all children preserved.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    return NextResponse.json(await restoreContent(id));
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST restore error:", error);
    return NextResponse.json({ error: "Failed to restore" }, { status: 500 });
  }
}
