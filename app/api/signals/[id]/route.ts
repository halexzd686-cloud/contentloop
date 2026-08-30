import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { signals } from "@/lib/db/schema";
import { updateSignalStatusSchema } from "@/lib/validation/signal";

/**
 * PATCH /api/signals/[id] — Update signal status
 * Body: { status: "new" | "reviewing" }
 *
 * M1.1 only allows new ↔ reviewing.
 * selected / skipped require their own business flows (M1.2).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const input = updateSignalStatusSchema.parse(body);

    const [signal] = await db
      .update(signals)
      .set({
        status: input.status,
        updatedAt: new Date(),
      })
      .where(eq(signals.id, id))
      .returning();

    if (!signal) {
      return NextResponse.json({ error: "Signal not found" }, { status: 404 });
    }

    return NextResponse.json({ signal });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid status. Allowed: new, reviewing" },
        { status: 400 }
      );
    }
    console.error("PATCH /api/signals/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update signal" },
      { status: 500 }
    );
  }
}
