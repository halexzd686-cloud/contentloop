/**
 * M4.3 — Shared presentation labels (presentation only).
 *
 * One authoritative mapping from internal enum keys to user-facing
 * English chrome. Known enums are fully covered; unknown values fall
 * back to a humanized form so raw snake_case never reaches the UI.
 * No domain/enum/schema semantics live here — display only.
 */

function humanize(key: string): string {
  const words = key.replace(/_/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function fromMap(map: Record<string, string>) {
  return (key: string | null | undefined): string => {
    if (!key) return "";
    return map[key] ?? humanize(key);
  };
}

// ─── Platforms (full names only — never XHS/Bili) ──────

export const platformLabel = fromMap({
  xiaohongshu: "Xiaohongshu",
  bilibili: "Bilibili",
  douyin: "Douyin",
});

// ─── Content / workflow statuses ───────────────────────

export const contentStatusLabel = fromMap({
  planning: "Planning",
  in_progress: "In Progress",
  review: "Review",
  scheduled: "Scheduled",
  published: "Published",
});

export const versionStatusLabel = fromMap({
  draft: "Draft",
  review: "In Review",
  approved: "Approved",
  published: "Published",
});

export const signalStatusLabel = fromMap({
  new: "New",
  reviewing: "Reviewing",
  selected: "Selected",
  skipped: "Skipped",
});

export const briefStatusLabel = fromMap({
  draft: "Draft",
  approved: "Approved",
});

// ─── Tests ─────────────────────────────────────────────

export const testStatusLabel = fromMap({
  running: "Running",
  concluded: "Concluded",
});

export const testMethodLabel = fromMap({
  ab: "A/B",
  sequential: "Sequential",
  before_after: "Before / After",
  content_comparison: "Content Comparison",
});

export const testRoleLabel = fromMap({
  control: "Control",
  variant: "Variant",
  comparison: "Comparison",
});

export const testOutcomeLabel = fromMap({
  win: "Win",
  loss: "Loss",
  trade_off: "Trade-off",
  no_clear_result: "No clear result",
});

export const confidenceLabel = fromMap({
  high: "High",
  medium: "Medium",
  low: "Low",
  insufficient_evidence: "Insufficient evidence",
});

// ─── Helpers (static product copy) ─────────────────────

export const TEST_METHOD_HELPERS: Record<string, string> = {
  ab: "Two variants of the same change, compared on one metric.",
  sequential: "The same change tried across consecutive posts.",
  before_after: "Compare posts before vs after a strategy change.",
  content_comparison: "Compare two or more posts on the same metric.",
};

export const TEST_METHODS_FOOTNOTE =
  "Methods describe how you compare. ContentLoop does not calculate statistical significance.";

export const TEST_SECTION_HELPER =
  "Tests help you check one specific operational question against published content data.";

export const TEST_ROLE_HELPER =
  "Roles organize publications for interpretation. They do not change evidence calculations or readiness.";

export const CHECKPOINT_HELPER =
  "Which data reading to use: around 24 or 72 hours after publishing.";

export const PRIMARY_METRIC_HELPER =
  "The main metric you use when judging this Test. It does not decide the outcome automatically.";

export const TEST_OUTCOME_HELPERS: Record<string, string> = {
  win: "The observed evidence supports the hypothesis.",
  loss: "The observed evidence goes against the hypothesis.",
  trade_off: "The evidence is meaningfully mixed.",
  no_clear_result: "The observed evidence does not point clearly in one direction.",
};

/** Distinct from no_clear_result: not enough data to interpret at all. */
export const INSUFFICIENT_EVIDENCE_HELPER =
  "There is not enough usable evidence to interpret the result reliably.";

// ─── Baseline copy (workspace history, never industry) ─

export const BASELINE_ACCOUNT_HELPER =
  "Median from up to 20 prior comparable publications in this workspace for the same platform and checkpoint. Not an industry benchmark.";

export const BASELINE_PILLAR_HELPER =
  "Median from up to 20 prior comparable publications in the same pillar, platform and checkpoint. Not an industry benchmark.";

/** n = per-metric sample count, NOT the cohort candidateCount. */
export const BASELINE_N_HELPER =
  "n = number of prior publications with an available value for this metric.";

// ─── Metric input semantics (§6) ───────────────────────

export const METRIC_NA_HELPER =
  "N/A means this metric is unavailable for this snapshot. It is not zero — 0 means a measured value of zero.";

export const METRIC_BLANK_HELPER =
  "Blank means this value is still unresolved. Enter a number or mark it N/A before saving.";

// ─── Learning / Apply boundaries ───────────────────────

export const LEARNING_APPLY_HELPER =
  "Reference only — this does not change the Brief, Master or platform versions.";

export const AI_PROPOSAL_APPLY_HELPER =
  "Applies this proposal to the editor. Nothing is saved until you save.";
