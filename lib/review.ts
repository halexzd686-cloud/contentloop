import { eq, and, inArray, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  contents,
  contentBriefs,
  contentMasters,
  contentReviews,
  platformVersions,
  teamMembers,
} from "@/lib/db/schema";
import { requireSingleBrand } from "@/lib/brand";
import { resolveApprover } from "@/lib/brief";
import {
  EMPTY_CHECKLIST,
  isChecklistComplete,
  canDragTransition,
  dragBlockReason,
  type ReviewChecklist,
} from "@/lib/validation/review";

/**
 * Review & status transition domain service — M1.6.
 *
 * All business rules live here. API routes (including Pipeline drag)
 * are thin entries into these functions — no duplicated rules.
 *
 * Two status layers, never conflated:
 * - Content workflow: planning / in_progress / review / scheduled / published
 * - PlatformVersion: draft / review / approved / published
 *
 * Multi-entity transitions run in one transaction; any failure rolls
 * back everything. `published` has NO write path in M1.6.
 */

export class ReviewError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "ReviewError";
    this.status = status;
  }
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const REVIEW_RESET = {
  ...EMPTY_CHECKLIST,
  reviewerId: null,
  approvedAt: null,
  updatedAt: new Date(),
};

async function loadContext(tx: Tx, contentId: string, brandId: string) {
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

  const [brief] = await tx
    .select()
    .from(contentBriefs)
    .where(eq(contentBriefs.contentId, contentId));

  const [master] = await tx
    .select()
    .from(contentMasters)
    .where(eq(contentMasters.contentId, contentId));

  const versions = await tx
    .select()
    .from(platformVersions)
    .where(eq(platformVersions.contentId, contentId));

  const reviews = versions.length
    ? await tx
        .select()
        .from(contentReviews)
        .where(
          inArray(
            contentReviews.platformVersionId,
            versions.map((v) => v.id)
          )
        )
    : [];

  return {
    content,
    brief: brief ?? null,
    master: master ?? null,
    versions,
    reviews,
  };
}

/** Upsert an emptied checklist row for a version (reuses the unique current row). */
async function upsertEmptyReview(tx: Tx, versionId: string, existing?: { id: string }) {
  if (existing) {
    await tx
      .update(contentReviews)
      .set(REVIEW_RESET)
      .where(eq(contentReviews.id, existing.id));
  } else {
    await tx.insert(contentReviews).values({ platformVersionId: versionId });
  }
}

// ─── Send to Review ────────────────────────────────────

/**
 * in_progress → review. Gate: Brief approved + Master exists +
 * ≥1 active PlatformVersion, all currently draft.
 * Transaction: versions draft→review, empty/reset checklists,
 * Content → review.
 */
export async function sendToReview(contentId: string) {
  const brand = await requireSingleBrand();
  return db.transaction(async (tx) => {
    const ctx = await loadContext(tx, contentId, brand.id);

    if (ctx.content.status !== "in_progress") {
      throw new ReviewError(
        `Only in-progress content can be sent to review (current: ${ctx.content.status}).`,
        409
      );
    }
    if (ctx.brief?.status !== "approved") {
      throw new ReviewError("Approve Brief before sending to review.", 409);
    }
    if (!ctx.master) {
      throw new ReviewError(
        "Create the Content Master before sending to review.",
        409
      );
    }
    if (ctx.versions.length === 0) {
      throw new ReviewError(
        "Create at least one platform version before sending to review.",
        409
      );
    }
    const notDraft = ctx.versions.filter((v) => v.status !== "draft");
    if (notDraft.length > 0) {
      throw new ReviewError(
        `All platform versions must be draft to enter review (not draft: ${notDraft
          .map((v) => v.platform)
          .join(", ")}).`,
        409
      );
    }

    for (const v of ctx.versions) {
      await tx
        .update(platformVersions)
        .set({ status: "review", updatedAt: new Date() })
        .where(eq(platformVersions.id, v.id));
      await upsertEmptyReview(
        tx,
        v.id,
        ctx.reviews.find((r) => r.platformVersionId === v.id)
      );
    }

    const [content] = await tx
      .update(contents)
      .set({ status: "review", updatedAt: new Date() })
      .where(eq(contents.id, contentId))
      .returning();

    return { content };
  });
}

// ─── Withdraw ──────────────────────────────────────────

/**
 * review → in_progress. The whole Content returns to production;
 * the previous review round is no longer authoritative:
 * versions review|approved → draft, all checklists reset (rows kept).
 */
export async function withdrawFromReview(contentId: string) {
  const brand = await requireSingleBrand();
  return db.transaction(async (tx) => {
    const ctx = await loadContext(tx, contentId, brand.id);

    if (ctx.content.status !== "review") {
      throw new ReviewError(
        `Only content in review can be withdrawn (current: ${ctx.content.status}).`,
        409
      );
    }

    for (const v of ctx.versions) {
      if (v.status === "review" || v.status === "approved") {
        await tx
          .update(platformVersions)
          .set({ status: "draft", updatedAt: new Date() })
          .where(eq(platformVersions.id, v.id));
      }
    }
    for (const r of ctx.reviews) {
      await tx
        .update(contentReviews)
        .set(REVIEW_RESET)
        .where(eq(contentReviews.id, r.id));
    }

    const [content] = await tx
      .update(contents)
      .set({ status: "in_progress", updatedAt: new Date() })
      .where(eq(contents.id, contentId))
      .returning();

    return { content };
  });
}

