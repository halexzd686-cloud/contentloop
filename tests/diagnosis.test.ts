import { describe, it, expect } from "vitest";

import {
  aiDiagnosisSchema,
  diagnosisSaveSchema,
} from "@/lib/validation/diagnosis";
import {
  canonicalJson,
  fingerprintOf,
  subjectFingerprint,
} from "@/lib/metrics/fingerprint";
import { resolveEvidenceRefs, type DiagnosisContext } from "@/lib/metrics/diagnosis-context";
import { buildWhatHappened } from "@/lib/metrics/what-happened";
import type { ResolvedEvidence } from "@/lib/validation/diagnosis";

/**
 * M2.6 Structured Diagnosis — schema + fingerprint + evidence
 * authority tests. AI/provider behavior is covered by smoke.
 */

const VALID_PROPOSAL = {
  evidenceRefs: [{ metricKey: "like_rate", baselineScope: "account" as const }],
  possibleReasons: ["可能与开头的问题式 hook 有关（假设）。"],
  confidence: "medium" as const,
  nextActions: ["下一条同支柱内容保留问题式开头做对照。"],
};

describe("aiDiagnosisSchema", () => {
  it("accepts a valid structured proposal", () => {
    expect(aiDiagnosisSchema.safeParse(VALID_PROPOSAL).success).toBe(true);
  });

  it("enforces limits: evidence ≤3, reasons ≤2, actions ≤3", () => {
    const tooManyRefs = {
      ...VALID_PROPOSAL,
      evidenceRefs: Array(4).fill(VALID_PROPOSAL.evidenceRefs[0]),
    };
    expect(aiDiagnosisSchema.safeParse(tooManyRefs).success).toBe(false);

    const tooManyReasons = { ...VALID_PROPOSAL, possibleReasons: ["a", "b", "c"] };
    expect(aiDiagnosisSchema.safeParse(tooManyReasons).success).toBe(false);

    const tooManyActions = {
      ...VALID_PROPOSAL,
      nextActions: ["a", "b", "c", "d"],
    };
    expect(aiDiagnosisSchema.safeParse(tooManyActions).success).toBe(false);
  });

  it("rejects pseudo-precise or unknown confidence", () => {
    expect(
      aiDiagnosisSchema.safeParse({ ...VALID_PROPOSAL, confidence: "87%" }).success
    ).toBe(false);
    expect(
      aiDiagnosisSchema.safeParse({ ...VALID_PROPOSAL, confidence: "very high" })
        .success
    ).toBe(false);
  });

  it("rejects unknown fields — AI cannot supply whatHappened prose", () => {
    expect(
      aiDiagnosisSchema.safeParse({ ...VALID_PROPOSAL, summary: "x" }).success
    ).toBe(false);
    expect(
      aiDiagnosisSchema.safeParse({
        ...VALID_PROPOSAL,
        whatHappened: "点赞率 10%，高于基线 8%",
      }).success
    ).toBe(false);
  });

  it("save schema rejects client-supplied whatHappened (server rebuilds it)", () => {
    expect(
      diagnosisSaveSchema.safeParse({
        ...VALID_PROPOSAL,
        whatHappened: "tampered prose with fake 99%",
        proposalContextFingerprint: "abc",
      }).success
    ).toBe(false);
  });

  it("save schema requires the proposal context fingerprint", () => {
    const noFp: Record<string, unknown> = { ...VALID_PROPOSAL };
    expect(diagnosisSaveSchema.safeParse(noFp).success).toBe(false);
    expect(
      diagnosisSaveSchema.safeParse({
        ...VALID_PROPOSAL,
        proposalContextFingerprint: "abc",
      }).success
    ).toBe(true);
  });
});

