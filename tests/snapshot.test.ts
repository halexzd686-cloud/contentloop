import { describe, it, expect } from "vitest";

import {
  snapshotUpsertSchema,
  isCheckpoint,
  checkpointDueAt,
  checkpointStatus,
  isCaptureOnTime,
  parseCountText,
} from "@/lib/validation/snapshot";

/**
 * M2.3 MetricSnapshot — validation + timing tests.
 * DB behavior (exact key sets, duplicate 409, edit shape, definition
 * lock) is covered by the Supabase smoke test.
 */

const PUBLISHED = "2026-08-20T10:00:00.000Z";

function ok(metrics: Record<string, number | null>, capturedAt: string) {
  return snapshotUpsertSchema.safeParse({ metrics, capturedAt });
}

describe("snapshotUpsertSchema", () => {
  const CAPTURED = "2026-08-21T10:05:00.000Z";

  it("accepts numbers, explicit null (N/A) and real zero", () => {
    const r = ok({ views: 1000, likes: 80, saves: null, comments: 0 }, CAPTURED);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.metrics.saves).toBeNull(); // N/A stays null, never 0
      expect(r.data.metrics.comments).toBe(0); // real zero preserved
    }
  });

  it("rejects negative / decimal / NaN / Infinity / strings", () => {
    for (const bad of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, "100"]) {
      expect(ok({ views: bad as never }, CAPTURED).success).toBe(false);
    }
  });

  it("requires capturedAt and rejects garbage", () => {
    expect(ok({ views: 1 }, "").success).toBe(false);
    expect(ok({ views: 1 }, "yesterday").success).toBe(false);
  });

  it("rejects identity fields (strict)", () => {
    const r = snapshotUpsertSchema.safeParse({
      metrics: { views: 1 },
      capturedAt: CAPTURED,
      source: "csv",
    });
    expect(r.success).toBe(false);
  });
});

describe("checkpoint model", () => {
  it("only 24h / 72h are open in M2.3 (manual rejected)", () => {
    expect(isCheckpoint("24h")).toBe(true);
    expect(isCheckpoint("72h")).toBe(true);
    expect(isCheckpoint("manual")).toBe(false);
    expect(isCheckpoint("1h")).toBe(false);
  });

  it("dueAt derives from publishedAt", () => {
    expect(checkpointDueAt(PUBLISHED, "24h").toISOString()).toBe(
      "2026-08-21T10:00:00.000Z"
    );
    expect(checkpointDueAt(PUBLISHED, "72h").toISOString()).toBe(
      "2026-08-23T10:00:00.000Z"
    );
  });

  it("status derivation: submitted / not_due / due (no arbitrary overdue threshold)", () => {
    const before = new Date("2026-08-21T09:00:00.000Z");
    const after = new Date("2026-08-21T11:00:00.000Z");
    const wayAfter = new Date("2026-09-15T00:00:00.000Z");
    expect(checkpointStatus(PUBLISHED, "24h", true, before)).toBe("submitted");
    expect(checkpointStatus(PUBLISHED, "24h", false, before)).toBe("not_due");
    expect(checkpointStatus(PUBLISHED, "24h", false, after)).toBe("due");
    expect(checkpointStatus(PUBLISHED, "24h", false, wayAfter)).toBe("due");
  });

  it("capture timing gate uses capturedAt, not submission time", () => {
    // captured 5 minutes after target — on time
    expect(
      isCaptureOnTime(PUBLISHED, "24h", "2026-08-21T10:05:00.000Z")
    ).toBe(true);
    // captured within tolerance before target — allowed
    expect(
      isCaptureOnTime(PUBLISHED, "24h", "2026-08-21T09:57:00.000Z")
    ).toBe(true);
    // clearly before target — rejected
    expect(
      isCaptureOnTime(PUBLISHED, "24h", "2026-08-21T09:00:00.000Z")
    ).toBe(false);
    // 72h: a capture that satisfies 24h does not satisfy 72h
    expect(
      isCaptureOnTime(PUBLISHED, "72h", "2026-08-21T10:05:00.000Z")
    ).toBe(false);
    expect(
      isCaptureOnTime(PUBLISHED, "72h", "2026-08-23T10:30:00.000Z")
    ).toBe(true);
  });
});

// ─── M5.3A D01: thousands separators in manual entry ────

describe("parseCountText (M5.3A D01)", () => {
  it("accepts standard thousands separators", () => {
    expect(parseCountText("18,600")).toEqual({ kind: "number", value: 18600 });
    expect(parseCountText("1,230")).toEqual({ kind: "number", value: 1230 });
    expect(parseCountText("1,234,567")).toEqual({ kind: "number", value: 1234567 });
  });

  it("plain integers and real zero unchanged", () => {
    expect(parseCountText("980")).toEqual({ kind: "number", value: 980 });
    expect(parseCountText("0")).toEqual({ kind: "number", value: 0 });
    expect(parseCountText("  91  ")).toEqual({ kind: "number", value: 91 });
  });

  it("blank is unresolved, not invalid", () => {
    expect(parseCountText("")).toEqual({ kind: "blank" });
    expect(parseCountText("   ")).toEqual({ kind: "blank" });
  });

  it("malformed grouping / negatives / decimals rejected", () => {
    for (const bad of ["1,2,3", "12,34", ",123", "123,", "-1", "1.5", "abc", "1,2a3"]) {
      expect(parseCountText(bad)).toEqual({ kind: "invalid" });
    }
  });
});
