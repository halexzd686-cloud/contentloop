import { eq, and, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  contents,
  metricDefinitions,
  metricSnapshots,
  publications,
  testPublications,
  tests,
} from "@/lib/db/schema";
import { requireSingleBrand } from "@/lib/brand";
import { ReviewError } from "@/lib/review";
import { calculateMetric, type MetricDefLike } from "@/lib/metrics/engine";
import { getBaselineForSnapshot } from "@/lib/metrics/baseline-service";
import { tryBaseline } from "@/lib/metrics/analytics";
import { captureDeltaMinutes } from "@/lib/metrics/baseline";
import { fingerprintOf } from "@/lib/metrics/fingerprint";
import {
  computeReadiness,
  isOutcomeAllowed,
  type ResultAvailability,
  type ConcludeTestInput,
} from "@/lib/validation/test-result";
import type { Checkpoint } from "@/lib/validation/snapshot";

/**
 * M3.2 — Observed Result & Conclude.
 *
 * Server owns every number. Complete = one transaction that freezes
 * resultEvidence + resultFingerprint + outcome + conclusion. Two
 * fingerprint semantics, deliberately separate:
 * - previewFingerprint (runtime, covers EVERYTHING the human saw,
 *   including current baseline context) → preview→conclude drift = 409
 * - resultFingerprint (persisted; definition + membership + subjects
 *   only — baseline drift must NEVER stale a concluded result)
 */

export interface BaselineCell {
  available: boolean;
  reason: string | null;
  median: number | null;
  sampleCount: number;
}

export interface ResultRow {
  publicationId: string;
  role: string;
  finalTitle: string;
  pillarId: string | null;
  availability: ResultAvailability;
  snapshotId: string | null;
  capturedAt: string | null;
  captureDeltaMinutes: number | null;
  value: number | null;
  accountBaseline: BaselineCell;
  pillarBaseline: BaselineCell;
}

interface Subject {
  publicationId: string;
  role: string;
  finalTitle: string;
  pillarId: string | null;
  publishedAt: string;
  snapshotId: string | null;
  capturedAt: string | null;
  metrics: Record<string, number | null> | null;
}

const UNAVAILABLE = (reason: string): BaselineCell => ({
  available: false,
  reason,
  median: null,
  sampleCount: 0,
});

async function loadTestContext(testId: string, brandId: string) {
  const [test] = await db
    .select()
    .from(tests)
    .where(and(eq(tests.id, testId), eq(tests.brandId, brandId)));
  if (!test) throw new ReviewError("Test not found", 404);

  // MetricDefinition resolves even if later disabled (tests must stay
  // readable; definitions are never deleted).
  const [def] = await db
    .select()
    .from(metricDefinitions)
    .where(
      and(
        eq(metricDefinitions.brandId, brandId),
        eq(metricDefinitions.platform, test.platform),
        eq(metricDefinitions.key, test.primaryMetricKey)
      )
    );
  if (!def) {
    throw new ReviewError(
      `Metric "${test.primaryMetricKey}" no longer exists for ${test.platform}.`,
      500
    );
  }

  const links = await db
    .select()
    .from(testPublications)
    .where(eq(testPublications.testId, test.id));

  const subjects: Subject[] = [];
  for (const link of links) {
    const [pub] = await db
      .select()
      .from(publications)
      .where(
        and(eq(publications.id, link.publicationId), isNull(publications.deletedAt))
      );
    if (!pub) continue;
    const [content] = await db
      .select({ pillarId: contents.pillarId })
      .from(contents)
      .where(eq(contents.id, pub.contentId));
    const [snap] = await db
      .select()
      .from(metricSnapshots)
      .where(
        and(
          eq(metricSnapshots.publicationId, pub.id),
          eq(metricSnapshots.checkpoint, test.checkpoint)
        )
      );
    subjects.push({
      publicationId: pub.id,
      role: link.role,
      finalTitle: pub.finalTitle,
      pillarId: content?.pillarId ?? null,
      publishedAt: pub.publishedAt.toISOString(),
      snapshotId: snap?.id ?? null,
      capturedAt: snap ? snap.capturedAt.toISOString() : null,
      metrics: snap ? (snap.metrics as Record<string, number | null>) : null,
    });
  }
  return { test, def, subjects };
}

