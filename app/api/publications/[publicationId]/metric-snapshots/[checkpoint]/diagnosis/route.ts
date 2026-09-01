import { NextRequest, NextResponse } from "next/server";

import { saveDiagnosis, replaceDiagnosis } from "@/lib/metrics/diagnosis";
import { ReviewError } from "@/lib/review";
import { isCheckpoint } from "@/lib/validation/snapshot";
import { diagnosisSaveSchema } from "@/lib/validation/diagnosis";

/**
 * POST/PUT .../diagnosis — M2.6 human-confirmed persistence.
 *
 * POST = first authoritative Diagnosis (409 if one exists).
 * PUT  = Human Confirm Replace (404 if none). Save re-validates the
 * proposal context fingerprint and re-resolves evidence server-side;
 * AI is not called here.
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ publicationId: string; checkpoint: string }> }
) {
  return handle(request, ctx, "create");
}

export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ publicationId: string; checkpoint: string }> }
) {
  return handle(request, ctx, "replace");
}

async function handle(
  request: NextRequest,
  ctx: { params: Promise<{ publicationId: string; checkpoint: string }> },
  mode: "create" | "replace"
) {
  try {
    const { publicationId, checkpoint } = await ctx.params;
    if (!isCheckpoint(checkpoint)) {
      return NextResponse.json(
        { error: "Unsupported checkpoint (V1: 24h / 72h)" },
        { status: 400 }
      );
    }
    const body = await request.json();
    const parsed = diagnosisSaveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid diagnosis",
          details: parsed.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; ")
            .slice(0, 500),
        },
        { status: 400 }
      );
    }
    const result =
      mode === "create"
        ? await saveDiagnosis(publicationId, checkpoint, parsed.data)
        : await replaceDiagnosis(publicationId, checkpoint, parsed.data);
    return NextResponse.json(result, { status: mode === "create" ? 201 : 200 });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("diagnoses_metric_snapshot_id_unique")
    ) {
      return NextResponse.json(
        { error: "A diagnosis already exists for this snapshot. Use Replace." },
        { status: 409 }
      );
    }
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST/PUT diagnosis error:", error);
    return NextResponse.json(
      { error: "Failed to save diagnosis" },
      { status: 500 }
    );
  }
}
