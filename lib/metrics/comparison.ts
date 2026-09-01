import type { MetricFormat } from "@/lib/metrics/engine";

/**
 * Deterministic comparison engine — M2.5.
 *
 * Pure math only: no DB, no AI, no color / quality semantics.
 * "above / below / equal" is a mathematical direction, never a
 * performance judgment (MetricDefinition has no betterDirection).
 *
 * - current null or baseline null → all null (N/A, never 0)
 * - baseline 0 → relativeDelta null (never Infinity)
 * - percentage metrics: absoluteDelta is in RATIO units internally
 *   (0.10 − 0.08 = 0.02) and displayed as percentage POINTS (+2.0 pp),
 *   never as "+2.0%".
 */

export interface Comparison {
  absoluteDelta: number | null;
  relativeDelta: number | null;
  direction: "above" | "below" | "equal" | null;
}

export function calculateComparison(
  current: number | null,
  baseline: number | null
): Comparison {
  if (current === null || baseline === null) {
    return { absoluteDelta: null, relativeDelta: null, direction: null };
  }
  if (!Number.isFinite(current) || !Number.isFinite(baseline)) {
    return { absoluteDelta: null, relativeDelta: null, direction: null };
  }
  const absoluteDelta = current - baseline;
  const relativeDelta =
    baseline === 0 ? null : absoluteDelta / Math.abs(baseline);
  const direction =
    absoluteDelta > 0 ? "above" : absoluteDelta < 0 ? "below" : "equal";
  return {
    absoluteDelta: Number.isFinite(absoluteDelta) ? absoluteDelta : null,
    relativeDelta:
      relativeDelta !== null && Number.isFinite(relativeDelta)
        ? relativeDelta
        : null,
    direction,
  };
}

/**
 * Signed, format-aware delta display. Percentage deltas are percentage
 * POINTS. No quality wording.
 */
export function formatDelta(
  format: MetricFormat,
  absoluteDelta: number | null
): string {
  if (absoluteDelta === null) return "N/A";
  switch (format) {
    case "count": {
      const v = Math.round(absoluteDelta);
      return (v >= 0 ? "+" : "") + v.toLocaleString("en-US");
    }
    case "percentage": {
      const pp = absoluteDelta * 100;
      return `${pp >= 0 ? "+" : ""}${pp.toFixed(1)} pp`;
    }
    case "ratio": {
      return `${absoluteDelta >= 0 ? "+" : ""}${absoluteDelta.toFixed(1)}`;
    }
  }
}

// ─── Default target selection ──────────────────────────

export interface IndexPublication {
  publicationId: string;
  publishedAt: string;
  has24h: boolean;
  has72h: boolean;
}

/**
 * Default selection (frozen):
 * 1. Latest-published publication that has at least one submitted
 *    snapshot.
 * 2. Within it: prefer 72h over 24h.
 * No snapshots anywhere → null (index/empty state; never fabricated).
 */
export function selectDefaultTarget(
  publications: IndexPublication[]
): { publicationId: string; checkpoint: "24h" | "72h" } | null {
  const sorted = [...publications].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
  for (const p of sorted) {
    if (p.has72h) return { publicationId: p.publicationId, checkpoint: "72h" };
    if (p.has24h) return { publicationId: p.publicationId, checkpoint: "24h" };
  }
  return null;
}
