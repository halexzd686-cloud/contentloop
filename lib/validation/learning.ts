import { z } from "zod";

/**
 * Learning validation — M3.3 (data-model §25).
 *
 * Human-authoritative text only. evidenceSummary / platform /
 * sourceTestId are server-owned and never client-submitted.
 */

/** Human save payload (from a concluded Test). */
export const learningSaveSchema = z
  .object({
    text: z.string().trim().min(1).max(2000),
    pillarId: z.string().uuid().nullable().optional(),
  })
  .strict();

export type LearningSaveInput = z.infer<typeof learningSaveSchema>;

/** Wording/scope corrections only; evidenceSummary is immutable. */
export const learningPatchSchema = z
  .object({
    text: z.string().trim().min(1).max(2000).optional(),
    pillarId: z.string().uuid().nullable().optional(),
  })
  .strict();

export type LearningPatchInput = z.infer<typeof learningPatchSchema>;

/** AI draft output — wording proposal only, single field, no facts. */
export const aiLearningDraftSchema = z
  .object({
    text: z.string().trim().min(1).max(500),
  })
  .strict();

export type AILearningDraft = z.infer<typeof aiLearningDraftSchema>;
