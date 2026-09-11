import { eq, and, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  contents,
  contentBriefs,
  contentReviews,
  platformVersions,
  publications,
  teamMembers,
} from "@/lib/db/schema";
import { requireSingleBrand } from "@/lib/brand";
import { resolveApprover } from "@/lib/brief";
import {
  contentStatusLabel,
  platformLabel,
  versionStatusLabel,
} from "@/lib/labels";
import {
  EMPTY_CHECKLIST,
  isChecklistComplete,
  canDragTransition,
  dragBlockReason,
  type ReviewChecklist,
} from "@/lib/validation/review";
import type {
  WorkflowReviewState,
  WorkflowSnapshot,
  WorkflowVersionState,
} from "@/lib/workflow-snapshot";

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
 * Performance architecture (post-instrumentation):
 * - ONE aggregate read per action (single round trip via json_agg)
 * - Set-based batched writes (no per-platform sequential RTTs)
 * - Every mutation returns an authoritative WorkflowSnapshot built
 *   from the aggregate + RETURNING rows — the client never needs a
 *   second full-detail GET.
 *
 * `published` has NO write path in M1.6.
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

// ─── Aggregate read (ONE round trip) ───────────────────

interface Aggregate {
  content: {
    id: string;
    status: string;
    reviewerId: string | null;
    ownerId: string | null;
  };
  publications: { id: string; platformVersionId: string }[];
  brief: {
    status: string;
    approvedAt: string | null;
    approvedBy: string | null;
  } | null;
  hasMaster: boolean;
  versions: WorkflowVersionState[];
  reviews: WorkflowReviewState[];
}

export async function loadAggregate(
  tx: Tx,
  contentId: string,
  brandId: string
): Promise<Aggregate> {
  const result = await tx.execute(sql`
    select
      (select json_build_object('id', id, 'status', status,
                                'reviewerId', reviewer_id, 'ownerId', owner_id)
         from contents
        where id = ${contentId}::uuid and brand_id = ${brandId}::uuid
          and deleted_at is null) as content,
      (select json_build_object('status', status,
                                'approvedAt', to_char(approved_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
                                'approvedBy', approved_by)
         from content_briefs where content_id = ${contentId}::uuid) as brief,
      (select json_build_object('id', id)
         from content_masters where content_id = ${contentId}::uuid) as master,
      (select coalesce(json_agg(json_build_object('id', id, 'platform', platform, 'status', status)), '[]'::json)
         from platform_versions where content_id = ${contentId}::uuid) as versions,
      (select coalesce(json_agg(json_build_object(
                'platformVersionId', r.platform_version_id,
                'factsConfirmed', r.facts_confirmed,
                'titleCoverMatch', r.title_cover_match,
                'platformFitConfirmed', r.platform_fit_confirmed,
                'riskChecked', r.risk_checked,
                'humanReviewed', r.human_reviewed,
                'reviewerId', r.reviewer_id,
                'approvedAt', to_char(r.approved_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))), '[]'::json)
         from content_reviews r
         join platform_versions v on v.id = r.platform_version_id
        where v.content_id = ${contentId}::uuid) as reviews,
      (select coalesce(json_agg(json_build_object('id', p.id, 'platformVersionId', p.platform_version_id)), '[]'::json)
         from publications p
         join platform_versions v on v.id = p.platform_version_id
        where v.content_id = ${contentId}::uuid and p.deleted_at is null) as publications
  `);

  const rows = result as unknown as {
    content: Aggregate["content"] | null;
    brief: Aggregate["brief"];
    master: { id: string } | null;
    versions: WorkflowVersionState[] | null;
    reviews: WorkflowReviewState[] | null;
    publications: { id: string; platformVersionId: string }[] | null;
  }[];
  const row = rows[0];
  if (!row?.content) throw new ReviewError("内容不存在", 404);

  return {
    content: row.content,
    brief: row.brief ?? null,
    hasMaster: !!row.master,
    versions: row.versions ?? [],
    reviews: row.reviews ?? [],
    publications: row.publications ?? [],
  };
}

