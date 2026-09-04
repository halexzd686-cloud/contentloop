import { NextRequest, NextResponse } from "next/server";

import { setPrimaryPlatform } from "@/lib/contents";
import { ReviewError } from "@/lib/review";
import { setPrimaryPlatformSchema } from "@/lib/validation/content";

/**
 * POST /api/contents/[id]/primary-platform — M4.1 legacy null→value
 * correction. value→different, published and archived are rejected.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = setPrimaryPlatformSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    }
    return NextResponse.json(await setPrimaryPlatform(id, parsed.data.primaryPlatform));
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST primary-platform error:", error);
    return NextResponse.json({ error: "Failed to set platform" }, { status: 500 });
  }
}
