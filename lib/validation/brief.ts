import { z } from "zod";

/**
 * ContentBrief validation — data-model §10
 *
 * Three layers, deliberately separate (do NOT merge):
 *
 * A. aiBriefDraftSchema — AI structured output contract.
 *    AI must produce a complete draft; all 8 fields non-empty after trim.
 *
 * B. briefSaveSchema — human draft persistence (manual Save / Auto Save).
 *    Incomplete drafts with empty strings are allowed.
 *
 * C. briefApproveSchema — human approval gate.
 *    All 8 fields must be non-empty after trim.
 *
 * Principle: an incomplete draft can be saved, but cannot be approved.
 */

const BRIEF_FIELDS = [
  "targetAudience",
  "userProblem",
  "coreQuestion",
  "mainAngle",
  "contentPromise",
  "keyEvidence",
  "differentiation",
  "cta",
] as const;

const requiredField = z.string().trim().min(1).max(5000);
const saveField = z.string().max(5000);

// A. AI draft contract
export const aiBriefDraftSchema = z.object({
  targetAudience: requiredField,
  userProblem: requiredField,
  coreQuestion: requiredField,
  mainAngle: requiredField,
  contentPromise: requiredField,
  keyEvidence: requiredField,
  differentiation: requiredField,
  cta: requiredField,
});

// B. Human save (incomplete allowed)
export const briefSaveSchema = z.object({
  targetAudience: saveField,
  userProblem: saveField,
  coreQuestion: saveField,
  mainAngle: saveField,
  contentPromise: saveField,
  keyEvidence: saveField,
  differentiation: saveField,
  cta: saveField,
});

// C. Approve gate (all non-empty after trim)
export const briefApproveSchema = z.object({
  targetAudience: requiredField,
  userProblem: requiredField,
  coreQuestion: requiredField,
  mainAngle: requiredField,
  contentPromise: requiredField,
  keyEvidence: requiredField,
  differentiation: requiredField,
  cta: requiredField,
});

export const EMPTY_BRIEF: z.infer<typeof briefSaveSchema> = {
  targetAudience: "",
  userProblem: "",
  coreQuestion: "",
  mainAngle: "",
  contentPromise: "",
  keyEvidence: "",
  differentiation: "",
  cta: "",
};

export type AIBriefDraft = z.infer<typeof aiBriefDraftSchema>;
export type BriefSaveInput = z.infer<typeof briefSaveSchema>;
export type BriefApproveInput = z.infer<typeof briefApproveSchema>;

export { BRIEF_FIELDS };
