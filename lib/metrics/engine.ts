/**
 * Metric calculation engine — M2.2.
 *
 * Pure, deterministic, no DB / no AI / no network.
 *
 * Frozen semantics:
 * - Calculation authority is ONLY type + numeratorKey + denominatorKey
 *   (+ format for presentation). The `formula` text column is
 *   canonical display/audit text, NEVER executed.
 * - Derived result = numerator / denominator (engine always returns
 *   the raw ratio, e.g. 0.08 — presentation turns it into 8.0%).
 * - Missing ≠ Zero: null numerator/denominator → null; denominator
 *   = 0 → null; numerator = 0 with denominator > 0 → real 0.
 *   Never NaN, never Infinity, never premature rounding.
 */

export type MetricFormat = "count" | "percentage" | "ratio";

export interface MetricDefLike {
  key: string;
  type: "raw" | "derived";
  numeratorKey?: string | null;
  denominatorKey?: string | null;
  format?: MetricFormat;
}

export type RawValues = Record<string, number | null>;

/**
 * Calculate one metric value from raw inputs.
 * Returns null when the value cannot be legitimately computed (N/A).
 */
export function calculateMetric(
  def: MetricDefLike,
  rawValues: RawValues
): number | null {
  if (def.type === "raw") {
    const v = rawValues[def.key];
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  }

  if (!def.numeratorKey || !def.denominatorKey) return null;
  const n = rawValues[def.numeratorKey];
  const d = rawValues[def.denominatorKey];
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  if (typeof d !== "number" || !Number.isFinite(d) || d === 0) return null;
  const result = n / d;
  return Number.isFinite(result) ? result : null;
}

/**
 * Presentation formatting. Calculation stays precise; only display
 * rounds. null → "N/A".
 */
export function formatMetricValue(
  format: MetricFormat,
  value: number | null
): string {
  if (value === null) return "N/A";
  switch (format) {
    case "count":
      return Math.round(value).toLocaleString("en-US");
    case "percentage":
      return `${(value * 100).toFixed(1)}%`;
    case "ratio":
      return `${value.toFixed(1)} : 1`;
  }
}

interface NameLookup {
  (machineKey: string): string | undefined;
}

/**
 * Human-readable formula preview — the calculation direction is always
 * visible, so team jargon (播赞比 etc.) can never hide it:
 *   "Likes ÷ Views × 100%"   (percentage)
 *   "Views ÷ Likes"          (ratio)
 */
export function buildFormulaPreview(
  def: MetricDefLike,
  lookup: NameLookup
): string {
  if (def.type !== "derived" || !def.numeratorKey || !def.denominatorKey) {
    return "";
  }
  const num = lookup(def.numeratorKey) ?? def.numeratorKey;
  const den = lookup(def.denominatorKey) ?? def.denominatorKey;
  const base = `${num} ÷ ${den}`;
  return def.format === "percentage" ? `${base} × 100%` : base;
}

/**
 * Canonical formula text (audit/display only — never executed).
 * Regenerated server-side whenever numerator/denominator/format
 * changes, so structured config and formula text cannot drift.
 */
export function buildCanonicalFormula(def: MetricDefLike): string | null {
  if (def.type !== "derived" || !def.numeratorKey || !def.denominatorKey) {
    return null;
  }
  const base = `${def.numeratorKey} / ${def.denominatorKey}`;
  return def.format === "percentage" ? `${base} * 100` : base;
}