// ─── Checklist save ────────────────────────────────────

/** Partial checklist save. Only while the version is in review. */
export async function saveChecklist(
  contentId: string,
  platform: string,
  checklist: ReviewChecklist
) {
  const brand = await requireSingleBrand();
  return db.transaction(async (tx) => {
    const ctx = await loadContext(tx, contentId, brand.id);
    const version = ctx.versions.find((v) => v.platform === platform);
    if (!version) {
      throw new ReviewError("No version exists for this platform.", 404);
    }
    if (version.status !== "review") {
      throw new ReviewError(
        `Checklist can only be edited while the version is in review (current: ${version.status}).`,
        409
      );
    }

    const existing = ctx.reviews.find((r) => r.platformVersionId === version.id);
    let row;
    if (existing) {
      [row] = await tx
        .update(contentReviews)
        .set({ ...checklist, updatedAt: new Date() })
        .where(eq(contentReviews.id, existing.id))
        .returning();
    } else {
      [row] = await tx
        .insert(contentReviews)
        .values({ platformVersionId: version.id, ...checklist })
        .returning();
    }
    return { review: row };
  });
}

// ─── Approve for Publishing ────────────────────────────

/**
 * review → scheduled. Aggregate gate: every active version must be
 * approved OR (review AND checklist complete). Only review→approved
 * versions transition; already-approved stay. Newly approved reviews
 * record the resolved reviewer + approvedAt. No Publication is
 * created; scheduledAt is not fabricated.
 */
export async function approveForPublishing(contentId: string) {
  const brand = await requireSingleBrand();
  return db.transaction(async (tx) => {
    const ctx = await loadContext(tx, contentId, brand.id);

    if (ctx.content.status !== "review") {
      throw new ReviewError(
        `Only content in review can be approved for publishing (current: ${ctx.content.status}).`,
        409
      );
    }
    if (ctx.versions.length === 0) {
      throw new ReviewError("No platform versions to approve.", 409);
    }

    const toApprove: string[] = [];
    const blockers: string[] = [];
    for (const v of ctx.versions) {
      if (v.status === "approved") continue;
      if (v.status === "review") {
        const review = ctx.reviews.find((r) => r.platformVersionId === v.id);
        if (
          review &&
          isChecklistComplete({
            factsConfirmed: review.factsConfirmed,
            titleCoverMatch: review.titleCoverMatch,
            platformFitConfirmed: review.platformFitConfirmed,
            riskChecked: review.riskChecked,
            humanReviewed: review.humanReviewed,
          })
        ) {
          toApprove.push(v.id);
          continue;
        }
        blockers.push(`${v.platform} (checklist incomplete)`);
        continue;
      }
      blockers.push(`${v.platform} (status: ${v.status})`);
    }
    if (blockers.length > 0) {
      throw new ReviewError(
        `Cannot approve for publishing: ${blockers.join(", ")}.`,
        409
      );
    }

    const [reviewer] = ctx.content.reviewerId
      ? await tx
          .select({ id: teamMembers.id, isActive: teamMembers.isActive })
          .from(teamMembers)
          .where(eq(teamMembers.id, ctx.content.reviewerId))
      : [null];
    const [owner] = ctx.content.ownerId
      ? await tx
          .select({ id: teamMembers.id, isActive: teamMembers.isActive })
          .from(teamMembers)
          .where(eq(teamMembers.id, ctx.content.ownerId))
      : [null];
    const approver = resolveApprover(reviewer ?? null, owner ?? null);
    if (!approver) {
      throw new ReviewError(
        "No valid reviewer or owner available to approve.",
        400
      );
    }

    const now = new Date();
    for (const versionId of toApprove) {
      await tx
        .update(platformVersions)
        .set({ status: "approved", updatedAt: now })
        .where(eq(platformVersions.id, versionId));
      await tx
        .update(contentReviews)
        .set({ reviewerId: approver.id, approvedAt: now, updatedAt: now })
        .where(eq(contentReviews.platformVersionId, versionId));
    }

    const [content] = await tx
      .update(contents)
      .set({ status: "scheduled", updatedAt: now })
      .where(eq(contents.id, contentId))
      .returning();

    return { content, approvedVersionIds: toApprove, reviewerId: approver.id };
  });
}

// ─── Local platform re-edit ────────────────────────────

/**
 * Single PlatformVersion re-edit. Only that platform is invalidated:
 * version review|approved → draft, its checklist reset. Other
 * platforms keep their state. Content review stays review;
 * scheduled drops to review.
 */
