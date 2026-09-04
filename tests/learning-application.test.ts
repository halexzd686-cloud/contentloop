import { describe, it, expect } from "vitest";

import {
  isContentLifecycleEligible,
  isPlatformEligible,
  isPillarEligible,
  isScopeEligible,
  candidateRank,
  applyActionSchema,
  transitionActionSchema,
} from "@/lib/validation/learning-application";

/**
 * M3.4 Learning Application — eligibility/scope/schema tests.
 * DB lifecycle (create/transition/read model) covered by smoke.
 */

describe("lifecycle eligibility", () => {
  it("planning/in_progress/review/scheduled eligible; published not", () => {
    for (const s of ["planning", "in_progress", "review", "scheduled"]) {
      expect(isContentLifecycleEligible(s)).toBe(true);
    }
    expect(isContentLifecycleEligible("published")).toBe(false);
    expect(isContentLifecycleEligible("draft")).toBe(false);
  });
});

describe("platform scope (strict)", () => {
  it("null learning platform = general; otherwise exact match only", () => {
    expect(isPlatformEligible(null, "bilibili")).toBe(true);
    expect(isPlatformEligible(null, null)).toBe(true);
    expect(isPlatformEligible("xiaohongshu", "xiaohongshu")).toBe(true);
    expect(isPlatformEligible("xiaohongshu", "bilibili")).toBe(false);
    expect(isPlatformEligible("xiaohongshu", null)).toBe(false);
  });
});

describe("pillar scope (strict)", () => {
  it("null learning pillar = general; otherwise exact match only", () => {
    expect(isPillarEligible(null, "p1")).toBe(true);
    expect(isPillarEligible("p1", "p1")).toBe(true);
    expect(isPillarEligible("p1", "p2")).toBe(false);
    expect(isPillarEligible("p1", null)).toBe(false);
  });
});

describe("isScopeEligible", () => {
  it("requires lifecycle + platform + pillar all pass", () => {
    expect(
      isScopeEligible(
        { platform: "xiaohongshu", pillarId: "p1" },
        { status: "in_progress", platform: "xiaohongshu", pillarId: "p1" }
      )
    ).toBe(true);
    expect(
      isScopeEligible(
        { platform: "xiaohongshu", pillarId: "p1" },
        { status: "published", platform: "xiaohongshu", pillarId: "p1" }
      )
    ).toBe(false);
    expect(
      isScopeEligible(
        { platform: "xiaohongshu", pillarId: "p1" },
        { status: "in_progress", platform: "douyin", pillarId: "p1" }
      )
    ).toBe(false);
    expect(
      isScopeEligible(
        { platform: null, pillarId: null },
        { status: "planning", platform: null, pillarId: null }
      )
    ).toBe(true);
  });
});

describe("candidateRank (frozen ordering)", () => {
  it("exact+exact < platform-scoped < general+exact-pillar < general+general", () => {
    expect(candidateRank("xiaohongshu", "p1")).toBe(0);
    expect(candidateRank("xiaohongshu", null)).toBe(1);
    expect(candidateRank(null, "p1")).toBe(2);
    expect(candidateRank(null, null)).toBe(3);
  });
});

describe("action schemas (client authority boundary)", () => {
  it("POST accepts learningId + action only", () => {
    expect(
      applyActionSchema.safeParse({
        learningId: "550e8400-e29b-41d4-a716-446655440000",
        action: "applied",
      }).success
    ).toBe(true);
    for (const key of ["contentId", "brandId", "appliedAt", "text", "platform", "evidenceSummary"]) {
      expect(
        applyActionSchema.safeParse({
          learningId: "550e8400-e29b-41d4-a716-446655440000",
          action: "applied",
          [key]: "tamper",
        }).success
      ).toBe(false);
    }
  });

  it("PATCH accepts action only", () => {
    expect(transitionActionSchema.safeParse({ action: "dismissed" }).success).toBe(true);
    expect(transitionActionSchema.safeParse({ action: "dismissed", appliedAt: "x" }).success).toBe(false);
    expect(transitionActionSchema.safeParse({ action: "winner" }).success).toBe(false);
  });
});
