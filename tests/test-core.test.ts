import { describe, it, expect } from "vitest";

import {
  createTestSchema,
  patchTestSchema,
  attachPublicationSchema,
  createTestFormSubmittable,
} from "@/lib/validation/test";

/**
 * M3.1 Test Core — validation contract tests. Domain DB behavior is
 * covered by the Supabase smoke test.
 */

const VALID = {
  platform: "xiaohongshu",
  checkpoint: "24h",
  method: "content_comparison",
  title: "问题式 Hook 测试",
  hypothesis: "问题式 Hook 可能提高 24h 点赞率",
  change: "开头从陈述改为问题",
  primaryMetricKey: "like_rate",
};

describe("createTestSchema", () => {
  it("accepts a valid test", () => {
    expect(createTestSchema.safeParse(VALID).success).toBe(true);
  });

  it("accepts the full Checkpoint set (24h / 72h / manual)", () => {
    expect(createTestSchema.safeParse({ ...VALID, checkpoint: "manual" }).success).toBe(true);
    expect(createTestSchema.safeParse({ ...VALID, checkpoint: "72h" }).success).toBe(true);
  });

  it("requires explicit platform + valid checkpoint", () => {
    expect(createTestSchema.safeParse({ ...VALID, checkpoint: "1h" }).success).toBe(false);
    const noPlatform = { ...VALID } as Record<string, unknown>;
    delete noPlatform.platform;
    expect(createTestSchema.safeParse(noPlatform).success).toBe(false);
  });

  it("rejects client-submitted status / outcome / conclusion (server-owned)", () => {
    expect(createTestSchema.safeParse({ ...VALID, status: "concluded" }).success).toBe(false);
    expect(createTestSchema.safeParse({ ...VALID, outcome: "win" }).success).toBe(false);
    expect(createTestSchema.safeParse({ ...VALID, conclusion: "x" }).success).toBe(false);
  });

  it("rejects unknown platforms and methods", () => {
    expect(createTestSchema.safeParse({ ...VALID, platform: "tiktok" }).success).toBe(false);
    expect(createTestSchema.safeParse({ ...VALID, method: "bayesian" }).success).toBe(false);
  });

  it("rejects invalid metric keys", () => {
    expect(createTestSchema.safeParse({ ...VALID, primaryMetricKey: "Like Rate" }).success).toBe(false);
  });
});

describe("patchTestSchema — descriptive fields only", () => {
  it("allows title / keepConsistent / compareWith", () => {
    expect(patchTestSchema.safeParse({ title: "New title" }).success).toBe(true);
    expect(patchTestSchema.safeParse({ keepConsistent: null }).success).toBe(true);
  });

  it("rejects core definition fields (immutability)", () => {
    for (const key of ["platform", "checkpoint", "method", "hypothesis", "change", "primaryMetricKey", "status", "outcome"]) {
      expect(patchTestSchema.safeParse({ [key]: "x" }).success).toBe(false);
    }
  });
});

describe("attachPublicationSchema", () => {
  it("validates role enum + uuid", () => {
    expect(
      attachPublicationSchema.safeParse({
        publicationId: "550e8400-e29b-41d4-a716-446655440000",
        role: "control",
      }).success
    ).toBe(true);
    expect(
      attachPublicationSchema.safeParse({
        publicationId: "not-uuid",
        role: "control",
      }).success
    ).toBe(false);
    expect(
      attachPublicationSchema.safeParse({
        publicationId: "550e8400-e29b-41d4-a716-446655440000",
        role: "winner",
      }).success
    ).toBe(false);
  });

  it("role defaults to comparison", () => {
    const r = attachPublicationSchema.safeParse({
      publicationId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.role).toBe("comparison");
  });
});

// ─── M4.2: method must be an explicit human choice ─────

describe("createTestFormSubmittable (M4.2)", () => {
  const FULL = {
    method: "content_comparison",
    title: "t",
    hypothesis: "h",
    change: "c",
    primaryMetricKey: "views",
  };

  it("method unset → not submittable (diagnosis entry: only platform/checkpoint prefilled)", () => {
    expect(createTestFormSubmittable({ ...FULL, method: "" })).toBe(false);
  });

  it("ordinary Create Test also starts unresolved — no silent default method", () => {
    // The dialog initial state is "" for every new Test; a human must
    // pick one of TEST_METHODS before Confirm enables.
    expect(createTestFormSubmittable({ ...FULL, method: "" })).toBe(false);
    expect(createTestFormSubmittable(FULL)).toBe(true);
  });

  it("unknown method rejected", () => {
    expect(createTestFormSubmittable({ ...FULL, method: "ab_test" })).toBe(false);
  });

  it("other required fields still gate", () => {
    expect(createTestFormSubmittable({ ...FULL, title: "  " })).toBe(false);
    expect(createTestFormSubmittable({ ...FULL, hypothesis: "" })).toBe(false);
    expect(createTestFormSubmittable({ ...FULL, change: "" })).toBe(false);
    expect(createTestFormSubmittable({ ...FULL, primaryMetricKey: "" })).toBe(false);
  });
});
