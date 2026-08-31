import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { contents, contentBriefs, contentMasters } from "@/lib/db/schema";
import { requireSingleBrand } from "@/lib/brand";
import {
  buildDefaultModules,
  masterModulesSchema,
  normalizeModuleOrder,
} from "@/lib/validation/master";

/**
 * /api/contents/[id]/master — M1.4 Content Master Core
 *
 * Entry gate: an approved Brief is required.
 * - POST: explicit human action creates the default empty skeleton.
 *   Duplicate create → 409; UNIQUE(content_masters.content_id) is the
 *   final concurrency guard.
 * - PUT: full-array save. Server validates module rules and normalizes
 *   order to 0..n-1 (client order is never authoritative).
 *   An existing Master becomes read-only while its Brief is back in
 *   draft — saves are rejected until re-approval.
 */

async function loadContext(contentId: string) {
  const brand = await requireSingleBrand();

  const [content] = await db
    .select()
    .from(contents)
    .where(
      and(
        eq(contents.id, contentId),
        eq(contents.brandId, brand.id),
        isNull(contents.deletedAt)
      )
    );

  if (!content) return { content: null, brief: null, master: null };

  const [brief] = await db
    .select()
    .from(contentBriefs)
    .where(eq(contentBriefs.contentId, contentId));

  const [master] = await db
    .select()
    .from(contentMasters)
    .where(eq(contentMasters.contentId, contentId));

  return { content, brief: brief ?? null, master: master ?? null };
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { content, brief, master } = await loadContext(id);

    if (!content) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }
    if (brief?.status !== "approved") {
      return NextResponse.json(
        { error: "Approve Brief before creating the Content Master." },
        { status: 400 }
      );
    }
    if (master) {
      return NextResponse.json(
        { error: "This content already has a Content Master." },
        { status: 409 }
      );
    }

    const [created] = await db
      .insert(contentMasters)
      .values({ contentId: id, modules: buildDefaultModules() })
      .returning();

    return NextResponse.json({ master: created }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("content_masters_content_id_unique")
    ) {
      return NextResponse.json(
        { error: "This content already has a Content Master." },
        { status: 409 }
      );
    }
    console.error("POST /api/contents/[id]/master error:", error);
    return NextResponse.json(
      { error: "Failed to create content master" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const parsed = masterModulesSchema.safeParse(body.modules);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid modules",
          details: parsed.error.issues
            .map((i) => i.message)
            .join("; ")
            .slice(0, 500),
        },
        { status: 400 }
      );
    }

    const { content, brief, master } = await loadContext(id);

    if (!content) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }
    if (!master) {
      return NextResponse.json(
        { error: "No Content Master exists. Create it first." },
        { status: 400 }
      );
    }
    if (brief?.status !== "approved") {
      return NextResponse.json(
        {
          error:
            "Brief has changed. Re-approve it to continue editing the Content Master.",
        },
        { status: 409 }
      );
    }

    const [updated] = await db
      .update(contentMasters)
      .set({
        modules: normalizeModuleOrder(parsed.data),
        updatedAt: new Date(),
      })
      .where(eq(contentMasters.contentId, id))
      .returning();

    return NextResponse.json({ master: updated });
  } catch (error) {
    console.error("PUT /api/contents/[id]/master error:", error);
    return NextResponse.json(
      { error: "Failed to save content master" },
      { status: 500 }
    );
  }
}
