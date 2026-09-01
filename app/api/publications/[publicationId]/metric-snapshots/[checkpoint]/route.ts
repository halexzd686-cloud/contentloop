import { NextRequest, NextResponse } from "next/server";

import { createSnapshot, editSnapshot } from "@/lib/metrics/snapshots";
import { ReviewError } from "@/lib/review";
import {
  isCheckpoint,
  snapshotUpsertSchema,
} from "@/lib/validation/snapshot";

/**
 * /api/publications/[publicationId]/metric-snapshots/[checkpoint] — M2.3
 *
 * POST — explicit human Save Snapshot (409 if the checkpoint already
 * has one). PUT — correction of metrics values / capturedAt (404 if
 * none). No upsert, no auto-save, no delete. source = manual always.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ publicationId: string; checkpoint: string }> }
) {
  try {
    const { publicationId, checkpoint } = await params;
    if (!isCheckpoint(checkpoint)) {
      return NextResponse.json(
        { error: "Unsupported checkpoint (V1: 24h / 72h)" },
        { status: 400 }
      );
    }
    const body = await request.json();
    const parsed = snapshotUpsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid snapshot data",
          details: parsed.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; ")
            .slice(0, 500),
        },
        { status: 400 }
      );
    }
    const result = await createSnapshot(publicationId, checkpoint, parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("metric_snapshots_publication_id_checkpoint_unique")
    ) {
      return NextResponse.json(
        { error: "This checkpoint already has a snapshot." },
        { status: 409 }
      );
    }
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST metric-snapshots error:", error);
    return NextResponse.json(
      { error: "Failed to create snapshot" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ publicationId: string; checkpoint: string }> }
) {
  try {
    const { publicationId, checkpoint } = await params;
    if (!isCheckpoint(checkpoint)) {
      return NextResponse.json(
        { error: "Unsupported checkpoint (V1: 24h / 72h)" },
        { status: 400 }
      );
    }
    const body = await request.json();
    const parsed = snapshotUpsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid snapshot data",
          details: parsed.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; ")
            .slice(0, 500),
        },
        { status: 400 }
      );
    }
    const result = await editSnapshot(publicationId, checkpoint, parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("PUT metric-snapshots error:", error);
    return NextResponse.json(
      { error: "Failed to update snapshot" },
      { status: 500 }
    );
  }
}
