import { z } from "zod";

/**
 * M3.2 Result & Conclude validation (data-model §23, PRD §12.4–12.5).
 *
 * Client submits ONLY outcome + conclusion + previewFingerprint.
 * Evidence, metric values, baselines, fingerprints, timestamps and
 * status are 100% server-owned.
 */

export const TEST_OUTCOMES = [
  "win",
  "loss",
  "trade_off",
  "no_clear_result",
] as const;

export const concludeTestSchema = z
  .object({
    outcome: z.enum(TEST_OUTCOMES),
    conclusion: z.string().trim().min(1).max(2000),
    previewFingerprint: z.string().trim().min(1).max(100),
  })
  .strict();

export type ConcludeTestInput = z.infer<typeof concludeTestSchema>;

export type ResultAvailability =
  | "available"
  | "awaiting"
  | "metric_unavailable";

export interface Readiness {
  canConclude: boolean;
  forcedOutcome: "no_clear_result" | null;
  reasons: string[];
}

/**
 * Deterministic readiness matrix (frozen M3.2):
 * - 0 publications → blocked (no test object at all)
 * - 0 observed → blocked (no observation; No Clear Result requires
 *   SOME observation)
 * - observed = 1 → conclude allowed, no_clear_result only
 * - observed ≥2 but any awaiting / metric_unavailable →
 *   no_clear_result only
 * - observed ≥2 and all available → all four outcomes
 *
 * observedCount<2 is a minimal STRUCTURAL comparison requirement —
 * not a statistical significance rule.
 */
export function computeReadiness(rows: { availability: ResultAvailability }[]): {
  readiness: Readiness;
  observedCount: number;
} {
  if (rows.length === 0) {
    return {
      readiness: {
        canConclude: false,
        forcedOutcome: null,
        reasons: ["Attach publications to observe results."],
      },
      observedCount: 0,
    };
  }

  const observedCount = rows.filter((r) => r.availability === "available").length;
  const awaiting = rows.filter((r) => r.availability === "awaiting").length;
  const metricUnavailable = rows.filter(
    (r) => r.availability === "metric_unavailable"
  ).length;

  if (observedCount === 0) {
    return {
      readiness: {
        canConclude: false,
        forcedOutcome: null,
        reasons: ["No checkpoint data yet — wait for snapshots."],
      },
      observedCount,
    };
  }

  if (observedCount === 1) {
    return {
      readiness: {
        canConclude: true,
        forcedOutcome: "no_clear_result",
        reasons: [
          "Only one observed publication — a single observation cannot support a directional outcome.",
        ],
      },
      observedCount,
    };
  }

  if (awaiting > 0 || metricUnavailable > 0) {
    return {
      readiness: {
        canConclude: true,
        forcedOutcome: "no_clear_result",
        reasons: [
          `${awaiting + metricUnavailable} publication(s) missing data — outcome is limited to No Clear Result.`,
        ],
      },
      observedCount,
    };
  }

  return {
    readiness: { canConclude: true, forcedOutcome: null, reasons: [] },
    observedCount,
  };
}

/** Outcome enforcement at conclude time (server authority). */
export function isOutcomeAllowed(
  outcome: string,
  readiness: Readiness
): boolean {
  if (!readiness.canConclude) return false;
  if (readiness.forcedOutcome === "no_clear_result") {
    return outcome === "no_clear_result";
  }
  return (TEST_OUTCOMES as readonly string[]).includes(outcome);
}
