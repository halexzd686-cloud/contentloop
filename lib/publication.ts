import { eq, and, inArray, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  contents,
  platformVersions,
  publications,
} from "@/lib/db/schema";
import { requireSingleBrand } from "@/lib/brand";
import { ReviewError, loadAggregate, toSnapshot } from "@/lib/review";
import type { PublicationCreateInput, PublicationEditInput } from "@/lib/validation/publication";
import { publicationProgress } from "@/lib/validation/publication";

/**
 * Publication domain service — M2.1.
 *
 * A Publication is a REAL external-platform publish record — an
 * irreversible business fact in V1 (no unpublish / no history).
 *
 * Mark as Published transaction:
 * 1. Load + validate Content / PlatformVersion (brand-scoped)
 * 2. Gate: version approved AND content scheduled AND no active
 *    Publication for this version
 * 3. INSERT Publication (platform / contentId server-derived)
 * 4. PlatformVersion approved → published
 * 5. Recalculate the Publication Target Set aggregate (active
 *    versions only — Brand.enabledPlatforms is NOT required)
 * 6. All targets published → Content scheduled → published
 * Any failure rolls back everything. UNIQUE(platform_version_id) is
 * the final concurrency guard.
 */

export interface PublicationSummary {
  id: string;
  platformVersionId: string;
  contentId: string;
  platform: string;
  finalTitle: string;
  publishedAt: string;
  url: string;
  coverUrl: string | null;
  notes: string | null;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function loadPublicationContext(tx: Tx, contentId: string, brandId: string, platform: string) {
  const [content] = await tx
    .select()
    .from(contents)
    .where(
      and(
        eq(contents.id, contentId),
        eq(contents.brandId, brandId),
        isNull(contents.deletedAt)
      )
    );
  if (!content) throw new ReviewError("Content not found", 404);

  const [version] = await tx
    .select()
    .from(platformVersions)
    .where(
      and(
        eq(platformVersions.contentId, contentId),
        eq(platformVersions.platform, platform as never)
      )
    );
  if (!version) {
    throw new ReviewError("No version exists for this platform.", 404);
  }

  const versions = await tx
    .select({
      id: platformVersions.id,
      platform: platformVersions.platform,
      status: platformVersions.status,
    })
    .from(platformVersions)
    .where(eq(platformVersions.contentId, contentId));

  const pubs = await tx
    .select()
    .from(publications)
    .where(
      and(
        inArray(
          publications.platformVersionId,
          versions.length ? versions.map((v) => v.id) : ["00000000-0000-0000-0000-000000000000"]
        ),
        isNull(publications.deletedAt)
      )
    );

  return { content, version, versions, pubs };
}

function toSummary(p: typeof publications.$inferSelect): PublicationSummary {
  return {
    id: p.id,
    platformVersionId: p.platformVersionId,
    contentId: p.contentId,
    platform: p.platform,
    finalTitle: p.finalTitle,
    publishedAt: p.publishedAt.toISOString(),
    url: p.url,
    coverUrl: p.coverUrl,
    notes: p.notes,
  };
}

export async function markAsPublished(
  contentId: string,
  platform: "xiaohongshu" | "bilibili" | "douyin",
  input: PublicationCreateInput
) {
  const brand = await requireSingleBrand();

  return db.transaction(async (tx) => {
    const ctx = await loadPublicationContext(tx, contentId, brand.id, platform);

    if (ctx.content.status !== "scheduled") {
      throw new ReviewError(
        `Only scheduled content can be marked as published (current: ${ctx.content.status}).`,
        409
      );
    }
    if (ctx.version.status === "published") {
      throw new ReviewError("This platform version is already published.", 409);
    }
    if (ctx.version.status !== "approved") {
      throw new ReviewError(
        `Only an approved platform version can be marked as published (current: ${ctx.version.status}).`,
        409
      );
    }
    const existing = ctx.pubs.find(
      (p) => p.platformVersionId === ctx.version.id
    );
    if (existing) {
      throw new ReviewError(
        "This platform version already has a Publication record.",
        409
      );
    }

    const now = new Date();
    const publishedAt = new Date(input.publishedAt);

    const [publication] = await tx
      .insert(publications)
      .values({
        platformVersionId: ctx.version.id,
        contentId,
        platform, // server-derived from the PlatformVersion
        finalTitle: input.finalTitle,
        publishedAt,
        url: input.url,
        coverUrl: input.coverUrl || null,
        notes: input.notes || null,
      })
      .returning();

    await tx
      .update(platformVersions)
      .set({ status: "published", updatedAt: now })
      .where(eq(platformVersions.id, ctx.version.id));

    // Publication Target Set = the content's active PlatformVersions.
    const afterVersions = ctx.versions.map((v) =>
      v.id === ctx.version.id ? { ...v, status: "published" } : v
    );
    const progress = publicationProgress(afterVersions);

    if (progress.published === progress.total && progress.total > 0) {
      await tx
        .update(contents)
        .set({ status: "published", updatedAt: now })
        .where(eq(contents.id, contentId));
    }

    // Authoritative workflow snapshot via one aggregate re-read (M1.6
    // architecture — client applies it directly, no second GET).
    const workflow = toSnapshot(await loadAggregate(tx, contentId, brand.id));

    return {
      workflow,
      publication: toSummary(publication),
      publicationProgress: progress,
    };
  });
}

/**
 * Publication correction: edit finalTitle / publishedAt / url /
 * coverUrl / notes only. Identity (platform / version / content) is
 * immutable; no status changes; no history.
 */
export async function editPublication(
  contentId: string,
  platform: string,
  input: PublicationEditInput
) {
  const brand = await requireSingleBrand();

  return db.transaction(async (tx) => {
    const ctx = await loadPublicationContext(tx, contentId, brand.id, platform);
    const existing = ctx.pubs.find(
      (p) => p.platformVersionId === ctx.version.id
    );
    if (!existing) {
      throw new ReviewError("No Publication exists for this platform.", 404);
    }

    const [updated] = await tx
      .update(publications)
      .set({
        finalTitle: input.finalTitle,
        publishedAt: new Date(input.publishedAt),
        url: input.url,
        coverUrl: input.coverUrl || null,
        notes: input.notes || null,
        updatedAt: new Date(),
      })
      .where(eq(publications.id, existing.id))
      .returning();

    const progress = publicationProgress(ctx.versions);
    return {
      publication: toSummary(updated),
      publicationProgress: progress,
    };
  });
}
