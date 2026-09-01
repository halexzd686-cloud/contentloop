import { describe, it, expect } from "vitest";

import {
  calculateMetric,
  formatMetricValue,
  buildFormulaPreview,
  buildCanonicalFormula,
  type MetricDefLike,
} from "@/lib/metrics/engine";
import {
  metricEditSchema,
  derivedCreateSchema,
  generateCustomKey,
} from "@/lib/validation/metric";

/**
 * M2.2 Metric Definition Engine — engine + validation tests.
 * DB-level behavior (dependency validation, active rules, seed
 * idempotency, invariant) is covered by the Supabase smoke test.
 */

const LIKE_RATE: MetricDefLike = {
  key: "like_rate",
  type: "derived",
  numeratorKey: "likes",
  denominatorKey: "views",
  format: "percentage",
};

const BO_ZAN: MetricDefLike = {
  key: "custom_views_per_like",
  type: "derived",
  numeratorKey: "views",
  denominatorKey: "likes",
  format: "ratio",
};

describe("calculateMetric", () => {
  it("raw passthrough", () => {
    expect(
      calculateMetric({ key: "views", type: "raw" }, { views: 12345 })
    ).toBe(12345);
    expect(calculateMetric({ key: "views", type: "raw" }, {})).toBeNull();
  });

  it("derived returns the raw ratio (0.08, not 8)", () => {
    expect(calculateMetric(LIKE_RATE, { views: 1000, likes: 80 })).toBe(0.08);
  });

  it("missing numerator or denominator → null (Missing != Zero)", () => {
    expect(calculateMetric(LIKE_RATE, { views: null, likes: 80 })).toBeNull();
    expect(calculateMetric(LIKE_RATE, { views: 1000, likes: null })).toBeNull();
    expect(calculateMetric(LIKE_RATE, {})).toBeNull();
  });

  it("zero denominator → null (never Infinity)", () => {
    const r = calculateMetric(LIKE_RATE, { views: 0, likes: 80 });
    expect(r).toBeNull();
    expect(Number.isFinite(r ?? 0)).toBe(true);
  });

  it("real zero numerator with positive denominator → 0 (true zero)", () => {
    expect(calculateMetric(LIKE_RATE, { views: 1000, likes: 0 })).toBe(0);
  });

  it("ratio direction is honored (views/likes = 12.5)", () => {
    expect(calculateMetric(BO_ZAN, { views: 1000, likes: 80 })).toBe(12.5);
  });

  it("never returns NaN", () => {
    const r = calculateMetric(LIKE_RATE, { views: Number.NaN, likes: 1 });
    expect(r).toBeNull();
  });
});

describe("formatMetricValue", () => {
  it("null → N/A for every format", () => {
    expect(formatMetricValue("count", null)).toBe("N/A");
    expect(formatMetricValue("percentage", null)).toBe("N/A");
    expect(formatMetricValue("ratio", null)).toBe("N/A");
  });

  it("count: thousands separator", () => {
    expect(formatMetricValue("count", 12345)).toBe("12,345");
  });

  it("percentage: ratio → percent at presentation only", () => {
    expect(formatMetricValue("percentage", 0.08)).toBe("8.0%");
    expect(formatMetricValue("percentage", 0)).toBe("0.0%");
  });

  it("ratio: x : 1", () => {
    expect(formatMetricValue("ratio", 12.5)).toBe("12.5 : 1");
  });
});

describe("formula text", () => {
  const names: Record<string, string> = {
    likes: "点赞",
    views: "播放",
  };
  const lookup = (k: string) => names[k];

  it("canonical formula regenerated from structured config", () => {
    expect(buildCanonicalFormula(LIKE_RATE)).toBe("likes / views * 100");
    expect(buildCanonicalFormula(BO_ZAN)).toBe("views / likes");
    expect(
      buildCanonicalFormula({ key: "views", type: "raw" })
    ).toBeNull();
  });

  it("preview shows direction with human names — jargon cannot hide it", () => {
    expect(buildFormulaPreview(LIKE_RATE, lookup)).toBe("点赞 ÷ 播放 × 100%");
    expect(buildFormulaPreview(BO_ZAN, lookup)).toBe("播放 ÷ 点赞");
    // reversed direction must be visibly reversed
    expect(
      buildFormulaPreview(
        { ...BO_ZAN, numeratorKey: "likes", denominatorKey: "views" },
        lookup
      )
    ).toBe("点赞 ÷ 播放");
  });
});

describe("generateCustomKey", () => {
  it("server-generated, stable, slugged", () => {
    const k1 = generateCustomKey("播赞比 Test", () => "a1b2");
    expect(k1).toBe("custom_test_a1b2");
    const k2 = generateCustomKey("Save Conversion", () => "zz99");
    expect(k2).toBe("custom_save_conversion_zz99");
    // no ASCII slug → fallback base
    expect(generateCustomKey("播赞比", () => "q7q7")).toBe("custom_metric_q7q7");
  });

  it("matches the machine-key format", () => {
    expect(/^[a-z][a-z0-9_]*$/.test(generateCustomKey("My Metric"))).toBe(true);
  });
});

describe("validation schemas", () => {
  it("edit schema rejects immutable identity fields", () => {
    expect(metricEditSchema.safeParse({ key: "views2" }).success).toBe(false);
    expect(metricEditSchema.safeParse({ platform: "douyin" }).success).toBe(false);
    expect(metricEditSchema.safeParse({ type: "derived" }).success).toBe(false);
    expect(metricEditSchema.safeParse({ alias: "播赞比" }).success).toBe(true);
  });

  it("derived create requires raw-style machine keys and valid format", () => {
    const base = {
      platform: "xiaohongshu",
      displayName: "播赞比测试",
      numeratorKey: "views",
      denominatorKey: "likes",
      format: "ratio",
    };
    expect(derivedCreateSchema.safeParse(base).success).toBe(true);
    expect(
      derivedCreateSchema.safeParse({ ...base, numeratorKey: "Views!" }).success
    ).toBe(false);
    expect(
      derivedCreateSchema.safeParse({ ...base, format: "count" }).success
    ).toBe(false);
    expect(
      derivedCreateSchema.safeParse({ ...base, formula: "views/likes" }).success
    ).toBe(false); // formula is server-generated, never client input
  });
});
