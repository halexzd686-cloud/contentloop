import type { BaselineResult } from "@/lib/metrics/baseline";

/**
 * Key observations — deterministic rule layer for the Analytics
 * detail page. Pure, no DB / no AI / no network.
 *
 * Frozen rules:
 * - Only metrics with a non-null current value AND a non-null baseline
 *   median from at least one sample participate.
 * - ratio = value / baselineMedian.
 *   ratio ≥ 2   → "above" (显著高于基线)
 *   ratio ≤ 0.5 → "below"
 *   between     → no observation (no noise).
 * - median = 0 with value > 0 → "above" with ratio = null (the UI must
 *   not print a multiplier; a ratio against zero is meaningless).
 * - No baseline at all (null scope or zero candidates) → empty array.
 * - Ordering: above first by ratio descending (median = 0 entries lead,
 *   their deviation is unbounded), then below by ratio ascending.
 */

export const OBSERVATION_ABOVE_RATIO = 2;
export const OBSERVATION_BELOW_RATIO = 0.5;

export interface ObservationMetricInput {
  key: string;
  label: string;
  value: number | null;
}

export interface Observation {
  key: string;
  label: string;
  kind: "above" | "below";
  /** value / baselineMedian; null when baselineMedian = 0. */
  ratio: number | null;
  value: number;
  baselineMedian: number;
}

export function buildObservations(
  metrics: ObservationMetricInput[],
  baseline: BaselineResult | null
): Observation[] {
  if (!baseline || baseline.candidateCount === 0) return [];

  const above: Observation[] = [];
  const below: Observation[] = [];

  for (const m of metrics) {
    if (m.value === null || !Number.isFinite(m.value)) continue;
    const b = baseline.metrics[m.key];
    if (!b || b.sampleCount < 1) continue;
    if (b.median === null || !Number.isFinite(b.median)) continue;

    if (b.median === 0) {
      if (m.value > 0) {
        above.push({
          key: m.key,
          label: m.label,
          kind: "above",
          ratio: null,
          value: m.value,
          baselineMedian: 0,
        });
      }
      continue;
    }

    const ratio = m.value / b.median;
    if (!Number.isFinite(ratio)) continue;

    if (ratio >= OBSERVATION_ABOVE_RATIO) {
      above.push({
        key: m.key,
        label: m.label,
        kind: "above",
        ratio,
        value: m.value,
        baselineMedian: b.median,
      });
    } else if (ratio <= OBSERVATION_BELOW_RATIO) {
      below.push({
        key: m.key,
        label: m.label,
        kind: "below",
        ratio,
        value: m.value,
        baselineMedian: b.median,
      });
    }
  }

  above.sort(
    (a, b) =>
      (b.ratio ?? Number.POSITIVE_INFINITY) - (a.ratio ?? Number.POSITIVE_INFINITY)
  );
  below.sort((a, b) => a.ratio! - b.ratio!);

  return [...above, ...below];
}