function primaryValue(
  def: MetricDefLike,
  metrics: Record<string, number | null> | null
): number | null {
  if (!metrics) return null;
  return def.type === "raw" ? (metrics[def.key] ?? null) : calculateMetric(def, metrics);
}

function subjectsFingerprint(
  test: { id: string; platform: string; checkpoint: string; method: string; primaryMetricKey: string },
  subjects: Subject[]
): string {
  const sorted = [...subjects].sort((a, b) =>
    a.publicationId.localeCompare(b.publicationId)
  );
  return fingerprintOf({
    test: {
      id: test.id,
      platform: test.platform,
      checkpoint: test.checkpoint,
      method: test.method,
      primaryMetricKey: test.primaryMetricKey,
    },
    membership: sorted.map((s) => ({
      publicationId: s.publicationId,
      role: s.role,
      finalTitle: s.finalTitle,
      pillarId: s.pillarId,
      snapshotId: s.snapshotId,
      capturedAt: s.capturedAt,
      metrics: s.metrics,
    })),
  });
}

/** Get primary-metric baseline cell for a publication's snapshot. */
async function baselineCells(
  publicationId: string,
  checkpoint: Checkpoint,
  metricKey: string
): Promise<{ account: BaselineCell; pillar: BaselineCell; error: string | null }> {
  const r = await tryBaseline(() =>
    getBaselineForSnapshot(publicationId, checkpoint)
  );
  if (!r.baseline) {
    return { account: UNAVAILABLE("baseline_read_failed"), pillar: UNAVAILABLE("baseline_read_failed"), error: r.baselineError };
  }
  const b = r.baseline;
  const acc = b.account.metrics[metricKey];
  const account: BaselineCell =
    acc && acc.sampleCount > 0 && acc.median !== null
      ? { available: true, reason: null, median: acc.median, sampleCount: acc.sampleCount }
      : UNAVAILABLE("no comparable samples");
  let pillar: BaselineCell;
  if (b.pillar && "unavailable" in b.pillar) {
    pillar = UNAVAILABLE(b.pillar.unavailable);
  } else if (b.pillar) {
    const p = b.pillar.metrics[metricKey];
    pillar =
      p && p.sampleCount > 0 && p.median !== null
        ? { available: true, reason: null, median: p.median, sampleCount: p.sampleCount }
        : UNAVAILABLE("no comparable samples");
  } else {
    pillar = UNAVAILABLE("no pillar");
  }
  return { account, pillar, error: null };
}

/** Runtime observed result for a running test. */
export async function getTestResult(testId: string) {
  const brand = await requireSingleBrand();
  const { test, def, subjects } = await loadTestContext(testId, brand.id);

  const rows: ResultRow[] = [];
  let baselineError: string | null = null;

  for (const s of subjects) {
    const value = primaryValue(def, s.metrics);
    const availability: ResultAvailability = !s.snapshotId
      ? "awaiting"
      : value === null
        ? "metric_unavailable"
        : "available";

    let accountBaseline = UNAVAILABLE("no snapshot");
    let pillarBaseline = UNAVAILABLE("no snapshot");
    if (s.snapshotId) {
      const cells = await baselineCells(
        s.publicationId,
        test.checkpoint as Checkpoint,
        test.primaryMetricKey
      );
      if (cells.error) baselineError = cells.error;
      accountBaseline = cells.account;
      pillarBaseline = cells.pillar;
    }

    rows.push({
      publicationId: s.publicationId,
      role: s.role,
      finalTitle: s.finalTitle,
      pillarId: s.pillarId,
      availability,
      snapshotId: s.snapshotId,
      capturedAt: s.capturedAt,
      captureDeltaMinutes:
        s.snapshotId && s.capturedAt
          ? captureDeltaMinutes(
              {
                publishedAt: s.publishedAt,
                capturedAt: s.capturedAt,
                metrics: {},
              },
              test.checkpoint as Checkpoint
            )
          : null,
      value,
      accountBaseline,
      pillarBaseline,
    });
  }

  const { readiness, observedCount } = computeReadiness(rows);

  // Preview fingerprint covers EVERYTHING the human sees — including
  // current baseline context. Drift between review and conclude → 409.
  const previewFingerprint = fingerprintOf({
    subject: subjectsFingerprint(test, subjects),
    rows: rows.map((r) => ({
      publicationId: r.publicationId,
      availability: r.availability,
      value: r.value,
      account: r.accountBaseline,
      pillar: r.pillarBaseline,
      capturedAt: r.capturedAt,
    })),
    baselineError,
  });

  return {
    test,
    primaryMetric: { key: def.key, format: def.format, label: def.alias ?? def.displayName },
    rows,
    readiness,
    observedCount,
    previewFingerprint,
    baselineError,
    subjects,
  };
}

