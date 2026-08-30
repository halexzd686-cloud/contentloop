import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { signals, contents, teamMembers } from "@/lib/db/schema";
import { requireSingleBrand } from "@/lib/brand";
import { createContentFromSignalSchema } from "@/lib/validation/signal";

/**
 * POST /api/signals/[id]/create-content
 *
 * Atomically:
 * 1. Validates input (Zod, outside transaction)
 * 2. In transaction:
 *    a. Verify signal exists, belongs to brand, status is new/reviewing
 *    b. Verify no existing content for this signal
 *    c. Verify owner exists, belongs to brand, isActive
 *    d. Update signal → selected + angle/platform/owner
 *    e. Insert content → planning
 * 3. Returns { signal, content }
 *
 * Unique constraint on contents.source_signal_id is the final
 * concurrency guard.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: signalId } = await params;
    const body = await request.json();

    // Zod validation outside transaction
    const input = createContentFromSignalSchema.parse(body);

    const brand = await requireSingleBrand();

    // Run in transaction
    const result = await db.transaction(async (tx) => {
      // a. Verify signal exists, belongs to brand, status is new/reviewing
      const [signal] = await tx
        .select()
        .from(signals)
        .where(
          and(
            eq(signals.id, signalId),
            eq(signals.brandId, brand.id),
            isNull(signals.deletedAt)
          )
        );

      if (!signal) {
        throw new SignalError("Signal not found", 404);
      }

      if (signal.status !== "new" && signal.status !== "reviewing") {
        throw new SignalError(
          `Cannot create content from signal with status "${signal.status}". Only new or reviewing signals can be selected.`,
          400
        );
      }

      // b. Verify no existing content for this signal
      const [existingContent] = await tx
        .select({ id: contents.id })
        .from(contents)
        .where(eq(contents.sourceSignalId, signalId));

      if (existingContent) {
        throw new SignalError(
          "This signal already has a linked content.",
          409
        );
      }

      // c. Verify owner exists, belongs to brand, isActive
      const [owner] = await tx
        .select()
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.id, input.ownerId),
            eq(teamMembers.brandId, brand.id),
            eq(teamMembers.isActive, true)
          )
        );

      if (!owner) {
        throw new SignalError(
          "Owner not found or is inactive.",
          400
        );
      }

      // d. Update signal → selected
      const [updatedSignal] = await tx
        .update(signals)
        .set({
          status: "selected",
          selectedAngle: input.selectedAngle,
          primaryPlatform: input.primaryPlatform,
          ownerId: input.ownerId,
          updatedAt: new Date(),
        })
        .where(eq(signals.id, signalId))
        .returning();

      // e. Insert content → planning
      const [content] = await tx
        .insert(contents)
        .values({
          brandId: brand.id,
          sourceSignalId: signalId,
          title: signal.title,
          status: "planning",
          ownerId: input.ownerId,
          priority: "normal",
        })
        .returning();

      return { signal: updatedSignal, content };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof SignalError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid input", details: error.message },
        { status: 400 }
      );
    }
    // Unique constraint violation (concurrent create)
    if (
      error instanceof Error &&
      error.message.includes("contents_source_signal_id_unique")
    ) {
      return NextResponse.json(
        { error: "This signal already has a linked content." },
        { status: 409 }
      );
    }
    console.error("POST /api/signals/[id]/create-content error:", error);
    return NextResponse.json(
      { error: "Failed to create content" },
      { status: 500 }
    );
  }
}

/** Typed error for business rule violations inside transactions */
class SignalError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "SignalError";
  }
}
