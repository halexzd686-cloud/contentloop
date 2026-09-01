import { NextRequest, NextResponse } from "next/server";

import { markAsPublished, editPublication } from "@/lib/publication";
import { ReviewError } from "@/lib/review";
import { isPlatform } from "@/lib/validation/platform-version";
import {
  publicationCreateSchema,
  publicationEditSchema,
} from "@/lib/validation/publication";

/**
 * /api/contents/[id]/versions/[platform]/publication — M2.1
 *
 * POST — Mark as Published. Records that this PlatformVersion was
 * REALLY published externally. Human-confirmed data only (no fake
 * URLs / no auto-now timestamps). Transaction: gate → INSERT
 * Publication → version approved→published → Content aggregate
 * (scheduled→published when the whole target set is published).
 *
 * PUT — Publication correction: finalTitle / publishedAt / url /
 * coverUrl / notes only. Identity immutable; no status changes.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; platform: string }> }
) {
  try {
    const { id, platform } = await params;
    if (!isPlatform(platform)) {
      return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });
    }
    const body = await request.json();
    const parsed = publicationCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid publication data",
          details: parsed.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; ")
            .slice(0, 500),
        },
        { status: 400 }
      );
    }
    const result = await markAsPublished(id, platform, parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("publications_platform_version_id_unique")
    ) {
      return NextResponse.json(
        { error: "This platform version already has a Publication record." },
        { status: 409 }
      );
    }
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST publication error:", error);
    return NextResponse.json(
      { error: "Failed to create publication" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; platform: string }> }
) {
  try {
    const { id, platform } = await params;
    if (!isPlatform(platform)) {
      return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });
    }
    const body = await request.json();
    const parsed = publicationEditSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid publication data",
          details: parsed.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; ")
            .slice(0, 500),
        },
        { status: 400 }
      );
    }
    const result = await editPublication(id, platform, parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("PUT publication error:", error);
    return NextResponse.json(
      { error: "Failed to update publication" },
      { status: 500 }
    );
  }
}
