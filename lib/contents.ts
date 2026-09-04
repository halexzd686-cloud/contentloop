import { eq, and, isNull, isNotNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { contents, publications, teamMembers } from "@/lib/db/schema";
import { requireSingleBrand } from "@/lib/brand";
import { ReviewError } from "@/lib/review";
import type { Platform } from "@/lib/validation/platform-version";

/**
 * Content creation / correction / archive domain — M4.1.
 *
 * Server owns: brandId, status=planning, sourceSignalId=null, isDemo,
 * timestamps, deletedAt. Client never submits them. Manual create never
 * fabricates a Signal. Archive is workflow cleanup, never hard delete;
 * publication-bearing content can never be archived.
 */

export interface ManualCreateInput {
  title: string;
  primaryPlatform: Platform;
  pillarId?: string | null;
  ownerId: string;
}

export async function createManualContent(input: ManualCreateInput) {
  const brand = await requireSingleBrand();

  const [owner] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.id, input.ownerId), eq(teamMembers.brandId, brand.id)));
  if (!owner) throw new ReviewError("Owner not found.", 400);
  if (!owner.isActive) throw new ReviewError("Owner is not active.", 400);

  const [created] = await db
    .insert(contents)
    .values({
      brandId: brand.id,
      sourceSignalId: null, // manual — never a fake signal
      title: input.title,
      status: "planning",
      ownerId: input.ownerId,
      pillarId: input.pillarId ?? null,
      primaryPlatform: input.primaryPlatform,
      isDemo: false,
    })
    .returning();

  return { content: created };
}

const CORRECTABLE_STATUSES = ["planning", "in_progress", "review", "scheduled"] as const;

/**
 * Legacy null→value platform correction. Value→different and published/
 * archived are rejected (V1 keeps identity correction minimal).
 */
export async function setPrimaryPlatform(contentId: string, platform: Platform) {
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
  if (!content) {
    // distinguish archived from missing for a clearer error
    const [anyContent] = await db
      .select({ id: contents.id })
      .from(contents)
      .where(eq(contents.id, contentId));
    if (anyContent) {
      throw new ReviewError(
        "Archived content must be restored before setting a platform.",
        409
      );
    }
    throw new ReviewError("Content not found", 404);
  }
  if (content.primaryPlatform !== null) {
    throw new ReviewError(
      "Primary platform is already set and cannot be changed in V1.",
      409
    );
  }
  if (content.status === "published") {
    throw new ReviewError(
      "Published content cannot be given a new primary platform here.",
      409
    );
  }
  if (!(CORRECTABLE_STATUSES as readonly string[]).includes(content.status)) {
    throw new ReviewError(
      `Content in status "${content.status}" cannot be corrected this way.`,
      409
    );
  }

  const [updated] = await db
    .update(contents)
    .set({ primaryPlatform: platform, updatedAt: new Date() })
    .where(eq(contents.id, content.id))
    .returning();

  return { content: updated };
}

export async function archiveContent(contentId: string) {
  const brand = await requireSingleBrand();

  return db.transaction(async (tx) => {
    const [content] = await tx
      .select()
      .from(contents)
      .where(
        and(
          eq(contents.id, contentId),
          eq(contents.brandId, brand.id),
          isNull(contents.deletedAt)
        )
      );
    if (!content) {
      const [anyContent] = await tx
        .select({ id: contents.id })
        .from(contents)
        .where(eq(contents.id, contentId));
      if (anyContent) throw new ReviewError("Content is already archived.", 409);
      throw new ReviewError("Content not found", 404);
    }
    if (content.status === "published") {
      throw new ReviewError("Published content cannot be archived.", 409);
    }

    const pubs = await tx
      .select({ id: publications.id })
      .from(publications)
      .where(
        and(
          eq(publications.contentId, content.id),
          isNull(publications.deletedAt)
        )
      )
      .limit(1);
    if (pubs.length > 0) {
      throw new ReviewError(
        "Content with a real publication cannot be archived.",
        409
      );
    }

    const [updated] = await tx
      .update(contents)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(contents.id, content.id))
      .returning();

    return { content: updated };
  });
}

export async function restoreContent(contentId: string) {
  const brand = await requireSingleBrand();

  const [content] = await db
    .select()
    .from(contents)
    .where(
      and(
        eq(contents.id, contentId),
        eq(contents.brandId, brand.id),
        isNotNull(contents.deletedAt)
      )
    );
  if (!content) throw new ReviewError("Content is not archived.", 409);

  const [updated] = await db
    .update(contents)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(eq(contents.id, content.id))
    .returning();

  return { content: updated };
}
