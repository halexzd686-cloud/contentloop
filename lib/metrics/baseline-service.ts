import { eq, and, desc, isNull, lt } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  contents,
  metricDefinitions,
  metricSnapshots,
  publications,
} from "@/lib/db/schema";
import { requireSingleBrand } from "@/lib/brand";
import { ReviewError } from "@/lib/review";
import {
  buildMetricBaseline,
  BASELINE_WINDOW,
  type BaselineCandidate,
  type BaselineResult,
} from "@/lib/metrics/baseline";
import type { Checkpoint } from "@/lib/validation/snapshot";
import type { MetricDefLike } from "@/lib/metrics/engine";

/**
 * Baseline domain service — M2.4.
 *
 * Runtime derived read model: NO baseline persistence, NO writes.
 *
 * - "Account Baseline" scope = Brand + Platform (V1 has no
 *   PlatformAccount entity; no schema expansion).
 * - Account and Pillar windows are INDEPENDENT last-20 queries —
 *   the pillar cohort is never derived from the account window.
 * - Historical = candidate.publishedAt < target.publishedAt (strict).
 *   Recency = publishedAt DESC, createdAt DESC, id DESC (deterministic
 *   tie-break). Late entry never reorders history.
 * - V1 limitation: pillar baseline uses the Content's CURRENT pillar
 *   assignment, not the pillar at publish time.
 */

export interface BaselineScopeResult extends BaselineResult {
  scope: "account" | "pillar";
  platform: string;
  checkpoint: string;
  pillarId: string | null;
  maxWindow: number;
}

async function loadCandidates(
  brandId: string,
  platform: string,
  checkpoint: Checkpoint,
  targetPublishedAt: Date,
  pillarId: string | null
): Promise<BaselineCandidate[]> {
  const rows = await db
    .select({
      publishedAt: publications.publishedAt,
      capturedAt: metricSnapshots.capturedAt,
      metrics: metricSnapshots.metrics,
    })
    .from(metricSnapshots)
    .innerJoin(
      publications,
      eq(metricSnapshots.publicationId, publications.id)
    )
    .innerJoin(contents, eq(publications.contentId, contents.id))
    .where(
      and(
        eq(contents.brandId, brandId),
        eq(publications.platform, platform as never),
        eq(metricSnapshots.checkpoint, checkpoint),
        lt(publications.publishedAt, targetPublishedAt),
        isNull(contents.deletedAt),
        isNull(publications.deletedAt),
        ...(pillarId ? [eq(contents.pillarId, pillarId)] : [])
      )
    )
    .orderBy(
      desc(publications.publishedAt),
      desc(publications.createdAt),
      desc(publications.id)
    )
    .limit(BASELINE_WINDOW);

  return rows.map((r) => ({
    publishedAt: r.publishedAt,
    capturedAt: r.capturedAt,
    metrics: r.metrics as Record<string, number | null>,
  }));
}

export async function getBaselineForSnapshot(
  publicationId: string,
  checkpoint: Checkpoint
) {
  const brand = await requireSingleBrand();

  // Target context (one round trip).
  const [target] = await db
    .select({
      snapshotId: metricSnapshots.id,
      publishedAt: publications.publishedAt,
      platform: publications.platform,
      pillarId: contents.pillarId,
    })
    .from(metricSnapshots)
    .innerJoin(
      publications,
      eq(metricSnapshots.publicationId, publications.id)
    )
    .innerJoin(contents, eq(publications.contentId, contents.id))
    .where(
      and(
        eq(metricSnapshots.publicationId, publicationId),
        eq(metricSnapshots.checkpoint, checkpoint),
        eq(contents.brandId, brand.id)
      )
    );

  if (!target) {
    throw new ReviewError("Target snapshot not found", 404);
  }

  // Independent queries, run in parallel (no N+1).
  const [accountCandidates, pillarCandidates, defs] = await Promise.all([
    loadCandidates(brand.id, target.platform, checkpoint, target.publishedAt, null),
    target.pillarId
      ? loadCandidates(
          brand.id,
          target.platform,
          checkpoint,
          target.publishedAt,
          target.pillarId
        )
      : Promise.resolve(null),
    db
      .select()
      .from(metricDefinitions)
      .where(
        and(
          eq(metricDefinitions.brandId, brand.id),
          eq(metricDefinitions.platform, target.platform),
          eq(metricDefinitions.isActive, true)
        )
      ),
  ]);

  const activeDefs: MetricDefLike[] = defs.map((d) => ({
    key: d.key,
    type: d.type,
    numeratorKey: d.numeratorKey,
    denominatorKey: d.denominatorKey,
    format: d.format,
  }));

  const account: BaselineScopeResult = {
    scope: "account",
    platform: target.platform,
    checkpoint,
    pillarId: null,
    maxWindow: BASELINE_WINDOW,
    ...buildMetricBaseline(accountCandidates, activeDefs, checkpoint),
  };

  const pillar: BaselineScopeResult | { unavailable: string } | null =
    !target.pillarId
      ? { unavailable: "target_has_no_pillar" }
      : {
          scope: "pillar",
          platform: target.platform,
          checkpoint,
          pillarId: target.pillarId,
          maxWindow: BASELINE_WINDOW,
          ...buildMetricBaseline(pillarCandidates ?? [], activeDefs, checkpoint),
        };

  return {
    target: {
      publicationId,
      checkpoint,
      platform: target.platform,
      pillarId: target.pillarId,
      publishedAt: target.publishedAt.toISOString(),
    },
    account,
    pillar,
  };
}
