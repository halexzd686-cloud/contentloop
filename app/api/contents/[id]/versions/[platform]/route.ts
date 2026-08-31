import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  contents,
  contentBriefs,
  contentMasters,
  platformVersions,
} from "@/lib/db/schema";
import { requireSingleBrand } from "@/lib/brand";
import {
  isPlatform,
  SAVE_SCHEMAS,
  normalizePlatformData,
} from "@/lib/validation/platform-version";

/**
 * /api/contents/[id]/versions/[platform] — M1.5 Platform Versions
 *
 * Entry gate: Content Master must exist AND Brief must be approved
 * (i.e. the Master is currently editable). While the Brief is back in
 * draft, existing versions stay readable but locked — no create, edit
 * or auto-save (409).
 *
 * POST = explicit Create only (Empty Draft or Human Apply of an AI
 * proposal). Duplicate create → 409; UNIQUE(content_id, platform) is
 * the final concurrency guard.
 *
 * PUT = Update an EXISTING draft only. Missing version → 404 (no
 * implicit upsert — auto-save can never create a row). Non-draft
 * versions are read-only for M1.5 (409).
 */

async function loadContext(contentId: string, platform: string) {
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

  if (!content) return { content: null, brief: null, master: null, version: null };

  const [brief] = await db
    .select()
    .from(contentBriefs)
    .where(eq(contentBriefs.contentId, contentId));

  const [master] = await db
    .select()
    .from(contentMasters)
    .where(eq(contentMasters.contentId, contentId));

  const [version] = await db
    .select()
    .from(platformVersions)
    .where(
      and(
        eq(platformVersions.contentId, contentId),
        eq(platformVersions.platform, platform as never)
      )
    );

  return { content, brief: brief ?? null, master: master ?? null, version: version ?? null };
}

const LOCKED_MESSAGE =
  "Brief has changed. Re-approve it to continue editing platform versions.";

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
    const parsed = SAVE_SCHEMAS[platform].safeParse(body.data);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid platform data",
          details: parsed.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; ")
            .slice(0, 500),
        },
        { status: 400 }
      );
    }

    const { content, brief, master, version } = await loadContext(id, platform);

    if (!content) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }
    if (content.status !== "in_progress") {
      return NextResponse.json(
        {
          error:
            "Platform versions can only be created while the content is in production.",
        },
        { status: 409 }
      );
    }
    if (!master || brief?.status !== "approved") {
      return NextResponse.json(
        {
          error: master
            ? LOCKED_MESSAGE
            : "Create the Content Master before adapting platform versions.",
        },
        { status: 409 }
      );
    }
    if (version) {
      return NextResponse.json(
        { error: `A ${platform} version already exists. Update it instead.` },
        { status: 409 }
      );
    }

    const [created] = await db
      .insert(platformVersions)
      .values({
        contentId: id,
        platform,
        status: "draft",
        data: normalizePlatformData(platform, parsed.data),
      })
      .returning();

    return NextResponse.json({ version: created }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("platform_versions_content_id_platform_unique")
    ) {
      return NextResponse.json(
        { error: "A version for this platform already exists." },
        { status: 409 }
      );
    }
    console.error("POST /api/contents/[id]/versions/[platform] error:", error);
    return NextResponse.json(
      { error: "Failed to create platform version" },
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
    const parsed = SAVE_SCHEMAS[platform].safeParse(body.data);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid platform data",
          details: parsed.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; ")
            .slice(0, 500),
        },
        { status: 400 }
      );
    }

    const { content, brief, master, version } = await loadContext(id, platform);

    if (!content) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }
    if (!version) {
      return NextResponse.json(
        { error: "No version exists for this platform. Create it first." },
        { status: 404 }
      );
    }
    if (version.status !== "draft") {
      return NextResponse.json(
        { error: `Version status "${version.status}" cannot be edited in M1.5.` },
        { status: 409 }
      );
    }
    if (!master || brief?.status !== "approved") {
      return NextResponse.json({ error: LOCKED_MESSAGE }, { status: 409 });
    }

    const [updated] = await db
      .update(platformVersions)
      .set({
        data: normalizePlatformData(platform, parsed.data),
        updatedAt: new Date(),
      })
      .where(eq(platformVersions.id, version.id))
      .returning();

    return NextResponse.json({ version: updated });
  } catch (error) {
    console.error("PUT /api/contents/[id]/versions/[platform] error:", error);
    return NextResponse.json(
      { error: "Failed to save platform version" },
      { status: 500 }
    );
  }
}
