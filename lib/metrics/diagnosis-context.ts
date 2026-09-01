import { eq, and } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  contents,
  contentBriefs,
  contentPillars,
  metricDefinitions,
  metricSnapshots,
  platformPlaybooks,
  platformVersions,
  publications,
  signals,
} from "@/lib/db/schema";
import { requireSingleBrand } from "@/lib/brand";
import { ReviewError } from "@/lib/review";
import { getBaselineForSnapshot } from "@/lib/metrics/baseline-service";
import {
  calculateMetric,
  formatMetricValue,
  type MetricDefLike,
} from "@/lib/metrics/engine";
import { formatDelta } from "@/lib/metrics/comparison";
import {
  subjectFingerprint,
  fingerprintOf,
} from "@/lib/metrics/fingerprint";
import type { Checkpoint } from "@/lib/validation/snapshot";
import type { EvidenceRef, ResolvedEvidence } from "@/lib/validation/diagnosis";

/**
 * Diagnosis context — M2.6.
 *
 * Deterministic, bounded AI input (≈2–4k tokens). Everything the model
 * sees is loaded fresh from the server — never trusted from the client.
 * Workspace content is DATA, never instructions.
 */

export interface DiagnosisContext {
  snapshot: {
    id: string;
    checkpoint: Checkpoint;
    capturedAt: string;
    metrics: Record<string, number | null>;
  };
  publication: {
    id: string;
    platform: string;
    finalTitle: string;
    publishedAt: string;
  };
  content: {
    id: string;
    title: string;
    pillarId: string | null;
    pillarName: string | null;
  };
  definitions: (MetricDefLike & {
    label: string;
    format: "count" | "percentage" | "ratio";
  })[];
  metricValues: Record<string, number | null>;
  accountBaseline: Awaited<
    ReturnType<typeof getBaselineForSnapshot>
  >["account"];
  pillarBaseline: Awaited<
    ReturnType<typeof getBaselineForSnapshot>
  >["pillar"];
  publishedVersionData: Record<string, unknown> | null;
  brief: Record<string, string> | null;
  playbook: Record<string, unknown> | null;
  signal: { title: string; summary: string | null; sourceUrl: string | null } | null;
  subjectFp: string;
  contextFp: string;
}

