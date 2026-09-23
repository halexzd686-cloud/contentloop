import { describe, it, expect } from "vitest";

import {
  buildObservations,
  OBSERVATION_ABOVE_RATIO,
  OBSERVATION_BELOW_RATIO,
} from "@/lib/metrics/observations";
import type { BaselineResult } from "@/lib/metrics/baseline";

/**
 * Key observations — pure rule layer. Deterministic thresholds only;
 * no AI, no fabrication when the baseline is missing.
 */

function baseline(
  metrics: Record<string, { median: number | null; sampleCount: number }>,
  candidateCount = 5
): BaselineResult {
  return { candidateCount, medianCaptureDeltaMinutes: null, metrics };
}

describe("buildObservations — thresholds", () => {
  it("ratio exactly 2.0 → above", () => {
    const r = buildObservations(
      [{ key: "views", label: "播放", value: 200 }],
      baseline({ views: { median: 100, sampleCount: 5 } })
    );
    expect(r).toEqual([
      {
        key: "views",
        label: "播放",
        kind: "above",
        ratio: 2,
        value: 200,
        baselineMedian: 100,
      },
    ]);
  });

  it("ratio exactly 0.5 → below", () => {
    const r = buildObservations(
      [{ key: "views", label: "播放", value: 50 }],
      baseline({ views: { median: 100, sampleCount: 5 } })
    );
    expect(r).toHaveLength(1);
    expect(r[0].kind).toBe("below");
    expect(r[0].ratio).toBe(0.5);
  });

  it("just inside the band (1.99 / 0.51) → no observation, no noise", () => {
    const r = buildObservations(
      [
        { key: "a", label: "A", value: 199 },
        { key: "b", label: "B", value: 51 },
      ],
      baseline({
        a: { median: 100, sampleCount: 5 },
        b: { median: 100, sampleCount: 5 },
      })
    );
    expect(r).toEqual([]);
  });

  it("threshold constants stay at 2 / 0.5", () => {
    expect(OBSERVATION_ABOVE_RATIO).toBe(2);
    expect(OBSERVATION_BELOW_RATIO).toBe(0.5);
  });
});

describe("buildObservations — median = 0", () => {
  it("median 0 with value > 0 → above without a ratio multiplier", () => {
    const r = buildObservations(
      [{ key: "comments", label: "评论", value: 12 }],
      baseline({ comments: { median: 0, sampleCount: 3 } })
    );
    expect(r).toEqual([
      {
        key: "comments",
        label: "评论",
        kind: "above",
        ratio: null,
        value: 12,
        baselineMedian: 0,
      },
    ]);
  });

  it("median 0 with value 0 → no observation (0/0 is not a signal)", () => {
    const r = buildObservations(
      [{ key: "comments", label: "评论", value: 0 }],
      baseline({ comments: { median: 0, sampleCount: 3 } })
    );
    expect(r).toEqual([]);
  });
});

describe("buildObservations — missing data never fakes a signal", () => {
  it("null current value → skipped", () => {
    const r = buildObservations(
      [{ key: "views", label: "播放", value: null }],
      baseline({ views: { median: 100, sampleCount: 5 } })
    );
    expect(r).toEqual([]);
  });

  it("null baseline median → skipped", () => {
    const r = buildObservations(
      [{ key: "views", label: "播放", value: 500 }],
      baseline({ views: { median: null, sampleCount: 0 } })
    );
    expect(r).toEqual([]);
  });

  it("sampleCount 0 with a median present → skipped", () => {
    const r = buildObservations(
      [{ key: "views", label: "播放", value: 500 }],
      baseline({ views: { median: 100, sampleCount: 0 } })
    );
    expect(r).toEqual([]);
  });

  it("metric absent from the baseline scope → skipped", () => {
    const r = buildObservations(
      [{ key: "saves", label: "收藏", value: 500 }],
      baseline({ views: { median: 100, sampleCount: 5 } })
    );
    expect(r).toEqual([]);
  });

  it("no baseline at all → empty array", () => {
    expect(
      buildObservations([{ key: "views", label: "播放", value: 500 }], null)
    ).toEqual([]);
  });

  it("zero baseline candidates → empty array", () => {
    const r = buildObservations(
      [{ key: "views", label: "播放", value: 500 }],
      baseline({ views: { median: 100, sampleCount: 5 } }, 0)
    );
    expect(r).toEqual([]);
  });
});

describe("buildObservations — ordering", () => {
  it("above first by ratio desc (median-0 leads), then below by ratio asc", () => {
    const r = buildObservations(
      [
        { key: "a", label: "A", value: 300 }, // ratio 3
        { key: "b", label: "B", value: 40 }, // ratio 0.4
        { key: "c", label: "C", value: 1000 }, // ratio 10
        { key: "d", label: "D", value: 7 }, // median 0, value > 0
        { key: "e", label: "E", value: 20 }, // ratio 0.2
        { key: "f", label: "F", value: 100 }, // ratio 1 → no observation
      ],
      baseline({
        a: { median: 100, sampleCount: 5 },
        b: { median: 100, sampleCount: 5 },
        c: { median: 100, sampleCount: 5 },
        d: { median: 0, sampleCount: 3 },
        e: { median: 100, sampleCount: 5 },
        f: { median: 100, sampleCount: 5 },
      })
    );
    expect(r.map((o) => o.key)).toEqual(["d", "c", "a", "e", "b"]);
    expect(r.map((o) => o.kind)).toEqual([
      "above",
      "above",
      "above",
      "below",
      "below",
    ]);
  });
});
