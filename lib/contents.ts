import { eq, and, isNull, isNotNull, desc } from "drizzle-orm";

import { db } from "@/lib/db";
import { contents, contentBriefs, publications, teamMembers } from "@/lib/db/schema";
import { requireSingleBrand } from "@/lib/brand";
import { ReviewError } from "@/lib/review";
import { contentStatusLabel } from "@/lib/labels";
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

/**
 * Content list read for the current Brand (Studio index, Home, and the
 * M9 attention model share this — one query, no drift). Extracted from
 * GET /api/contents in M9; field selection is the route's original.
 */
export async function listContents(archived: boolean) {
  const brand = await requireSingleBrand();
  return db
    .select({
      id: contents.id,
      title: contents.title,
      status: contents.status,
      priority: contents.priority,
      ownerId: contents.ownerId,
      ownerName: teamMembers.name,
      briefStatus: contentBriefs.status,
      sourceSignalId: contents.sourceSignalId,
      primaryPlatform: contents.primaryPlatform,
      isDemo: contents.isDemo,
      deletedAt: contents.deletedAt,
      updatedAt: contents.updatedAt,
    })
    .from(contents)
    .leftJoin(teamMembers, eq(contents.ownerId, teamMembers.id))
    .leftJoin(contentBriefs, eq(contentBriefs.contentId, contents.id))
    .where(
      and(
        eq(contents.brandId, brand.id),
        archived ? isNotNull(contents.deletedAt) : isNull(contents.deletedAt)
      )
    )
    .orderBy(desc(contents.updatedAt));
}

export async function createManualContent(input: ManualCreateInput) {
  const brand = await requireSingleBrand();

  const [owner] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.id, input.ownerId), eq(teamMembers.brandId, brand.id)));
  if (!owner) throw new ReviewError("负责人不存在。", 400);
  if (!owner.isActive) throw new ReviewError("负责人已停用。", 400);

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
        "已归档的内容需要先恢复，才能设置平台。",
        409
      );
    }
    throw new ReviewError("内容不存在", 404);
  }
  if (content.primaryPlatform !== null) {
    throw new ReviewError(
      "主要平台已设置，不可更改。",
      409
    );
  }
  if (content.status === "published") {
    throw new ReviewError(
      "已发布的内容不能在这里设置新的主要平台。",
      409
    );
  }
  if (!(CORRECTABLE_STATUSES as readonly string[]).includes(content.status)) {
    throw new ReviewError(
      `这条内容的当前状态（${contentStatusLabel(content.status)}）不允许设置平台。`,
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
      if (anyContent) throw new ReviewError("这条内容已归档。", 409);
      throw new ReviewError("内容不存在", 404);
    }
    if (content.status === "published") {
      throw new ReviewError("已发布的内容不能归档。", 409);
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
        "已有真实发布记录的内容不能归档。",
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
  if (!content) throw new ReviewError("这条内容未归档。", 409);

  const [updated] = await db
    .update(contents)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(eq(contents.id, content.id))
    .returning();

  return { content: updated };
}
