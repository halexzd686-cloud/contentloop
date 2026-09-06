import { describe, it, expect } from "vitest";

import {
  calculateComparison,
  formatDelta,
  selectDefaultTarget,
  parseAnalyticsTarget,
} from "@/lib/metrics/comparison";
import { tryBaseline } from "@/lib/metrics/analytics";

/**
 * M2.5 deterministic comparison engine — pure tests.
 */

describe("calculateComparison", () => {
  it("count: absolute delta with direction", () => {
    const c = calculateComparison(1250, 1000);
    expect(c.absoluteDelta).toBe(250);
    expect(c.relativeDelta).toBeCloseTo(0.25);
    expect(c.direction).toBe("above");
  });

  it("below / equal directions", () => {
    expect(calculateComparison(800, 1000).direction).toBe("below");
    expect(calculateComparison(1000, 1000).direction).toBe("equal");
  });

  it("percentage: internal ratio delta, relative delta computed", () => {
    const c = calculateComparison(0.1, 0.08);
    expect(c.absoluteDelta).toBeCloseTo(0.02);
    expect(c.relativeDelta).toBeCloseTo(0.25);
  });

  it("baseline 0 → relative null, absolute still valid", () => {
    const c = calculateComparison(50, 0);
    expect(c.absoluteDelta).toBe(50);
    expect(c.relativeDelta).toBeNull();
  });

  it("current null or baseline null → all null (N/A never 0)", () => {
    expect(calculateComparison(null, 100).absoluteDelta).toBeNull();
    expect(calculateComparison(100, null).absoluteDelta).toBeNull();
    expect(calculateComparison(null, null).direction).toBeNull();
  });

  it("current real zero compares normally", () => {
    const c = calculateComparison(0, 100);
    expect(c.absoluteDelta).toBe(-100);
    expect(c.direction).toBe("below");
  });

  it("never NaN/Infinity", () => {
    const c = calculateComparison(Number.NaN, 100);
    expect(c.absoluteDelta).toBeNull();
    const c2 = calculateComparison(100, Number.POSITIVE_INFINITY);
    expect(c2.relativeDelta).toBeNull();
    expect(c2.absoluteDelta).toBeNull();
  });
});

describe("formatDelta", () => {
  it("count: signed thousands", () => {
    expect(formatDelta("count", 250)).toBe("+250");
    expect(formatDelta("count", -1250)).toBe("-1,250");
  });

  it("percentage: percentage POINTS — 10% vs 8% → +2.0 pp, NEVER +2.0%", () => {
    expect(formatDelta("percentage", 0.02)).toBe("+2.0 pp");
    expect(formatDelta("percentage", -0.012)).toBe("-1.2 pp");
    expect(formatDelta("percentage", 0.02)).not.toContain("%");
  });

  it("ratio: plain signed units, no ×100", () => {
    expect(formatDelta("ratio", 2.5)).toBe("+2.5");
  });

  it("null → N/A", () => {
    expect(formatDelta("count", null)).toBe("N/A");
  });
});

describe("selectDefaultTarget", () => {
  const P = (
    publicationId: string,
    publishedAt: string,
    has24h: boolean,
    has72h: boolean
  ) => ({ publicationId, publishedAt, has24h, has72h });

  it("latest publication with a snapshot; 72h preferred within it", () => {
    const pubs = [
      P("newer", "2026-08-30T00:00:00Z", true, false), // only 24h
      P("older", "2026-08-20T00:00:00Z", true, true), // has 72h but older
    ];
    // newer publication wins even though older has 72h
    expect(selectDefaultTarget(pubs)).toEqual({
      publicationId: "newer",
      checkpoint: "24h",
    });
  });

  it("within one publication, 72h > 24h", () => {
    const pubs = [P("a", "2026-08-30T00:00:00Z", true, true)];
    expect(selectDefaultTarget(pubs)).toEqual({
      publicationId: "a",
      checkpoint: "72h",
    });
  });

  it("skips publications without snapshots", () => {
    const pubs = [
      P("none", "2026-08-30T00:00:00Z", false, false),
      P("has", "2026-08-20T00:00:00Z", true, false),
    ];
    expect(selectDefaultTarget(pubs)).toEqual({
      publicationId: "has",
      checkpoint: "24h",
    });
  });

  it("no snapshots anywhere → null (no fabricated selection)", () => {
    expect(
      selectDefaultTarget([P("x", "2026-08-30T00:00:00Z", false, false)])
    ).toBeNull();
    expect(selectDefaultTarget([])).toBeNull();
  });
});

// ─── M5.2 G-51: query-driven deep-link target ──────────

describe("parseAnalyticsTarget", () => {
  const P = (
    publicationId: string,
    publishedAt: string,
    has24h: boolean,
    has72h: boolean
  ) => ({ publicationId, publishedAt, has24h, has72h });
  const pubs = [
    P("pub-a", "2026-08-30T00:00:00Z", true, false),
    P("pub-b", "2026-08-28T00:00:00Z", false, false), // no snapshots at all
  ];

  it("valid publication + 24h", () => {
    expect(
      parseAnalyticsTarget("?publication=pub-a&checkpoint=24h", pubs)
    ).toEqual({ publicationId: "pub-a", checkpoint: "24h" });
  });

  it("valid publication + 72h", () => {
    expect(
      parseAnalyticsTarget("?publication=pub-a&checkpoint=72h", pubs)
    ).toEqual({ publicationId: "pub-a", checkpoint: "72h" });
  });

  it("selects even when the requested checkpoint has NO snapshot", () => {
    // due cards usually mean the snapshot is missing — the target must
    // still resolve so the user lands on the exact publication/checkpoint.
    expect(
      parseAnalyticsTarget("?publication=pub-b&checkpoint=24h", pubs)
    ).toEqual({ publicationId: "pub-b", checkpoint: "24h" });
    expect(
      parseAnalyticsTarget("?publication=pub-a&checkpoint=72h", pubs)
    ).toEqual({ publicationId: "pub-a", checkpoint: "72h" }); // pub-a lacks 72h
  });

  it("unknown publication → null (caller falls back to default)", () => {
    expect(
      parseAnalyticsTarget("?publication=deleted&checkpoint=24h", pubs)
    ).toBeNull();
  });

  it("invalid checkpoint → null", () => {
    expect(
      parseAnalyticsTarget("?publication=pub-a&checkpoint=manual", pubs)
    ).toBeNull();
    expect(parseAnalyticsTarget("?publication=pub-a", pubs)).toBeNull();
  });

  it("no query → null (default behavior unchanged)", () => {
    expect(parseAnalyticsTarget("", pubs)).toBeNull();
  });
});

describe("tryBaseline (partial failure boundary)", () => {
  it("success → baseline + no error", async () => {
    const r = await tryBaseline(async () => ({ account: { ok: true }, pillar: null }));
    expect(r.baseline).toEqual({ account: { ok: true }, pillar: null });
    expect(r.baselineError).toBeNull();
  });

  it("failure → null baseline + error message, never throws", async () => {
    const r = await tryBaseline(async () => {
      throw new Error("CONNECTION_CLOSED");
    });
    expect(r.baseline).toBeNull();
    expect(r.baselineError).toBe("CONNECTION_CLOSED");
  });

  it("non-Error throw → fallback message", async () => {
    const r = await tryBaseline(async () => {
      throw "weird";
    });
    expect(r.baseline).toBeNull();
    expect(r.baselineError).toBe("Failed to compute baseline");
  });
});