export type { Aggregate };

export function toSnapshot(agg: Aggregate): WorkflowSnapshot {
  return {
    content: { id: agg.content.id, status: agg.content.status },
    brief: agg.brief,
    hasMaster: agg.hasMaster,
    versions: agg.versions,
    reviews: agg.reviews,
  };
}

/** Apply a versions/status override set onto the aggregate's version list. */
function mergeVersions(
  versions: WorkflowVersionState[],
  updated: WorkflowVersionState[]
): WorkflowVersionState[] {
  const byId = new Map(updated.map((v) => [v.id, v]));
  return versions.map((v) => byId.get(v.id) ?? v);
}

/** Apply a review-row override set onto the aggregate's review list. */
function mergeReviews(
  reviews: WorkflowReviewState[],
  updated: WorkflowReviewState[]
): WorkflowReviewState[] {
  const byVid = new Map(updated.map((r) => [r.platformVersionId, r]));
  const merged = reviews.map((r) => byVid.get(r.platformVersionId) ?? r);
  for (const r of updated) {
    if (!reviews.some((x) => x.platformVersionId === r.platformVersionId)) {
      merged.push(r);
    }
  }
  return merged;
}

type ReviewRowDb = Omit<WorkflowReviewState, "approvedAt"> & {
  approvedAt: Date | null;
};

/** Normalize DB rows (Date approvedAt) into snapshot shape (ISO string). */
function toReviewState(r: {
  platformVersionId: string;
  factsConfirmed: boolean;
  titleCoverMatch: boolean;
  platformFitConfirmed: boolean;
  riskChecked: boolean;
  humanReviewed: boolean;
  reviewerId: string | null;
  approvedAt: Date | string | null;
}): WorkflowReviewState {
  return {
    ...r,
    approvedAt:
      r.approvedAt instanceof Date
        ? r.approvedAt.toISOString()
        : (r.approvedAt ?? null),
  };
}

function resetReviewState(platformVersionId: string): WorkflowReviewState {
  return {
    platformVersionId,
    ...EMPTY_CHECKLIST,
    reviewerId: null,
    approvedAt: null,
  };
}

// ─── Send to Review ────────────────────────────────────

/**
 * in_progress → review. Gate: Brief approved + Master exists +
 * ≥1 active PlatformVersion, all currently draft.
 * Transaction (4 batched writes): versions draft→review (1 UPDATE),
 * existing checklists reset (1 UPDATE), missing checklists inserted
 * (1 bulk INSERT), Content → review (1 UPDATE ... RETURNING).
 */
