import { eq, and, desc, isNull, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  contents,
  contentPillars,
  metricDefinitions,
  metricSnapshots,
  publications,
} from "@/lib/db/schema";
import { requireSingleBrand } from "@/lib/brand";
import { ReviewError } from "@/lib/review";
import {
  calculateMetric,
  buildFormulaPreview,
  type MetricDefLike,
} from "@/lib/metrics/engine";
import { getBaselineForSnapshot } from "@/lib/metrics/baseline-service";
import { captureDeltaMinutes } from "@/lib/metrics/baseline";
import { buildObservations } from "@/lib/metrics/observations";
import {
  checkpointDueAt,
  checkpointStatus,
  TIMED_CHECKPOINTS,
  type Checkpoint,
} from "@/lib/validation/snapshot";
import { subjectFingerprint } from "@/lib/metrics/fingerprint";
import { getDiagnosis } from "@/lib/metrics/diagnosis";

/**
 * Partial-failure boundary (M2.5 frozen): a baseline failure NEVER
 * destroys the fact payload. Returns baselineError instead of throwing.
 */
export async function tryBaseline<T>(
  fn: () => Promise<T>
): Promise<{ baseline: T | null; baselineError: string | null }> {
  try {
    return { baseline: await fn(), baselineError: null };
  } catch (err) {
    return {
      baseline: null,
      baselineError: err instanceof Error ? err.message : "Failed to compute baseline",
    };
  }
}

/**
 * Analytics read service — M2.5.
 *
 * Fact → Baseline → Deterministic Comparison. Read-only, no AI, no
 * persistence. Fact and baseline are SEPARATE failure boundaries:
 * a baseline failure never destroys the fact payload.
 */

// ─── Index ─────────────────────────────────────────────

export async function getAnalyticsIndex() {
  const brand = await requireSingleBrand();

  const rows = await db
    .select({
      publicationId: publications.id,
      finalTitle: publications.finalTitle,
      platform: publications.platform,
      publishedAt: publications.publishedAt,
      contentId: contents.id,
      contentTitle: contents.title,
      pillarName: contentPillars.name,
      isDemo: contents.isDemo,
    })
    .from(publications)
    .innerJoin(contents, eq(publications.contentId, contents.id))
    .leftJoin(contentPillars, eq(contents.pillarId, contentPillars.id))
    .where(
      and(eq(contents.brandId, brand.id), isNull(publications.deletedAt))
    )
    .orderBy(desc(publications.publishedAt));

  if (rows.length === 0) return { publications: [] };

  const snaps = await db
    .select({
      publicationId: metricSnapshots.publicationId,
      checkpoint: metricSnapshots.checkpoint,
    })
    .from(metricSnapshots)
    .where(
      inArray(
        metricSnapshots.publicationId,
        rows.map((r) => r.publicationId)
      )
    );
  const snapSet = new Set(snaps.map((s) => `${s.publicationId}:${s.checkpoint}`));

  return {
    publications: rows.map((r) => ({
      contentId: r.contentId,
      contentTitle: r.contentTitle,
      publicationId: r.publicationId,
      finalTitle: r.finalTitle,
      platform: r.platform,
      pillarName: r.pillarName,
      publishedAt: r.publishedAt.toISOString(),
      isDemo: r.isDemo,
      has24h: snapSet.has(`${r.publicationId}:24h`),
      has72h: snapSet.has(`${r.publicationId}:72h`),
      hasManual: snapSet.has(`${r.publicationId}:manual`),
      // Due tracking is timed-only; manual observations have no schedule.
      checkpoints: TIMED_CHECKPOINTS.map((c) => ({
        checkpoint: c,
        status: checkpointStatus(
          r.publishedAt,
          c,
          snapSet.has(`${r.publicationId}:${c}`)
        ),
        // M4.2: dueAt from the authoritative read layer (checkpointDueAt);
        // clients display/sort only, never recompute publishedAt + offset.
        dueAt: checkpointDueAt(r.publishedAt, c).toISOString(),
      })),
    })),
  };
}

// ─── Detail ────────────────────────────────────────────

export interface AnalyticsMetricValue {
  key: string;
  label: string;
  type: "raw" | "derived";
  format: "count" | "percentage" | "ratio";
  value: number | null;
  formulaPreview: string | null;
}

