import { NextRequest, NextResponse } from "next/server";

import { attachPublication, detachPublication } from "@/lib/tests";
import { ReviewError } from "@/lib/review";
import { attachPublicationSchema } from "@/lib/validation/test";

/**
 * /api/tests/[id]/publications — M3.1 membership. POST attach
 * (running only; brand+platform+publication validated server-side).
 * DELETE .../publications/[publicationId] detach (running only).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = attachPublicationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid attachment" }, { status: 400 });
    }
    const result = await attachPublication(id, parsed.data.publicationId, parsed.data.role);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST attach error:", error);
    return NextResponse.json({ error: "Failed to attach" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const publicationId = new URL(request.url).searchParams.get("publicationId");
    if (!publicationId) {
      return NextResponse.json({ error: "Missing publicationId" }, { status: 400 });
    }
    return NextResponse.json(await detachPublication(id, publicationId));
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("DELETE detach error:", error);
    return NextResponse.json({ error: "Failed to detach" }, { status: 500 });
  }
}