export async function returnVersionToDraft(contentId: string, platform: string) {
  const brand = await requireSingleBrand();
  return db.transaction(async (tx) => {
    const ctx = await loadContext(tx, contentId, brand.id);

    if (ctx.content.status !== "review" && ctx.content.status !== "scheduled") {
      throw new ReviewError(
        "Platform versions can only be returned to draft while the content is in review or scheduled.",
        409
      );
    }
    const version = ctx.versions.find((v) => v.platform === platform);
    if (!version) {
      throw new ReviewError("No version exists for this platform.", 404);
    }
    if (version.status !== "review" && version.status !== "approved") {
      throw new ReviewError(
        `Only a review/approved version can return to draft (current: ${version.status}).`,
        409
      );
    }

    await tx
      .update(platformVersions)
      .set({ status: "draft", updatedAt: new Date() })
      .where(eq(platformVersions.id, version.id));
    const existing = ctx.reviews.find((r) => r.platformVersionId === version.id);
    if (existing) {
      await tx
        .update(contentReviews)
        .set(REVIEW_RESET)
        .where(eq(contentReviews.id, existing.id));
    }

    let content = ctx.content;
    if (ctx.content.status === "scheduled") {
      [content] = await tx
        .update(contents)
        .set({ status: "review", updatedAt: new Date() })
        .where(eq(contents.id, contentId))
        .returning();
    }

    return { content };
  });
}

/**
 * Re-submit a locally re-edited version: draft → review, with an
 * emptied checklist. Only while the content is in review/scheduled.
 */
export async function submitVersionToReview(contentId: string, platform: string) {
  const brand = await requireSingleBrand();
  return db.transaction(async (tx) => {
    const ctx = await loadContext(tx, contentId, brand.id);

    if (ctx.content.status !== "review" && ctx.content.status !== "scheduled") {
      throw new ReviewError(
        "A version can only be submitted to review while the content is in review or scheduled.",
        409
      );
    }
    const version = ctx.versions.find((v) => v.platform === platform);
    if (!version) {
      throw new ReviewError("No version exists for this platform.", 404);
    }
    if (version.status !== "draft") {
      throw new ReviewError(
        `Only a draft version can be submitted to review (current: ${version.status}).`,
        409
      );
    }

    await tx
      .update(platformVersions)
      .set({ status: "review", updatedAt: new Date() })
      .where(eq(platformVersions.id, version.id));
    await upsertEmptyReview(
      tx,
      version.id,
      ctx.reviews.find((r) => r.platformVersionId === version.id)
    );

    return { ok: true };
  });
}

// ─── Global upstream invalidation ──────────────────────

/**
 * Global upstream content change (Edit Brief / Return to Editing on
 * Master) while the content is review/scheduled:
 * Content → in_progress, ALL active versions review|approved → draft,
 * ALL checklists reset. User content (brief fields, master modules,
 * version data) is never touched — only review authority is cleared.
 *
 * Returns whether an invalidation happened (false = content was not
 * in review/scheduled, nothing to do).
 */
export async function globalUpstreamInvalidation(
  tx: Tx,
  content: { id: string; status: string }
): Promise<boolean> {
  if (content.status !== "review" && content.status !== "scheduled") {
    return false;
  }

  const versions = await tx
    .select()
    .from(platformVersions)
    .where(eq(platformVersions.contentId, content.id));

  for (const v of versions) {
    if (v.status === "review" || v.status === "approved") {
      await tx
        .update(platformVersions)
        .set({ status: "draft", updatedAt: new Date() })
        .where(eq(platformVersions.id, v.id));
    }
  }
  if (versions.length > 0) {
    await tx
      .update(contentReviews)
      .set(REVIEW_RESET)
      .where(
        inArray(
          contentReviews.platformVersionId,
          versions.map((v) => v.id)
        )
      );
  }

  await tx
    .update(contents)
    .set({ status: "in_progress", updatedAt: new Date() })
    .where(eq(contents.id, content.id));

  return true;
}

// ─── Pipeline drag (thin entry into the same rules) ────

/**
 * Pipeline drag → maps to the same domain actions:
 * - planning → in_progress: requires an approved Brief
 * - in_progress → review: sendToReview (full entry gate)
 * - review → in_progress: withdrawFromReview (full reset)
 * Everything else (review→scheduled, scheduled→*, any→published) is
 * rejected with an explicit reason.
 */
export async function transitionViaDrag(contentId: string, to: string) {
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
  if (!content) throw new ReviewError("Content not found", 404);

  if (!canDragTransition(content.status, to)) {
    throw new ReviewError(dragBlockReason(content.status, to), 409);
  }

  if (content.status === "in_progress" && to === "review") {
    return sendToReview(contentId);
  }
  if (content.status === "review" && to === "in_progress") {
    return withdrawFromReview(contentId);
  }

  // planning → in_progress: same gate as Brief approve (brief approved).
  const [brief] = await db
    .select()
    .from(contentBriefs)
    .where(eq(contentBriefs.contentId, contentId));
  if (brief?.status !== "approved") {
    throw new ReviewError(
      "Approve Brief before moving the content into production.",
      409
    );
  }
  const [updated] = await db
    .update(contents)
    .set({ status: "in_progress", updatedAt: new Date() })
    .where(eq(contents.id, contentId))
    .returning();
  return { content: updated };
}
