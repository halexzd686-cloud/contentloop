import { describe, it, expect } from "vitest";

import { formatMetricValue } from "@/lib/metrics/engine";
import {
  computeReadiness,
  isOutcomeAllowed,
  concludeTestSchema,
  type ResultAvailability,
} from "@/lib/validation/test-result";

/**
 * M3.2 readiness matrix + conclude contract — pure tests.
 * Fingerprint/transaction behavior is covered by the Supabase smoke.
 */

function rows(...avs: ResultAvailability[]) {
  return avs.map((availability) => ({ availability }));
}

describe("computeReadiness (frozen matrix)", () => {
  it("0 publications → blocked (no test object at all)", () => {
    const { readiness, observedCount } = computeReadiness([]);
    expect(readiness.canConclude).toBe(false);
    expect(readiness.forcedOutcome).toBeNull();
    expect(observedCount).toBe(0);
    expect(readiness.reasons[0]).toContain("关联");
  });

  it("all awaiting (0 observed) → blocked; NOT no_clear_result", () => {
    const { readiness } = computeReadiness(rows("awaiting", "awaiting"));
    expect(readiness.canConclude).toBe(false);
    expect(readiness.forcedOutcome).toBeNull();
  });

  it("1 observed → conclude allowed but only no_clear_result", () => {
    const { readiness, observedCount } = computeReadiness(rows("available"));
    expect(readiness.canConclude).toBe(true);
    expect(readiness.forcedOutcome).toBe("no_clear_result");
    expect(observedCount).toBe(1);
  });

  it("2 observed + 1 awaiting → only no_clear_result", () => {
    const { readiness } = computeReadiness(
      rows("available", "available", "awaiting")
    );
    expect(readiness.canConclude).toBe(true);
    expect(readiness.forcedOutcome).toBe("no_clear_result");
  });

  it("2 observed + 1 metric_unavailable → only no_clear_result", () => {
    const { readiness } = computeReadiness(
      rows("available", "available", "metric_unavailable")
    );
    expect(readiness.forcedOutcome).toBe("no_clear_result");
  });

  it("2+ observed, all available → all four outcomes", () => {
    const { readiness } = computeReadiness(rows("available", "available"));
    expect(readiness.canConclude).toBe(true);
    expect(readiness.forcedOutcome).toBeNull();
  });
});

describe("isOutcomeAllowed (server authority)", () => {
  it("enforces no_clear_result when readiness requires it", () => {
    const forced = {
      canConclude: true,
      forcedOutcome: "no_clear_result" as const,
      reasons: [],
    };
    expect(isOutcomeAllowed("no_clear_result", forced)).toBe(true);
    expect(isOutcomeAllowed("win", forced)).toBe(false);
    expect(isOutcomeAllowed("loss", forced)).toBe(false);
    expect(isOutcomeAllowed("trade_off", forced)).toBe(false);
  });

  it("free readiness allows all four", () => {
    const free = { canConclude: true, forcedOutcome: null, reasons: [] };
    for (const o of ["win", "loss", "trade_off", "no_clear_result"]) {
      expect(isOutcomeAllowed(o, free)).toBe(true);
    }
  });

  it("blocked readiness allows nothing", () => {
    const blocked = {
      canConclude: false,
      forcedOutcome: null,
      reasons: ["Attach publications to observe results."],
    };
    expect(isOutcomeAllowed("no_clear_result", blocked)).toBe(false);
  });

  it("unknown outcome rejected even when free", () => {
    const free = { canConclude: true, forcedOutcome: null, reasons: [] };
    expect(isOutcomeAllowed("significant_win", free)).toBe(false);
  });
});

describe("concludeTestSchema", () => {
  const VALID = {
    outcome: "win",
    conclusion: "观察到 B 的点赞率更高。",
    previewFingerprint: "abc123",
  };

  it("accepts outcome + conclusion + previewFingerprint only", () => {
    expect(concludeTestSchema.safeParse(VALID).success).toBe(true);
  });

  it("rejects server-owned fields (evidence / values / status / fingerprints)", () => {
    for (const key of [
      "resultEvidence",
      "resultFingerprint",
      "status",
      "concludedAt",
      "value",
      "snapshotId",
    ]) {
      expect(
        concludeTestSchema.safeParse({ ...VALID, [key]: "tamper" }).success
      ).toBe(false);
    }
  });

  it("conclusion required non-empty, max 2000", () => {
    expect(
      concludeTestSchema.safeParse({ ...VALID, conclusion: " " }).success
    ).toBe(false);
    expect(
      concludeTestSchema.safeParse({ ...VALID, conclusion: "x".repeat(2001) })
        .success
    ).toBe(false);
  });

  it("rejects unknown outcomes", () => {
    expect(
      concludeTestSchema.safeParse({ ...VALID, outcome: "significant" }).success
    ).toBe(false);
  });
});

describe("result baseline formatting (shared formatter, one format per metric)", () => {
  it("percentage: current and medians all formatted as percentage", () => {
    expect(formatMetricValue("percentage", 0.1)).toBe("10.0%");
    expect(formatMetricValue("percentage", 0.05)).toBe("5.0%");
    expect(formatMetricValue("percentage", 0.065)).toBe("6.5%");
  });

  it("count: medians use count formatting", () => {
    expect(formatMetricValue("count", 1250)).toBe("1,250");
  });

  it("ratio: medians use ratio formatting", () => {
    expect(formatMetricValue("ratio", 12.5)).toBe("12.5 : 1");
  });

  it("real zero stays 0, never N/A", () => {
    expect(formatMetricValue("percentage", 0)).toBe("0.0%");
    expect(formatMetricValue("count", 0)).toBe("0");
  });

  it("null / unavailable → N/A", () => {
    expect(formatMetricValue("percentage", null)).toBe("N/A");
    expect(formatMetricValue("count", null)).toBe("N/A");
  });
});