export async function sendToReview(contentId: string) {
  const brand = await requireSingleBrand();
  return db.transaction(async (tx) => {
    const agg = await loadAggregate(tx, contentId, brand.id);

    if (agg.content.status !== "in_progress") {
      throw new ReviewError(
        `只有制作中的内容才能送审（当前状态：${contentStatusLabel(agg.content.status)}）。`,
        409
      );
    }
    if (agg.brief?.status !== "approved") {
      throw new ReviewError("请先确认内容简报，再送审。", 409);
    }
    if (!agg.hasMaster) {
      throw new ReviewError(
        "请先创建内容母稿，再送审。",
        409
      );
    }
    if (agg.versions.length === 0) {
      throw new ReviewError(
        "请先创建至少一个平台版本，再送审。",
        409
      );
    }
    const notDraft = agg.versions.filter((v) => v.status !== "draft");
    if (notDraft.length > 0) {
      throw new ReviewError(
        `所有平台版本都必须是草稿才能进入审核（非草稿：${notDraft
          .map((v) => platformLabel(v.platform))
          .join("，")}）。`,
        409
      );
    }

    const now = new Date();
    const versionIds = agg.versions.map((v) => v.id);

    const updatedVersions = await tx
      .update(platformVersions)
      .set({ status: "review", updatedAt: now })
      .where(inArray(platformVersions.id, versionIds))
      .returning({
        id: platformVersions.id,
        platform: platformVersions.platform,
        status: platformVersions.status,
      });

    const existingReviewVids = agg.reviews.map((r) => r.platformVersionId);
    let updatedReviews: ReviewRowDb[] = [];
    if (existingReviewVids.length > 0) {
      updatedReviews = await tx
        .update(contentReviews)
        .set(REVIEW_RESET)
        .where(inArray(contentReviews.platformVersionId, existingReviewVids))
        .returning({
          platformVersionId: contentReviews.platformVersionId,
          factsConfirmed: contentReviews.factsConfirmed,
          titleCoverMatch: contentReviews.titleCoverMatch,
          platformFitConfirmed: contentReviews.platformFitConfirmed,
          riskChecked: contentReviews.riskChecked,
          humanReviewed: contentReviews.humanReviewed,
          reviewerId: contentReviews.reviewerId,
          approvedAt: contentReviews.approvedAt,
        });
    }
    const missingVids = versionIds.filter(
      (id) => !existingReviewVids.includes(id)
    );
    let insertedReviews: ReviewRowDb[] = [];
    if (missingVids.length > 0) {
      insertedReviews = await tx
        .insert(contentReviews)
        .values(missingVids.map((vid) => ({ platformVersionId: vid })))
        .returning({
          platformVersionId: contentReviews.platformVersionId,
          factsConfirmed: contentReviews.factsConfirmed,
          titleCoverMatch: contentReviews.titleCoverMatch,
          platformFitConfirmed: contentReviews.platformFitConfirmed,
          riskChecked: contentReviews.riskChecked,
          humanReviewed: contentReviews.humanReviewed,
          reviewerId: contentReviews.reviewerId,
          approvedAt: contentReviews.approvedAt,
        });
    }

    const [content] = await tx
      .update(contents)
      .set({ status: "review", updatedAt: now })
      .where(eq(contents.id, contentId))
      .returning({ id: contents.id, status: contents.status });

    const workflow: WorkflowSnapshot = {
      content,
      brief: agg.brief,
      hasMaster: agg.hasMaster,
      versions: mergeVersions(agg.versions, updatedVersions),
      reviews: mergeReviews(agg.reviews, [
        ...updatedReviews.map(toReviewState),
        ...insertedReviews.map(toReviewState),
      ]),
    };
    return { workflow };
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
    const agg = await loadAggregate(tx, contentId, brand.id);

    if (agg.content.status !== "review") {
      throw new ReviewError(
        `只有待审核的内容才能撤回（当前状态：${contentStatusLabel(agg.content.status)}）。`,
        409
      );
    }

    const now = new Date();
    const versionIds = agg.versions.map((v) => v.id);
    const resetVids = agg.reviews.map((r) => r.platformVersionId);

    let updatedVersions: WorkflowVersionState[] = [];
    if (versionIds.length > 0) {
      updatedVersions = await tx
        .update(platformVersions)
        .set({ status: "draft", updatedAt: now })
        .where(
          and(
            inArray(platformVersions.id, versionIds),
            inArray(platformVersions.status, ["review", "approved"])
          )
        )
        .returning({
          id: platformVersions.id,
          platform: platformVersions.platform,
          status: platformVersions.status,
        });
    }
    if (resetVids.length > 0) {
      await tx
        .update(contentReviews)
        .set(REVIEW_RESET)
        .where(inArray(contentReviews.platformVersionId, resetVids));
    }

    const [content] = await tx
      .update(contents)
      .set({ status: "in_progress", updatedAt: now })
      .where(eq(contents.id, contentId))
      .returning({ id: contents.id, status: contents.status });

    const workflow: WorkflowSnapshot = {
      content,
      brief: agg.brief,
      hasMaster: agg.hasMaster,
      versions: mergeVersions(agg.versions, updatedVersions),
      reviews: agg.reviews.map((r) => resetReviewState(r.platformVersionId)),
    };
    return { workflow };
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
    // ONE round trip: content scope + version + existing review id.
    const result = await tx.execute(sql`
      select
        (select json_build_object('id', id) from contents
          where id = ${contentId}::uuid and brand_id = ${brand.id}::uuid
            and deleted_at is null) as content,
        (select json_build_object('id', id, 'status', status) from platform_versions
          where content_id = ${contentId}::uuid and platform = ${platform}) as version,
        (select json_build_object('id', r.id) from content_reviews r
          join platform_versions v on v.id = r.platform_version_id
          where v.content_id = ${contentId}::uuid and v.platform = ${platform}) as review
    `);
    const rows = result as unknown as {
      content: { id: string } | null;
      version: { id: string; status: string } | null;
      review: { id: string } | null;
    }[];
    const row = rows[0];

    if (!row?.content) throw new ReviewError("内容不存在", 404);
    if (!row.version) {
      throw new ReviewError("该平台还没有版本。", 404);
    }
    if (row.version.status !== "review") {
      throw new ReviewError(
        `只有审核中的版本才能编辑审核清单（当前状态：${versionStatusLabel(row.version.status)}）。`,
        409
      );
    }

    let saved;
    if (row.review) {
      [saved] = await tx
        .update(contentReviews)
        .set({ ...checklist, updatedAt: new Date() })
        .where(eq(contentReviews.id, row.review.id))
        .returning();
    } else {
      [saved] = await tx
        .insert(contentReviews)
        .values({ platformVersionId: row.version.id, ...checklist })
        .returning();
    }
    return { review: saved };
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
    const agg = await loadAggregate(tx, contentId, brand.id);

    const partiallyPublished =
      agg.content.status === "scheduled" && agg.publications.length > 0;
    if (agg.content.status !== "review" && !partiallyPublished) {
      throw new ReviewError(
        `只有待审核的内容才能审核通过并待发布（当前状态：${contentStatusLabel(agg.content.status)}）。`,
        409
      );
    }
    if (agg.versions.length === 0) {
      throw new ReviewError("没有可审核通过的平台版本。", 409);
    }

    const toApprove: string[] = [];
    const blockers: string[] = [];
    for (const v of agg.versions) {
      if (v.status === "approved" || v.status === "published") continue;
      if (v.status === "review") {
        const review = agg.reviews.find((r) => r.platformVersionId === v.id);
        if (review && isChecklistComplete(review)) {
          toApprove.push(v.id);
          continue;
        }
        blockers.push(`${platformLabel(v.platform)}（清单未完成）`);
        continue;
      }
      blockers.push(`${platformLabel(v.platform)}（状态：${versionStatusLabel(v.status)}）`);
    }
    if (blockers.length > 0) {
      throw new ReviewError(
        `无法审核通过并待发布：${blockers.join("，")}。`,
        409
      );
    }

    let reviewer: { id: string; isActive: boolean } | null = null;
    if (agg.content.reviewerId) {
      [reviewer] = await tx
        .select({ id: teamMembers.id, isActive: teamMembers.isActive })
        .from(teamMembers)
        .where(eq(teamMembers.id, agg.content.reviewerId));
    }
    let owner: { id: string; isActive: boolean } | null = null;
    if (agg.content.ownerId) {
      [owner] = await tx
        .select({ id: teamMembers.id, isActive: teamMembers.isActive })
        .from(teamMembers)
        .where(eq(teamMembers.id, agg.content.ownerId));
    }
    const approver = resolveApprover(reviewer ?? null, owner ?? null);
    if (!approver) {
      throw new ReviewError(
        "没有可用的审核人或负责人来完成审核。",
        400
      );
    }

    const now = new Date();
    let updatedVersions: WorkflowVersionState[] = [];
    let updatedReviews: ReviewRowDb[] = [];
    if (toApprove.length > 0) {
      updatedVersions = await tx
        .update(platformVersions)
        .set({ status: "approved", updatedAt: now })
        .where(inArray(platformVersions.id, toApprove))
        .returning({
          id: platformVersions.id,
          platform: platformVersions.platform,
          status: platformVersions.status,
        });
      updatedReviews = await tx
        .update(contentReviews)
        .set({ reviewerId: approver.id, approvedAt: now, updatedAt: now })
        .where(inArray(contentReviews.platformVersionId, toApprove))
        .returning({
          platformVersionId: contentReviews.platformVersionId,
          factsConfirmed: contentReviews.factsConfirmed,
          titleCoverMatch: contentReviews.titleCoverMatch,
          platformFitConfirmed: contentReviews.platformFitConfirmed,
          riskChecked: contentReviews.riskChecked,
          humanReviewed: contentReviews.humanReviewed,
          reviewerId: contentReviews.reviewerId,
          approvedAt: contentReviews.approvedAt,
        });
    }

    let content = { id: agg.content.id, status: agg.content.status };
    if (agg.content.status === "review") {
      [content] = await tx
        .update(contents)
        .set({ status: "scheduled", updatedAt: now })
        .where(eq(contents.id, contentId))
        .returning({ id: contents.id, status: contents.status });
    }

    const workflow: WorkflowSnapshot = {
      content,
      brief: agg.brief,
      hasMaster: agg.hasMaster,
      versions: mergeVersions(agg.versions, updatedVersions),
      reviews: mergeReviews(agg.reviews, updatedReviews.map(toReviewState)),
    };
    return { workflow };
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
    const agg = await loadAggregate(tx, contentId, brand.id);

    if (agg.content.status !== "review" && agg.content.status !== "scheduled") {
      throw new ReviewError(
        "只有内容处于待审核或待发布状态时，平台版本才能退回草稿。",
        409
      );
    }
    const version = agg.versions.find((v) => v.platform === platform);
    if (!version) {
      throw new ReviewError("该平台还没有版本。", 404);
    }
    if (version.status !== "review" && version.status !== "approved") {
      throw new ReviewError(
        `只有审核中或已通过的版本才能退回草稿（当前状态：${versionStatusLabel(version.status)}）。`,
        409
      );
    }

    const now = new Date();
    const [updatedVersion] = await tx
      .update(platformVersions)
      .set({ status: "draft", updatedAt: now })
      .where(eq(platformVersions.id, version.id))
      .returning({
        id: platformVersions.id,
        platform: platformVersions.platform,
        status: platformVersions.status,
      });
    await tx
      .update(contentReviews)
      .set(REVIEW_RESET)
      .where(eq(contentReviews.platformVersionId, version.id));

    // Partially-published scheduled: content STAYS scheduled — a real
    // Publication already exists and must not regress. Pre-publication
    // scheduled drops back to review (M1.6 rule).
    let content = { id: agg.content.id, status: agg.content.status };
    if (agg.content.status === "scheduled" && agg.publications.length === 0) {
      [content] = await tx
        .update(contents)
        .set({ status: "review", updatedAt: now })
        .where(eq(contents.id, contentId))
        .returning({ id: contents.id, status: contents.status });
    }

    const workflow: WorkflowSnapshot = {
      content,
      brief: agg.brief,
      hasMaster: agg.hasMaster,
      versions: mergeVersions(agg.versions, [updatedVersion]),
      reviews: mergeReviews(agg.reviews, [resetReviewState(version.id)]),
    };
    return { workflow };
  });
}

