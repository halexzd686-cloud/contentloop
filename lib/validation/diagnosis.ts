import { z } from "zod";

/**
 * Diagnosis validation — M2.6 (data-model §22, AGENTS §18).
 *
 * Fixed output: What Happened / Evidence / Possible Reasons /
 * Confidence / Next Actions. Limits: evidence ≤3, reasons ≤2,
 * actions ≤3. No long essays. No pseudo-precise confidence.
 *
 * AI authors TEXT and evidence REFERENCES only. Numeric evidence
 * (current / baseline / n / delta) is 100% server-owned — the model
 * can never author it, and client-submitted numbers are ignored.
 */

export const CONFIDENCE_LEVELS = [
  "high",
  "medium",
  "low",
  "insufficient_evidence",
] as const;

const evidenceRef = z
  .object({
    metricKey: z.string().trim().min(1).max(100),
    baselineScope: z.enum(["account", "pillar"]),
  })
  .strict();

/** AI structured output contract — references only, no numbers. */
export const aiDiagnosisSchema = z
  .object({
    whatHappened: z.string().trim().min(1).max(300),
    evidenceRefs: z.array(evidenceRef).max(3),
    possibleReasons: z.array(z.string().trim().min(1).max(300)).max(2),
    confidence: z.enum(CONFIDENCE_LEVELS),
    nextActions: z.array(z.string().trim().min(1).max(300)).max(3),
  })
  .strict();

export type AIDiagnosis = z.infer<typeof aiDiagnosisSchema>;
export type EvidenceRef = z.infer<typeof evidenceRef>;

/** Human save payload — text fields editable, evidence refs kept. */
export const diagnosisSaveSchema = z
  .object({
    whatHappened: z.string().trim().min(1).max(300),
    evidenceRefs: z.array(evidenceRef).max(3),
    possibleReasons: z.array(z.string().trim().min(1).max(300)).max(2),
    confidence: z.enum(CONFIDENCE_LEVELS),
    nextActions: z.array(z.string().trim().min(1).max(300)).max(3),
    proposalContextFingerprint: z.string().trim().min(1).max(100),
  })
  .strict();

export type DiagnosisSaveInput = z.infer<typeof diagnosisSaveSchema>;

/** Server-resolved evidence — stored on the Diagnosis record. */
export interface ResolvedEvidence {
  metricKey: string;
  baselineScope: "account" | "pillar";
  currentValue: number | null;
  baselineValue: number | null;
  sampleCount: number | null;
  absoluteDelta: number | null;
  comparisonText: string;
}
