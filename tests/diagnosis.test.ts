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

/**
 * M2.6 Structured Diagnosis — schema + fingerprint + evidence
 * authority tests. AI/provider behavior is covered by smoke.
 */

const VALID_PROPOSAL = {
  whatHappened: "24h 点赞率高于账号中位数。",
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

  it("rejects unknown fields and empty whatHappened", () => {
    expect(
      aiDiagnosisSchema.safeParse({ ...VALID_PROPOSAL, summary: "x" }).success
    ).toBe(false);
    expect(
      aiDiagnosisSchema.safeParse({ ...VALID_PROPOSAL, whatHappened: " " }).success
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
