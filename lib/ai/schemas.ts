import { z } from "zod";

/**
 * Signal AI analysis schemas — M1.2B
 *
 * AGENTS.md §13 requires evidence to distinguish fact / community / inference.
 * V1 has no crawler or source verification, so evidence provenance is minimal
 * and honest — nothing may be labeled as externally verified:
 *
 * - signal_input   → taken directly from user-supplied Signal title/summary/metadata
 * - brand_context  → derived from Brand / Content Pillar configuration
 * - model_inference→ model reasoning or prior knowledge, unverified
 *
 * sourceUrl is metadata only: the model has NOT read the webpage behind it.
 * Scores are nullable integers 0–100; null means insufficient evidence,
 * never normalize null to 0.
 */

export const ANALYSIS_CONFIDENCE = [
  "high",
  "medium",
  "low",
  "insufficient_evidence",
] as const;

export const EVIDENCE_SOURCE = [
  "signal_input",
  "brand_context",
  "model_inference",
] as const;

export const analysisEvidenceItemSchema = z.object({
  claim: z.string().min(1).max(500),
  source: z.enum(EVIDENCE_SOURCE),
});

export const analysisScoresSchema = z.object({
  audienceFit: z.number().int().min(0).max(100).nullable(),
  timing: z.number().int().min(0).max(100).nullable(),
  contentPotential: z.number().int().min(0).max(100).nullable(),
});

/**
 * Raw structured output expected from the model.
 * The model must NOT return an overall score — the server computes it.
 */
export const signalAnalysisSchema = z
  .object({
    whyItMatters: z.string().max(2000).nullable(),
    audienceMatch: z.string().max(2000).nullable(),
    contentRisk: z.string().max(2000).nullable(),
    possibleAngles: z.array(z.string().min(1).max(300)).max(3),
    scores: analysisScoresSchema,
    evidence: z.array(analysisEvidenceItemSchema).max(3),
    confidence: z.enum(ANALYSIS_CONFIDENCE),
  })
  .refine(
    (a) =>
      a.confidence !== "insufficient_evidence" ||
      (a.scores.audienceFit === null &&
        a.scores.timing === null &&
        a.scores.contentPotential === null),
    {
      message:
        "insufficient_evidence confidence requires all scores to be null",
    }
  );

export type AnalysisEvidenceItem = z.infer<typeof analysisEvidenceItemSchema>;
export type AnalysisScores = z.infer<typeof analysisScoresSchema>;
export type SignalAnalysis = z.infer<typeof signalAnalysisSchema>;

/**
 * Server-side overall score. AI never decides the final math.
 * All three dimensions present → rounded mean; any null → null.
 */
export function computeOverallScore(scores: AnalysisScores): number | null {
  const { audienceFit, timing, contentPotential } = scores;
  if (audienceFit === null || timing === null || contentPotential === null) {
    return null;
  }
  return Math.round((audienceFit + timing + contentPotential) / 3);
}
