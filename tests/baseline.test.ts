import { describe, it, expect } from "vitest";

import {
  median,
  buildMetricBaseline,
  captureDeltaMinutes,
  type BaselineCandidate,
} from "@/lib/metrics/baseline";
import type { MetricDefLike } from "@/lib/metrics/engine";

/**
 * M2.4 Baseline engine — pure-function tests.
 * Query-level comparability (brand/platform/checkpoint/historical
 * cutoff, independent windows, tie-break) is verified by the Supabase
 * smoke test with DEMO fixtures.
 */

const RAW_VIEWS: MetricDefLike = { key: "views", type: "raw" };
const RAW_LIKES: MetricDefLike = { key: "likes", type: "raw" };
const RAW_SAVES: MetricDefLike = { key: "saves", type: "raw" };
const LIKE_RATE: MetricDefLike = {
  key: "like_rate",
  type: "derived",
  numeratorKey: "likes",
  denominatorKey: "views",
  format: "percentage",
};

function cand(
  metrics: Record<string, number | null>,
  publishedAt = "2026-08-01T10:00:00.000Z",
  capturedAt = "2026-08-02T10:05:00.000Z"
): BaselineCandidate {
  return { publishedAt, capturedAt, metrics };
}

describe("median", () => {
  it("odd → middle value", () => {
    expect(median([1, 3, 5])).toBe(3);
  });
  it("even → mean of middle two", () => {
    expect(median([1, 3, 5, 7])).toBe(4);
  });
  it("single value", () => {
    expect(median([7])).toBe(7);
  });
  it("empty → null", () => {
    expect(median([])).toBeNull();
  });
  it("real zero participates", () => {
    expect(median([0, 10, 20])).toBe(10);
  });
  it("non-finite values are excluded, never NaN/Infinity out", () => {
    expect(median([1, Number.NaN, 3, Number.POSITIVE_INFINITY])).toBe(2);
    expect(median([Number.NaN])).toBeNull();
  });
});

describe("buildMetricBaseline", () => {
  it("raw baseline: metric-wise null exclusion, zero included", () => {
    const candidates = [
      cand({ views: 1000, likes: 100, saves: 10 }),
      cand({ views: 2000, likes: 200, saves: null }), // saves N/A → excluded for saves only
      cand({ views: 3000, likes: 0, saves: 30 }), // real zero likes participates
    ];
    const r = buildMetricBaseline(
      candidates,
      [RAW_VIEWS, RAW_LIKES, RAW_SAVES],
      "24h"
    );
    expect(r.candidateCount).toBe(3);
    expect(r.metrics.views).toEqual({ median: 2000, sampleCount: 3 });
    expect(r.metrics.likes).toEqual({ median: 100, sampleCount: 3 });
    expect(r.metrics.saves).toEqual({ median: 20, sampleCount: 2 });
  });

  it("derived baseline: per-snapshot rates first, then median — NOT median(likes)/median(views)", () => {
    // rates: 100/1000=0.1, 200/2000=0.1, 10/100=0.1 → median 0.1
    // wrong impl: median(likes)=100 / median(views)=1000 → also 0.1.
    // Use asymmetric data where the two approaches differ:
    const candidates = [
      cand({ views: 1000, likes: 10 }), // 0.01
      cand({ views: 100, likes: 90 }), // 0.9
      cand({ views: 500, likes: 100 }), // 0.2
    ];
    const r = buildMetricBaseline(candidates, [LIKE_RATE], "24h");
    // correct: median([0.01, 0.9, 0.2]) = 0.2
    expect(r.metrics.like_rate.median).toBeCloseTo(0.2);
    // wrong impl would give median(likes)=100 / median(views)=500 = 0.2 — same
    // here; tighten with a divergent set:
    const divergent = [
      cand({ views: 1000, likes: 10 }), // 0.01
      cand({ views: 10, likes: 9 }), // 0.9
    ];
    const r2 = buildMetricBaseline(divergent, [LIKE_RATE], "24h");
    // correct: median([0.01, 0.9]) = 0.455
    expect(r2.metrics.like_rate.median).toBeCloseTo(0.455);
    // wrong impl: median(likes)=9.5 / median(views)=505 ≈ 0.0188
    expect(r2.metrics.like_rate.median).not.toBeCloseTo(9.5 / 505);
  });

  it("derived: zero/missing denominator excludes only that metric", () => {
    const candidates = [
      cand({ views: 1000, likes: 80 }),
      cand({ views: 0, likes: 50 }), // denominator 0 → derived null
      cand({ views: null, likes: 10 }), // missing → derived null
    ];
    const r = buildMetricBaseline(
      candidates,
      [RAW_VIEWS, LIKE_RATE],
      "24h"
    );
    expect(r.metrics.views.sampleCount).toBe(2); // 1000 and real 0
    expect(r.metrics.like_rate.sampleCount).toBe(1);
    expect(r.metrics.like_rate.median).toBeCloseTo(0.08);
  });

  it("zero valid samples → median null, never fake 0", () => {
    const r = buildMetricBaseline(
      [cand({ views: null }), cand({ views: null })],
      [RAW_VIEWS, LIKE_RATE],
      "24h"
    );
    expect(r.metrics.views.median).toBeNull();
    expect(r.metrics.like_rate.median).toBeNull();
  });

  it("custom derived applies to historical raw keys; missing dependency → null", () => {
    const custom: MetricDefLike = {
      key: "custom_views_per_like",
      type: "derived",
      numeratorKey: "views",
      denominatorKey: "likes",
      format: "ratio",
    };
    const candidates = [
      cand({ views: 1000, likes: 80 }), // 12.5
      cand({ views: 500 }), // likes key missing → null, excluded
    ];
    const r = buildMetricBaseline(candidates, [custom], "24h");
    expect(r.metrics.custom_views_per_like).toEqual({
      median: 12.5,
      sampleCount: 1,
    });
  });

  it("capture provenance: medianCaptureDeltaMinutes preserved, no exclusion", () => {
    const candidates = [
      cand({ views: 100 }, "2026-08-01T10:00:00.000Z", "2026-08-02T10:05:00.000Z"), // +5min
      cand({ views: 200 }, "2026-08-01T10:00:00.000Z", "2026-08-03T10:00:00.000Z"), // +1440min (late capture kept)
    ];
    const r = buildMetricBaseline(candidates, [RAW_VIEWS], "24h");
    expect(r.medianCaptureDeltaMinutes).toBeCloseTo(722.5);
    expect(r.metrics.views.sampleCount).toBe(2);
  });
});

describe("captureDeltaMinutes", () => {
  it("computes capturedAt − dueAt in minutes", () => {
    const d = captureDeltaMinutes(
      cand({}, "2026-08-01T10:00:00.000Z", "2026-08-02T10:30:00.000Z"),
      "24h"
    );
    expect(d).toBeCloseTo(30);
  });

  it("manual has no target — delta is measured from publishedAt (M8 B2)", () => {
    const d = captureDeltaMinutes(
      cand({}, "2026-08-01T10:00:00.000Z", "2026-08-03T16:00:00.000Z"),
      "manual"
    );
    expect(d).toBeCloseTo(54 * 60);
  });
});