describe("fingerprints", () => {
  it("JSON key order never changes the fingerprint", () => {
    const a = fingerprintOf({ b: 1, a: [2, 3], c: { y: 1, x: 2 } });
    const b = fingerprintOf({ c: { x: 2, y: 1 }, a: [2, 3], b: 1 });
    expect(a).toBe(b);
    expect(canonicalJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  const base = {
    snapshotId: "s1",
    checkpoint: "24h",
    capturedAt: "2026-08-21T10:05:00.000Z",
    metrics: { views: 1000, likes: 80, saves: null },
    finalTitle: "标题",
    pillarId: "p1",
  };

  it("subject fingerprint reacts to metrics / capturedAt / finalTitle / pillar", () => {
    const fp = subjectFingerprint(base);
    expect(subjectFingerprint({ ...base, metrics: { ...base.metrics, likes: 81 } })).not.toBe(fp);
    expect(subjectFingerprint({ ...base, capturedAt: "2026-08-21T10:06:00.000Z" })).not.toBe(fp);
    expect(subjectFingerprint({ ...base, finalTitle: "改标题" })).not.toBe(fp);
    expect(subjectFingerprint({ ...base, pillarId: "p2" })).not.toBe(fp);
    expect(subjectFingerprint({ ...base, pillarId: null })).not.toBe(fp);
    // identical subject → identical fingerprint
    expect(subjectFingerprint({ ...base })).toBe(fp);
  });
});

describe("resolveEvidenceRefs — evidence authority", () => {
  const ctx = {
    definitions: [
      { key: "views", type: "raw" as const, format: "count" as const, label: "Views" },
      {
        key: "like_rate",
        type: "derived" as const,
        numeratorKey: "likes",
        denominatorKey: "views",
        format: "percentage" as const,
        label: "Like Rate",
      },
    ],
    metricValues: { views: 1000, like_rate: 0.1 },
    accountBaseline: {
      metrics: {
        views: { median: 800, sampleCount: 12 },
        like_rate: { median: 0.08, sampleCount: 12 },
      },
    },
    pillarBaseline: {
      metrics: {
        views: { median: 1200, sampleCount: 4 },
        like_rate: { median: 0.12, sampleCount: 4 },
      },
    },
  } as unknown as DiagnosisContext;

  it("server resolves all numbers; model refs carry none", () => {
    const out = resolveEvidenceRefs(
      [{ metricKey: "like_rate", baselineScope: "account" }],
      ctx
    );
    expect(out[0].currentValue).toBeCloseTo(0.1);
    expect(out[0].baselineValue).toBeCloseTo(0.08);
    expect(out[0].sampleCount).toBe(12);
    expect(out[0].absoluteDelta).toBeCloseTo(0.02);
    expect(out[0].comparisonText).toContain("10.0%");
    expect(out[0].comparisonText).toContain("n=12");
    expect(out[0].comparisonText).toContain("+2.0 pp");
  });

  it("account/pillar disagreement stays separate", () => {
    const out = resolveEvidenceRefs(
      [
        { metricKey: "like_rate", baselineScope: "account" },
        { metricKey: "like_rate", baselineScope: "pillar" },
      ],
      ctx
    );
    expect(out[0].baselineValue).toBeCloseTo(0.08);
    expect(out[1].baselineValue).toBeCloseTo(0.12);
  });

  it("unknown metric rejected", () => {
    expect(() =>
      resolveEvidenceRefs([{ metricKey: "hack", baselineScope: "account" }], ctx)
    ).toThrow();
  });

  it("unavailable pillar baseline rejected", () => {
    const noPillar = { ...ctx, pillarBaseline: { unavailable: "target_has_no_pillar" } } as unknown as DiagnosisContext;
    expect(() =>
      resolveEvidenceRefs([{ metricKey: "views", baselineScope: "pillar" }], noPillar)
    ).toThrow();
  });

  it("zero-sample baseline rejected", () => {
    const zeroN = {
      ...ctx,
      accountBaseline: { metrics: { views: { median: null, sampleCount: 0 } } },
    } as unknown as DiagnosisContext;
    expect(() =>
      resolveEvidenceRefs([{ metricKey: "views", baselineScope: "account" }], zeroN)
    ).toThrow();
  });
});

describe("buildWhatHappened — canonical summary", () => {
  const ev = (over: Partial<ResolvedEvidence> & { label: string; format: "count" | "percentage" | "ratio" }): ResolvedEvidence & { label: string; format: "count" | "percentage" | "ratio" } => ({
    metricKey: over.label,
    baselineScope: "account",
    currentValue: null,
    baselineValue: null,
    sampleCount: null,
    absoluteDelta: null,
    comparisonText: "",
    ...over,
  });

  it("percentage: 10% vs 8% → +2.0 pp (never +2%)", () => {
    const t = buildWhatHappened(
      [ev({ label: "点赞率", format: "percentage", currentValue: 0.1, baselineValue: 0.08, sampleCount: 12, absoluteDelta: 0.02 })],
      "24h"
    );
    expect(t).toContain("点赞率为 10.0%");
    expect(t).toContain("高于账号历史中位数 8.0%");
    expect(t).toContain("+2.0 pp");
    expect(t).toContain("n=12");
    expect(t).not.toContain("+2.0%");
    expect(t).toMatch(/^24h /);
  });

  it("count: 1250 vs 1000 → +250", () => {
    const t = buildWhatHappened(
      [ev({ label: "播放/阅读", format: "count", currentValue: 1250, baselineValue: 1000, sampleCount: 10, absoluteDelta: 250 })],
      "24h"
    );
    expect(t).toContain("1,250");
    expect(t).toContain("+250");
  });

  it("ratio: 12.5 vs 10 → +2.5, no percentage", () => {
    const t = buildWhatHappened(
      [ev({ label: "播赞比", format: "ratio", currentValue: 12.5, baselineValue: 10, sampleCount: 5, absoluteDelta: 2.5 })],
      "72h"
    );
    expect(t).toContain("12.5 : 1");
    expect(t).toContain("+2.5");
    expect(t).not.toContain("%");
  });

  it("below direction is 低于", () => {
    const t = buildWhatHappened(
      [ev({ label: "Views", format: "count", currentValue: 800, baselineValue: 1000, sampleCount: 9, absoluteDelta: -200 })],
      "24h"
    );
    expect(t).toContain("低于");
    expect(t).toContain("-200");
  });

  it("account/pillar disagreement preserved in one summary", () => {
    const t = buildWhatHappened(
      [
        ev({ label: "点赞率", format: "percentage", baselineScope: "account", currentValue: 0.1, baselineValue: 0.08, sampleCount: 12, absoluteDelta: 0.02 }),
        ev({ label: "点赞率", format: "percentage", baselineScope: "pillar", currentValue: 0.1, baselineValue: 0.12, sampleCount: 4, absoluteDelta: -0.02 }),
      ],
      "24h"
    );
    expect(t).toContain("高于账号历史中位数 8.0%");
    expect(t).toContain("低于同 Pillar 历史中位数 12.0%");
    expect(t).not.toMatch(/表现|优秀/);
  });

  it("no evidence → explicit no-baseline statement, nothing fabricated", () => {
    const t = buildWhatHappened([], "24h");
    expect(t).toContain("暂无足够历史可比样本");
  });

  it("summary and evidence can never disagree: same inputs drive both", () => {
    const evidence = [ev({ label: "点赞率", format: "percentage", currentValue: 0.1, baselineValue: 0.08, sampleCount: 12, absoluteDelta: 0.02 })];
    const t = buildWhatHappened(evidence, "24h");
    expect(t).toContain("10.0%");
    expect(t).toContain("8.0%");
  });
});