export async function buildDiagnosisContext(
  publicationId: string,
  checkpoint: Checkpoint
): Promise<DiagnosisContext> {
  const brand = await requireSingleBrand();

  const [row] = await db
    .select()
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

  if (!row) {
    throw new ReviewError("Target snapshot not found", 404);
  }
  const snapshot = row.metric_snapshots;
  const publication = row.publications;
  const content = row.contents;

  const [
    pillarRow,
    versionRows,
    briefRows,
    playbookRows,
    signalRows,
    defRows,
    baseline,
  ] = await Promise.all([
    content.pillarId
      ? db.select().from(contentPillars).where(eq(contentPillars.id, content.pillarId))
      : Promise.resolve([]),
    db
      .select()
      .from(platformVersions)
      .where(
        and(
          eq(platformVersions.contentId, content.id),
          eq(platformVersions.platform, publication.platform)
        )
      ),
    db
      .select()
      .from(contentBriefs)
      .where(eq(contentBriefs.contentId, content.id)),
    db
      .select()
      .from(platformPlaybooks)
      .where(
        and(
          eq(platformPlaybooks.brandId, brand.id),
          eq(platformPlaybooks.platform, publication.platform)
        )
      ),
    content.sourceSignalId
      ? db
          .select({
            title: signals.title,
            summary: signals.summary,
            sourceUrl: signals.sourceUrl,
          })
          .from(signals)
          .where(eq(signals.id, content.sourceSignalId))
      : Promise.resolve([]),
    db
      .select()
      .from(metricDefinitions)
      .where(
        and(
          eq(metricDefinitions.brandId, brand.id),
          eq(metricDefinitions.platform, publication.platform),
          eq(metricDefinitions.isActive, true)
        )
      ),
    getBaselineForSnapshot(publicationId, checkpoint),
  ]);

  const publishedVersion = versionRows[0] ?? null;
  const brief = briefRows[0] ?? null;
  const playbook = playbookRows[0] ?? null;
  const signal = signalRows[0] ?? null;
  const pillarName = pillarRow[0]?.name ?? null;

  const metrics = snapshot.metrics as Record<string, number | null>;
  const definitions = defRows.map((d) => ({
    key: d.key,
    type: d.type,
    numeratorKey: d.numeratorKey,
    denominatorKey: d.denominatorKey,
    format: d.format,
    label: d.alias ?? d.displayName,
  }));
  const metricValues: Record<string, number | null> = {};
  for (const d of definitions) {
    metricValues[d.key] =
      d.type === "raw" ? (metrics[d.key] ?? null) : calculateMetric(d, metrics);
  }

  const subjectFp = subjectFingerprint({
    snapshotId: snapshot.id,
    checkpoint,
    capturedAt: snapshot.capturedAt.toISOString(),
    metrics,
    finalTitle: publication.finalTitle,
    pillarId: content.pillarId,
  });

  const contextFp = fingerprintOf({
    subject: subjectFp,
    accountBaseline: baseline.account,
    pillarBaseline: baseline.pillar,
    definitions: definitions.map((d) => ({
      key: d.key,
      numeratorKey: d.numeratorKey,
      denominatorKey: d.denominatorKey,
      format: d.format,
    })),
    publishedVersion: publishedVersion?.data ?? null,
    brief: brief
      ? {
          targetAudience: brief.targetAudience,
          userProblem: brief.userProblem,
          coreQuestion: brief.coreQuestion,
          mainAngle: brief.mainAngle,
          contentPromise: brief.contentPromise,
          keyEvidence: brief.keyEvidence,
          differentiation: brief.differentiation,
          cta: brief.cta,
        }
      : null,
    playbook: playbook
      ? {
          voice: playbook.voice,
          titleStyle: playbook.titleStyle,
          hookStyle: playbook.hookStyle,
          structure: playbook.structure,
          cta: playbook.cta,
          avoid: playbook.avoid,
        }
      : null,
    signal,
  });

  return {
    snapshot: {
      id: snapshot.id,
      checkpoint,
      capturedAt: snapshot.capturedAt.toISOString(),
      metrics,
    },
    publication: {
      id: publication.id,
      platform: publication.platform,
      finalTitle: publication.finalTitle,
      publishedAt: publication.publishedAt.toISOString(),
    },
    content: {
      id: content.id,
      title: content.title,
      pillarId: content.pillarId,
      pillarName,
    },
    definitions,
    metricValues,
    accountBaseline: baseline.account,
    pillarBaseline: baseline.pillar,
    publishedVersionData:
      (publishedVersion?.data as Record<string, unknown> | undefined) ?? null,
    brief: brief
      ? {
          targetAudience: brief.targetAudience,
          userProblem: brief.userProblem,
          coreQuestion: brief.coreQuestion,
          mainAngle: brief.mainAngle,
          contentPromise: brief.contentPromise,
          keyEvidence: brief.keyEvidence,
          differentiation: brief.differentiation,
          cta: brief.cta,
        }
      : null,
    playbook: playbook
      ? {
          voice: playbook.voice,
          titleStyle: playbook.titleStyle,
          hookStyle: playbook.hookStyle,
          structure: playbook.structure,
          cta: playbook.cta,
          avoid: playbook.avoid,
        }
      : null,
    signal,
    subjectFp,
    contextFp,
  };
}

/**
 * Resolve AI-chosen evidence references into server-owned numbers.
 * The model selects WHICH metric/scope; it never authors values.
 * Invalid refs (unknown metric, unavailable pillar baseline, empty
 * comparison) are rejected — the caller triggers a repair or fails.
 */
export function resolveEvidenceRefs(
  refs: EvidenceRef[],
  ctx: DiagnosisContext
): ResolvedEvidence[] {
  return refs.map((ref) => {
    const def = ctx.definitions.find((d) => d.key === ref.metricKey);
    if (!def) {
      throw new ReviewError(
        `Evidence references unknown metric "${ref.metricKey}".`,
        400
      );
    }

    const scopeBaseline =
      ref.baselineScope === "account"
        ? ctx.accountBaseline
        : ctx.pillarBaseline && !("unavailable" in ctx.pillarBaseline)
          ? ctx.pillarBaseline
          : null;
    if (!scopeBaseline) {
      throw new ReviewError(
        `Evidence references unavailable ${ref.baselineScope} baseline.`,
        400
      );
    }
    const bm = scopeBaseline.metrics[ref.metricKey];
    if (!bm || bm.sampleCount === 0 || bm.median === null) {
      throw new ReviewError(
        `Evidence for "${ref.metricKey}" has no valid ${ref.baselineScope} baseline sample.`,
        400
      );
    }

    const current = ctx.metricValues[ref.metricKey] ?? null;
    const absoluteDelta =
      current !== null && bm.median !== null ? current - bm.median : null;

    const scopeLabel = ref.baselineScope === "account" ? "account" : "pillar";
    const comparisonText = `${formatMetricValue(def.format, current)} vs ${scopeLabel} median ${formatMetricValue(def.format, bm.median)} (n=${bm.sampleCount}, ${formatDelta(def.format, absoluteDelta)})`;

    return {
      metricKey: ref.metricKey,
      baselineScope: ref.baselineScope,
      currentValue: current,
      baselineValue: bm.median,
      sampleCount: bm.sampleCount,
      absoluteDelta,
      comparisonText,
    };
  });
}