export async function getAnalyticsDetail(
  publicationId: string,
  checkpoint: Checkpoint
) {
  const brand = await requireSingleBrand();

  const [target] = await db
    .select({
      publicationId: publications.id,
      finalTitle: publications.finalTitle,
      platform: publications.platform,
      publishedAt: publications.publishedAt,
      url: publications.url,
      contentId: contents.id,
      contentTitle: contents.title,
      isDemo: contents.isDemo, // M4.4: demo provenance (read-model only)
      pillarId: contents.pillarId,
      pillarName: contentPillars.name,
      snapshotId: metricSnapshots.id,
      capturedAt: metricSnapshots.capturedAt,
      metrics: metricSnapshots.metrics,
    })
    .from(publications)
    .innerJoin(contents, eq(publications.contentId, contents.id))
    .leftJoin(contentPillars, eq(contents.pillarId, contentPillars.id))
    .leftJoin(
      metricSnapshots,
      and(
        eq(metricSnapshots.publicationId, publications.id),
        eq(metricSnapshots.checkpoint, checkpoint)
      )
    )
    .where(
      and(
        eq(publications.id, publicationId),
        eq(contents.brandId, brand.id),
        isNull(publications.deletedAt)
      )
    );

  if (!target) throw new ReviewError("Publication not found", 404);

  const defs = await db
    .select()
    .from(metricDefinitions)
    .where(
      and(
        eq(metricDefinitions.brandId, brand.id),
        eq(metricDefinitions.platform, target.platform),
        eq(metricDefinitions.isActive, true)
      )
    );

  const rawValues = (target.metrics ?? {}) as Record<string, number | null>;
  const nameOf = (key: string) => {
    const d = defs.find((x) => x.key === key);
    return d ? (d.alias ?? d.displayName) : key;
  };

  const defLikes: (MetricDefLike & { format: "count" | "percentage" | "ratio" })[] =
    defs.map((d) => ({
      key: d.key,
      type: d.type,
      numeratorKey: d.numeratorKey,
      denominatorKey: d.denominatorKey,
      format: d.format,
    }));

  const metrics: AnalyticsMetricValue[] = defLikes.map((d) => ({
    key: d.key,
    label: nameOf(d.key),
    type: d.type,
    format: d.format,
    value: target.snapshotId
      ? d.type === "raw"
        ? (rawValues[d.key] ?? null)
        : calculateMetric(d, rawValues)
      : null,
    formulaPreview: d.type === "derived" ? buildFormulaPreview(d, nameOf) : null,
  }));

  const fact = {
    publicationId: target.publicationId,
    contentId: target.contentId,
    contentTitle: target.contentTitle,
    isDemo: target.isDemo,
    finalTitle: target.finalTitle,
    platform: target.platform,
    pillarName: target.pillarName,
    checkpoint,
    publishedAt: target.publishedAt.toISOString(),
    url: target.url,
    targetAt:
      checkpoint === "manual"
        ? null
        : checkpointDueAt(target.publishedAt, checkpoint).toISOString(),
    snapshot: target.snapshotId
      ? {
          id: target.snapshotId,
          publicationId: target.publicationId,
          checkpoint,
          capturedAt: target.capturedAt!.toISOString(),
          metrics: rawValues,
          source: "manual",
          createdAt: "",
        }
      : null,
    capturedAt: target.capturedAt ? target.capturedAt.toISOString() : null,
    captureDeltaMinutes: target.capturedAt
      ? captureDeltaMinutes(
          { publishedAt: target.publishedAt, capturedAt: target.capturedAt, metrics: {} },
          checkpoint
        )
      : null,
    hasSnapshot: !!target.snapshotId,
    metrics,
  };

  // Baseline is a SEPARATE failure boundary — fact survives.
  let accountBaseline = null;
  let pillarBaseline = null;
  let baselineError: string | null = null;
  if (target.snapshotId) {
    const b = await tryBaseline(() =>
      getBaselineForSnapshot(publicationId, checkpoint)
    );
    if (b.baseline) {
      accountBaseline = b.baseline.account;
      pillarBaseline = b.baseline.pillar;
    } else {
      baselineError = b.baselineError;
    }
  }

  // Saved diagnosis + deterministic staleness (fingerprint compare).
  let diagnosis = null;
  let diagnosisStale = false;
  if (target.snapshotId) {
    diagnosis = await getDiagnosis(target.snapshotId);
    if (diagnosis) {
      const currentFp = subjectFingerprint({
        snapshotId: target.snapshotId,
        checkpoint,
        capturedAt: target.capturedAt!.toISOString(),
        metrics: rawValues,
        finalTitle: target.finalTitle,
        pillarId: target.pillarId,
      });
      diagnosisStale = diagnosis.subjectFingerprint !== currentFp;
    }
  }

  // Key observations: deterministic rules over fact × account baseline.
  // Same failure boundary as the baseline — a baseline error (or no
  // baseline cohort) yields an empty array, never destroys the fact.
  const observations =
    baselineError || !accountBaseline
      ? []
      : buildObservations(metrics, accountBaseline);

  return {
    fact,
    accountBaseline,
    pillarBaseline,
    baselineError,
    observations,
    diagnosis,
    diagnosisStale,
  };
}