/**
 * Re-submit a locally re-edited version: draft → review, with an
 * emptied checklist. Only while the content is in review/scheduled.
 */
export async function submitVersionToReview(contentId: string, platform: string) {
  const brand = await requireSingleBrand();
  return db.transaction(async (tx) => {
    const agg = await loadAggregate(tx, contentId, brand.id);

    if (agg.content.status !== "review" && agg.content.status !== "scheduled") {
      throw new ReviewError(
        "只有内容处于待审核或待发布状态时，版本才能提交审核。",
        409
      );
    }
    const version = agg.versions.find((v) => v.platform === platform);
    if (!version) {
      throw new ReviewError("该平台还没有版本。", 404);
    }
    if (version.status !== "draft") {
      throw new ReviewError(
        `只有草稿版本才能提交审核（当前状态：${versionStatusLabel(version.status)}）。`,
        409
      );
    }

    const now = new Date();
    const [updatedVersion] = await tx
      .update(platformVersions)
      .set({ status: "review", updatedAt: now })
      .where(eq(platformVersions.id, version.id))
      .returning({
        id: platformVersions.id,
        platform: platformVersions.platform,
        status: platformVersions.status,
      });

    const existing = agg.reviews.find((r) => r.platformVersionId === version.id);
    let reviewRow: WorkflowReviewState;
    if (existing) {
      await tx
        .update(contentReviews)
        .set(REVIEW_RESET)
        .where(eq(contentReviews.platformVersionId, version.id));
      reviewRow = resetReviewState(version.id);
    } else {
      const [inserted] = await tx
        .insert(contentReviews)
        .values({ platformVersionId: version.id })
        .returning({
          platformVersionId: contentReviews.platformVersionId,
          factsConfirmed: contentReviews.factsConfirmed,
          titleCoverMatch: contentReviews.titleCoverMatch,
          platformFitConfirmed: contentReviews.platformFitConfirmed,
          riskChecked: contentReviews.riskChecked,
          humanReviewed: contentReviews.humanReviewed,
          reviewerId: contentReviews.reviewerId,
          approvedAt: contentReviews.approvedAt,
        });
      reviewRow = toReviewState(inserted);
    }

    const workflow: WorkflowSnapshot = {
      content: { id: agg.content.id, status: agg.content.status },
      brief: agg.brief,
      hasMaster: agg.hasMaster,
      versions: mergeVersions(agg.versions, [updatedVersion]),
      reviews: mergeReviews(agg.reviews, [reviewRow]),
    };
    return { workflow };
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

  // M2.1: a real Publication is an irreversible business fact. Global
  // upstream editing (and its review invalidation) is forbidden once
  // any platform of this content is actually published.
  const existingPubs = await tx
    .select({ id: publications.id })
    .from(publications)
    .where(and(eq(publications.contentId, content.id), isNull(publications.deletedAt)))
    .limit(1);
  if (existingPubs.length > 0) {
    throw new ReviewError(
      "这条内容已有已发布的平台版本。简报和母稿不能再全局编辑。",
      409
    );
  }

  const now = new Date();
  await tx
    .update(platformVersions)
    .set({ status: "draft", updatedAt: now })
    .where(
      and(
        eq(platformVersions.contentId, content.id),
        inArray(platformVersions.status, ["review", "approved"])
      )
    );
  await tx
    .update(contentReviews)
    .set(REVIEW_RESET)
    .where(
      inArray(
        contentReviews.platformVersionId,
        // sub-select keeps this set-based (no extra round trip)
        sql`(select id from platform_versions where content_id = ${content.id}::uuid)`
      )
    );
  await tx
    .update(contents)
    .set({ status: "in_progress", updatedAt: now })
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
  if (!content) throw new ReviewError("内容不存在", 404);

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
      "请先确认内容简报，再将内容投入制作。",
      409
    );
  }
  return db.transaction(async (tx) => {
    await tx
      .update(contents)
      .set({ status: "in_progress", updatedAt: new Date() })
      .where(eq(contents.id, contentId));
    const agg = await loadAggregate(tx, contentId, brand.id);
    return { workflow: toSnapshot(agg) };
  });
}