/** Concluded read: frozen evidence first, plus derived staleness. */
export async function getConcludedResult(testId: string) {
  const brand = await requireSingleBrand();
  const { test, subjects } = await loadTestContext(testId, brand.id);
  if (test.status !== "concluded") {
    throw new ReviewError("Test has not concluded.", 409);
  }
  const evidence = test.resultEvidence as {
    primaryMetric?: { key: string; format: "count" | "percentage" | "ratio"; label: string };
  } | null;
  const currentFp = subjectsFingerprint(test, subjects);
  return {
    test,
    // Frozen evidence carries its own primary metric definition so the
    // concluded view renders without any runtime recomputation.
    primaryMetric: evidence?.primaryMetric ?? null,
    evidence: test.resultEvidence,
    outcome: test.outcome,
    conclusion: test.conclusion,
    concludedAt: test.concludedAt,
    resultStale: test.resultFingerprint !== currentFp,
  };
}

export async function concludeTest(testId: string, input: ConcludeTestInput) {
  const brand = await requireSingleBrand();

  // Rebuild the authoritative result (never trust the client preview).
  const runtime = await getTestResult(testId);
  if (runtime.previewFingerprint !== input.previewFingerprint) {
    throw new ReviewError(
      "Observed result changed. Review the latest result before concluding.",
      409
    );
  }
  if (runtime.baselineError) {
    throw new ReviewError(
      "Baseline context could not be read. Retry when the connection recovers.",
      409
    );
  }
  if (!runtime.readiness.canConclude) {
    throw new ReviewError(
      `Test is not ready to conclude: ${runtime.readiness.reasons.join(" ")}`,
      409
    );
  }
  if (!isOutcomeAllowed(input.outcome, runtime.readiness)) {
    throw new ReviewError(
      "Evidence is insufficient for a directional outcome — only No Clear Result is allowed.",
      409
    );
  }

  const evidence = {
    version: 1,
    platform: runtime.test.platform,
    checkpoint: runtime.test.checkpoint,
    primaryMetric: runtime.primaryMetric,
    publications: runtime.rows.map((r) => ({
      publicationId: r.publicationId,
      role: r.role,
      finalTitle: r.finalTitle,
      pillarId: r.pillarId,
      availability: r.availability,
      snapshotId: r.snapshotId,
      capturedAt: r.capturedAt,
      captureDeltaMinutes: r.captureDeltaMinutes,
      value: r.value,
      accountBaseline: r.accountBaseline,
      pillarBaseline: r.pillarBaseline,
    })),
  };

  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(tests)
      .where(and(eq(tests.id, testId), eq(tests.brandId, brand.id)));
    if (!current) throw new ReviewError("Test not found", 404);
    if (current.status !== "running") {
      throw new ReviewError("Test has already concluded.", 409);
    }

    const now = new Date();
    // Saved fingerprint: definition + membership + subjects (with raw
    // metrics). Baseline context deliberately excluded — later drift
    // must never stale a concluded result.
    const resultFingerprint = subjectsFingerprint(current, runtime.subjects);

    const [updated] = await tx
      .update(tests)
      .set({
        status: "concluded",
        outcome: input.outcome,
        conclusion: input.conclusion,
        concludedAt: now,
        resultEvidence: evidence,
        resultFingerprint,
      })
      .where(eq(tests.id, testId))
      .returning();

    return { test: updated };
  });
}
