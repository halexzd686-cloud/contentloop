import { describe, it, expect } from "vitest";

import {
  platformLabel,
  contentStatusLabel,
  versionStatusLabel,
  signalStatusLabel,
  briefStatusLabel,
  testStatusLabel,
  testMethodLabel,
  testRoleLabel,
  testOutcomeLabel,
  confidenceLabel,
  TEST_METHOD_HELPERS,
  TEST_METHODS_FOOTNOTE,
  TEST_ROLE_HELPER,
  CHECKPOINT_HELPER,
  PRIMARY_METRIC_HELPER,
  TEST_OUTCOME_HELPERS,
  INSUFFICIENT_EVIDENCE_HELPER,
  BASELINE_ACCOUNT_HELPER,
  BASELINE_PILLAR_HELPER,
  BASELINE_N_HELPER,
  METRIC_NA_HELPER,
  METRIC_BLANK_HELPER,
  LEARNING_APPLY_HELPER,
} from "@/lib/labels";
import { TEST_METHODS, TEST_ROLES } from "@/lib/validation/test";

/**
 * M4.3 — shared presentation labels. Known enums fully covered;
 * unknown values must never leak raw snake_case to the UI.
 */

describe("label coverage", () => {
  it("platforms: full names, never abbreviations", () => {
    expect(platformLabel("xiaohongshu")).toBe("Xiaohongshu");
    expect(platformLabel("bilibili")).toBe("Bilibili");
    expect(platformLabel("douyin")).toBe("Douyin");
  });

  it("content statuses", () => {
    for (const s of ["planning", "in_progress", "review", "scheduled", "published"])
      expect(contentStatusLabel(s)).not.toContain("_");
  });

  it("version statuses", () => {
    expect(versionStatusLabel("review")).toBe("In Review");
    for (const s of ["draft", "review", "approved", "published"])
      expect(versionStatusLabel(s)).not.toContain("_");
  });

  it("signal statuses", () => {
    for (const s of ["new", "reviewing", "selected", "skipped"])
      expect(signalStatusLabel(s)).not.toContain("_");
  });

  it("brief statuses", () => {
    expect(briefStatusLabel("draft")).toBe("Draft");
    expect(briefStatusLabel("approved")).toBe("Approved");
  });

  it("test statuses", () => {
    expect(testStatusLabel("running")).toBe("Running");
    expect(testStatusLabel("concluded")).toBe("Concluded");
  });

  it("every known test method has a label and a helper", () => {
    for (const m of TEST_METHODS) {
      expect(testMethodLabel(m)).not.toContain("_");
      expect(TEST_METHOD_HELPERS[m]).toBeTruthy();
    }
    expect(TEST_METHODS_FOOTNOTE).toContain("does not calculate statistical significance");
  });

  it("every known test role has a label", () => {
    for (const r of TEST_ROLES) expect(testRoleLabel(r)).not.toContain("_");
    expect(TEST_ROLE_HELPER).toContain("do not change evidence calculations");
  });

  it("outcomes: no raw enum, helpers for all four", () => {
    expect(testOutcomeLabel("win")).toBe("Win");
    expect(testOutcomeLabel("loss")).toBe("Loss");
    expect(testOutcomeLabel("trade_off")).toBe("Trade-off");
    expect(testOutcomeLabel("no_clear_result")).toBe("No clear result");
    for (const o of ["win", "loss", "trade_off", "no_clear_result"])
      expect(TEST_OUTCOME_HELPERS[o]).toBeTruthy();
  });

  it("confidence: insufficient_evidence reads correctly", () => {
    expect(confidenceLabel("insufficient_evidence")).toBe("Insufficient evidence");
  });

  it("unknown fallback humanizes instead of exposing snake_case", () => {
    expect(platformLabel("some_future_platform")).toBe("Some future platform");
    expect(testOutcomeLabel("future_outcome")).toBe("Future outcome");
    expect(platformLabel("some_future_platform")).not.toContain("_");
  });

  it("null/empty stays empty", () => {
    expect(platformLabel(null)).toBe("");
    expect(testStatusLabel(undefined)).toBe("");
  });
});

describe("semantic boundaries", () => {
  it("no_clear_result and insufficient_evidence are distinct concepts", () => {
    expect(TEST_OUTCOME_HELPERS.no_clear_result).toContain(
      "does not point clearly in one direction"
    );
    expect(INSUFFICIENT_EVIDENCE_HELPER).toContain("not enough usable evidence");
    expect(TEST_OUTCOME_HELPERS.no_clear_result).not.toBe(INSUFFICIENT_EVIDENCE_HELPER);
  });

  it("baseline copy states workspace history, never industry benchmark", () => {
    for (const h of [BASELINE_ACCOUNT_HELPER, BASELINE_PILLAR_HELPER]) {
      expect(h).toContain("20 prior comparable publications");
      expect(h).toContain("Not an industry benchmark");
      expect(h.toLowerCase()).not.toContain("industry average");
    }
  });

  it("n helper is per-metric sample count, not cohort candidateCount", () => {
    expect(BASELINE_N_HELPER).toContain("available value for this metric");
    expect(BASELINE_N_HELPER.toLowerCase()).not.toContain("candidate");
  });

  it("N/A is not zero; blank is unresolved; neither blames the platform", () => {
    expect(METRIC_NA_HELPER).toContain("unavailable for this snapshot");
    expect(METRIC_NA_HELPER).toContain("not zero");
    expect(METRIC_NA_HELPER.toLowerCase()).not.toContain("platform doesn't provide");
    expect(METRIC_BLANK_HELPER).toContain("unresolved");
  });

  it("Learning Apply never implies content mutation", () => {
    expect(LEARNING_APPLY_HELPER).toContain("does not change");
  });

  it("checkpoint / primary metric helpers match frozen semantics", () => {
    expect(CHECKPOINT_HELPER).toContain("24 or 72 hours after publishing");
    expect(PRIMARY_METRIC_HELPER).toContain("does not decide the outcome automatically");
  });
});
