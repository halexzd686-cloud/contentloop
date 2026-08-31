import { describe, it, expect } from "vitest";

import {
  reviewChecklistSchema,
  isChecklistComplete,
  canDragTransition,
  dragBlockReason,
  EMPTY_CHECKLIST,
} from "@/lib/validation/review";

/**
 * M1.6 Review & Pipeline — validation + transition table tests.
 * Domain-service DB behavior (gates, transactions, invalidation) is
 * covered by the Supabase smoke test; here we lock the pure rules.
 */

const COMPLETE = {
  factsConfirmed: true,
  titleCoverMatch: true,
  platformFitConfirmed: true,
  riskChecked: true,
  humanReviewed: true,
};

describe("reviewChecklistSchema", () => {
  it("accepts a valid checklist", () => {
    expect(reviewChecklistSchema.safeParse(COMPLETE).success).toBe(true);
    expect(reviewChecklistSchema.safeParse(EMPTY_CHECKLIST).success).toBe(true);
  });

  it("rejects non-boolean values", () => {
    expect(
      reviewChecklistSchema.safeParse({ ...EMPTY_CHECKLIST, factsConfirmed: "yes" })
        .success
    ).toBe(false);
  });

  it("rejects unknown keys (strict)", () => {
    expect(
      reviewChecklistSchema.safeParse({ ...EMPTY_CHECKLIST, aiApproved: true })
        .success
    ).toBe(false);
  });

  it("rejects missing items", () => {
    const partial = { ...EMPTY_CHECKLIST } as Record<string, unknown>;
    delete partial.humanReviewed;
    expect(reviewChecklistSchema.safeParse(partial).success).toBe(false);
  });
});

describe("isChecklistComplete", () => {
  it("partial checklist is incomplete", () => {
    expect(isChecklistComplete({ ...COMPLETE, riskChecked: false })).toBe(false);
    expect(isChecklistComplete(EMPTY_CHECKLIST)).toBe(false);
  });

  it("all five true is complete", () => {
    expect(isChecklistComplete(COMPLETE)).toBe(true);
  });
});

describe("drag transition table", () => {
  it("allows the three legitimate drag transitions", () => {
    expect(canDragTransition("planning", "in_progress")).toBe(true);
    expect(canDragTransition("in_progress", "review")).toBe(true);
    expect(canDragTransition("review", "in_progress")).toBe(true);
  });

  it("forbids drag that would bypass the review checklist", () => {
    expect(canDragTransition("review", "scheduled")).toBe(false);
  });

  it("forbids unconditional scheduled → review drag", () => {
    expect(canDragTransition("scheduled", "review")).toBe(false);
  });

  it("forbids every path into published", () => {
    for (const from of ["planning", "in_progress", "review", "scheduled", "published"]) {
      expect(canDragTransition(from, "published")).toBe(false);
    }
  });

  it("forbids skipping stages", () => {
    expect(canDragTransition("planning", "review")).toBe(false);
    expect(canDragTransition("planning", "scheduled")).toBe(false);
    expect(canDragTransition("in_progress", "scheduled")).toBe(false);
    expect(canDragTransition("planning", "planning")).toBe(false);
  });

  it("dragBlockReason explains protected transitions", () => {
    expect(dragBlockReason("review", "scheduled")).toContain("Checklist");
    expect(dragBlockReason("scheduled", "published")).toContain("Publication");
    expect(dragBlockReason("scheduled", "review")).toContain("draft");
  });
});
