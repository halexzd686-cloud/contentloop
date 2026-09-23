import { calculateMetric, type MetricDefLike } from "@/lib/metrics/engine";
import {
  CHECKPOINT_OFFSET_MS,
  type Checkpoint,
} from "@/lib/validation/snapshot";

/**
 * Baseline engine — M2.4. Pure, deterministic, no DB / no network /
 * no AI / no presentation rounding.
 *
 * Frozen semantics:
 * - Window = last 20 comparable SNAPSHOTS (not 20 non-null values per
 *   metric). Metric-wise null exclusion happens inside the window.
 * - Derived baseline: calculate per snapshot FIRST, then median of the
 *   per-snapshot results. Never median(numerator) / median(denominator).
 * - null never participates; real 0 always does; zero valid samples
 *   → median null. Never NaN / Infinity.
 */

export const BASELINE_WINDOW = 20;

export interface BaselineCandidate {
  publishedAt: string | Date;
  capturedAt: string | Date;
  metrics: Record<string, number | null>;
}

/** Median over valid numbers: odd → middle, even → mean of the middle two. */
export function median(values: number[]): number | null {
  const valid = values.filter((v) => Number.isFinite(v));
  if (valid.length === 0) return null;
  const sorted = [...valid].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const result =
    sorted.length % 2 === 1
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  return Number.isFinite(result) ? result : null;
}

/**
 * Minutes between the checkpoint target and the actual capture.
 * manual has no target — the delta is measured from publishedAt.
 */
export function captureDeltaMinutes(
  candidate: BaselineCandidate,
  checkpoint: Checkpoint
): number {
  const offset =
    checkpoint === "manual" ? 0 : CHECKPOINT_OFFSET_MS[checkpoint];
  const dueAt = new Date(candidate.publishedAt).getTime() + offset;
  return (new Date(candidate.capturedAt).getTime() - dueAt) / 60000;
}

export interface MetricBaseline {
  median: number | null;
  sampleCount: number;
}

export interface BaselineResult {
  candidateCount: number;
  medianCaptureDeltaMinutes: number | null;
  metrics: Record<string, MetricBaseline>;
}

/**
 * Metric-wise baseline over the given candidate window.
 * Only the supplied definitions are evaluated (caller passes the
 * currently ACTIVE raw + derived set for the platform).
 */
export function buildMetricBaseline(
  candidates: BaselineCandidate[],
  definitions: MetricDefLike[],
  checkpoint: Checkpoint
): BaselineResult {
  const deltas = candidates.map((c) => captureDeltaMinutes(c, checkpoint));

  const metrics: Record<string, MetricBaseline> = {};
  for (const def of definitions) {
    const values: number[] = [];
    for (const c of candidates) {
      const v =
        def.type === "raw"
          ? (c.metrics[def.key] ?? null)
          : calculateMetric(def, c.metrics);
      // null / missing keys / non-finite → not a sample; real 0 stays.
      if (typeof v === "number" && Number.isFinite(v)) values.push(v);
    }
    metrics[def.key] = { median: median(values), sampleCount: values.length };
  }

  return {
    candidateCount: candidates.length,
    medianCaptureDeltaMinutes: median(deltas),
    metrics,
  };
}
