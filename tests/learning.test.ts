import { describe, it, expect } from "vitest";

import {
  buildLearningEvidenceSummary,
  defaultPillarId,
} from "@/lib/learnings";
import {
  learningSaveSchema,
  learningPatchSchema,
  aiLearningDraftSchema,
} from "@/lib/validation/learning";

/**
 * M3.3 Learning — evidence summary authority + schema tests.
 * DB lifecycle covered by the Supabase smoke test.
 */

const CONCLUDED_TEST = {
  id: "t1",
  title: "XHS Hook Comparison",
  platform: "xiaohongshu",
  checkpoint: "24h",
  primaryMetricKey: "like_rate",
  outcome: "no_clear_result",
  conclusion: "Only two samples; keep observing.",
  resultEvidence: {
    version: 1,
    platform: "xiaohongshu",
    checkpoint: "24h",
    primaryMetric: { key: "like_rate", format: "percentage", label: "点赞率" },
    publications: [
      {
        publicationId: "p1",
        role: "comparison",
        finalTitle: "Claude A",
        pillarId: "pl1",
        availability: "available",
        value: 0.1,
        accountBaseline: { available: true, median: 0.08, sampleCount: 12 },
        pillarBaseline: { available: true, median: 0.09, sampleCount: 4 },
      },
      {
        publicationId: "p2",
        role: "comparison",
        finalTitle: "Claude B",
        pillarId: "pl1",
        availability: "awaiting",
        value: null,
        accountBaseline: null,
        pillarBaseline: null,
      },
    ],
  },
} as never;

describe("buildLearningEvidenceSummary", () => {
  it("is deterministic and separates facts from human judgment", () => {
    const a = buildLearningEvidenceSummary(CONCLUDED_TEST);
    const b = buildLearningEvidenceSummary(CONCLUDED_TEST);
    expect(a).toBe(b);

    expect(a).toContain("Test: XHS Hook Comparison");
    expect(a).toContain("Platform: xiaohongshu");
    expect(a).toContain("Checkpoint: 24h");
    expect(a).toContain("Primary metric: 点赞率");
    expect(a).toContain("Claude A (comparison): 10.0%");
    expect(a).toContain("Account context: 8.0% (n=12)");
    expect(a).toContain("Pillar context: 9.0% (n=4)");
    expect(a).toContain("Claude B (comparison): Awaiting 24h data");
    expect(a).toContain("Human outcome: No Clear Result");
    expect(a).toContain("Human conclusion:\nOnly two samples; keep observing.");
  });

  it("uses shared formatting — percentage only for percentage metrics", () => {
    const summary = buildLearningEvidenceSummary(CONCLUDED_TEST);
    expect(summary).toContain("10.0%");
    expect(summary).not.toContain("0.1");
  });

  it("keeps zero as real zero and never turns unavailable into 0", () => {
    const zeroTest = JSON.parse(JSON.stringify(CONCLUDED_TEST));
    zeroTest.resultEvidence = {
      primaryMetric: { key: "views", format: "count", label: "Views" },
      publications: [
        {
          publicationId: "p1",
          role: "comparison",
          finalTitle: "Zero",
          pillarId: null,
          availability: "available",
          value: 0,
          accountBaseline: { available: false, median: null, sampleCount: 0 },
          pillarBaseline: null,
        },
      ],
    };
    const s = buildLearningEvidenceSummary(zeroTest);
    expect(s).toContain("Zero (comparison): 0");
    expect(s).toContain("Account context: unavailable");
    expect(s).toContain("Pillar context: unavailable");
  });
});

describe("defaultPillarId", () => {
  it("all same non-null pillar → that pillar", () => {
    expect(defaultPillarId(CONCLUDED_TEST)).toBe("pl1");
  });

  it("mixed pillars → null", () => {
    const t = JSON.parse(JSON.stringify(CONCLUDED_TEST));
    t.resultEvidence.publications[1].pillarId = "pl2";
    expect(defaultPillarId(t)).toBeNull();
  });

  it("any null pillar → null", () => {
    const t = JSON.parse(JSON.stringify(CONCLUDED_TEST));
    t.resultEvidence.publications[1].pillarId = null;
    expect(defaultPillarId(t)).toBeNull();
  });

  it("no publications → null", () => {
    const t = JSON.parse(JSON.stringify(CONCLUDED_TEST));
    t.resultEvidence.publications = [];
    expect(defaultPillarId(t)).toBeNull();
  });
});

describe("learning schemas", () => {
  it("save: text + optional pillarId only — server-owned fields rejected", () => {
    expect(
      learningSaveSchema.safeParse({ text: "值得继续验证" }).success
    ).toBe(true);
    for (const key of ["evidenceSummary", "platform", "sourceTestId", "brandId"]) {
      expect(
        learningSaveSchema.safeParse({ text: "x", [key]: "tamper" }).success
      ).toBe(false);
    }
  });

  it("save: empty text rejected", () => {
    expect(learningSaveSchema.safeParse({ text: "  " }).success).toBe(false);
  });

  it("patch: text/pillarId only; evidenceSummary immutable", () => {
    expect(learningPatchSchema.safeParse({ text: "改文案" }).success).toBe(true);
    expect(
      learningPatchSchema.safeParse({ evidenceSummary: "rewrite" }).success
    ).toBe(false);
  });

  it("AI draft: single text field, ≤500 chars", () => {
    expect(aiLearningDraftSchema.safeParse({ text: "ok" }).success).toBe(true);
    expect(
      aiLearningDraftSchema.safeParse({ text: "ok", confidence: "high" }).success
    ).toBe(false);
    expect(
      aiLearningDraftSchema.safeParse({ text: "x".repeat(501) }).success
    ).toBe(false);
  });
});
