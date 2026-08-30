import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { signals } from "@/lib/db/schema";
import { requireSingleBrand } from "@/lib/brand";
import {
  updateSignalStatusSchema,
  skipSignalSchema,
} from "@/lib/validation/signal";

/**
 * PATCH /api/signals/[id] — Update signal status
 *
 * M1.1: new ↔ reviewing
 * M1.2A: skip with reason (status=skipped, skipReason required)
 *
 * selected requires Create Content flow (POST /api/signals/[id]/create-content).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // ── Skip flow ────────────────────────────────────────────
    if (body.status === "skipped") {
      const input = skipSignalSchema.parse(body);

      const brand = await requireSingleBrand();

      // Verify signal exists and belongs to brand
      const [existing] = await db
        .select()
        .from(signals)
        .where(
          and(
            eq(signals.id, id),
            eq(signals.brandId, brand.id),
            isNull(signals.deletedAt)
          )
        );

      if (!existing) {
        return NextResponse.json(
          { error: "Signal not found" },
          { status: 404 }
        );
      }

      if (existing.status === "selected") {
        return NextResponse.json(
          { error: "Cannot skip a selected signal" },
          { status: 400 }
        );
      }

      const [signal] = await db
        .update(signals)
        .set({
          status: "skipped",
          skipReason: input.skipReason,
          updatedAt: new Date(),
        })
        .where(eq(signals.id, id))
        .returning();

      return NextResponse.json({ signal });
    }

    // ── Simple status update (new ↔ reviewing) ───────────────
    const input = updateSignalStatusSchema.parse(body);

    const brand = await requireSingleBrand();

    const [existing] = await db
      .select()
      .from(signals)
      .where(
        and(
          eq(signals.id, id),
          eq(signals.brandId, brand.id),
          isNull(signals.deletedAt)
        )
      );

    if (!existing) {
      return NextResponse.json({ error: "Signal not found" }, { status: 404 });
    }

    if (existing.status === "selected" || existing.status === "skipped") {
      return NextResponse.json(
        {
          error: `Cannot change status from ${existing.status} to ${input.status}. Use the appropriate flow.`,
        },
        { status: 400 }
      );
    }

    const [signal] = await db
      .update(signals)
      .set({
        status: input.status,
        updatedAt: new Date(),
      })
      .where(eq(signals.id, id))
      .returning();

    return NextResponse.json({ signal });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request data", details: error.message },
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
