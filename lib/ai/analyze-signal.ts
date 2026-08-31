import {
  computeOverallScore,
  signalAnalysisSchema,
  type SignalAnalysis,
} from "@/lib/ai/schemas";
import type { AIProvider } from "@/lib/ai/provider";

/**
 * Structured Signal Analysis — M1.2B
 *
 * Flow: bounded real input → AI request → JSON parse → Zod validation →
 * business validation → caller persists. AI only suggests; it never
 * touches Signal.status or decision fields.
 *
 * Retry budget: one Analyze click = at most 2 model requests.
 */

// ─── Input ─────────────────────────────────────────────

export interface SignalAnalysisInput {
  inputType: "url" | "idea";
  title: string;
  summary: string | null;
  sourceType: string | null;
  /** Metadata only — the model has NOT read the webpage behind it. */
  sourceUrl: string | null;
  publishedAt: Date | null;
  brandTargetAudience: string;
  brandEnabledPlatforms: string[];
  pillars: { name: string; description: string | null; primaryGoal: string | null }[];
}

// ─── Status boundary ───────────────────────────────────

/** AI Analyze is only offered for new/reviewing signals (M1.2B scope). */
export function canAnalyzeStatus(status: string): boolean {
  return status === "new" || status === "reviewing";
}

// ─── Prompt ────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an analysis assistant for a content operations team.
You evaluate whether a signal (a topic/idea) is worth turning into content for the team's brand.

You respond ONLY with a single JSON object matching this exact shape:
{
  "whyItMatters": string | null,
  "audienceMatch": string | null,
  "contentRisk": string | null,
  "possibleAngles": string[],           // at most 3, may be empty
  "scores": {
    "audienceFit": integer 0-100 | null,
    "timing": integer 0-100 | null,
    "contentPotential": integer 0-100 | null
  },
  "evidence": [{ "claim": string, "source": "signal_input" | "brand_context" | "model_inference" }],  // at most 3, may be empty
  "confidence": "high" | "medium" | "low" | "insufficient_evidence"
}

Strict rules:
- Integers only for scores, 0-100. NEVER output decimals. NEVER output an overall/total score.
- null means "cannot judge reliably". NEVER use 0 for missing evidence.
- If information is insufficient, set "confidence": "insufficient_evidence" and ALL scores to null. This is a normal, acceptable outcome.
- Evidence provenance is mandatory:
  - "signal_input": taken directly from the supplied title/summary/metadata
  - "brand_context": derived from the supplied brand/pillar configuration
  - "model_inference": your own reasoning or prior knowledge, unverified
- You have NOT read the webpage behind sourceUrl. Do not claim facts from the URL itself. Only reason from the supplied title, summary and brand context.
- possibleAngles may contain fewer than 3 items, or be empty when evidence is insufficient.
- Write in the language of the signal's title/summary (Chinese input → Chinese output).`;

export function buildAnalysisPrompt(input: SignalAnalysisInput): {
  system: string;
  user: string;
} {
  const pillars =
    input.pillars.length > 0
      ? input.pillars
          .map(
            (p) =>
              `- ${p.name}${p.description ? `: ${p.description}` : ""}${p.primaryGoal ? ` (goal: ${p.primaryGoal})` : ""}`
          )
          .join("\n")
      : "- (none configured)";

  const user = `Analyze this signal.

Signal:
- inputType: ${input.inputType}
- title: ${input.title}
- summary: ${input.summary ?? "(not provided)"}
- sourceType: ${input.sourceType ?? "(unknown)"}
- sourceUrl: ${input.sourceUrl ?? "(none)"} — you have NOT read this page; it is metadata only.
- publishedAt: ${input.publishedAt ? input.publishedAt.toISOString() : "(unknown)"}

Brand context:
- targetAudience: ${input.brandTargetAudience}
- enabledPlatforms: ${input.brandEnabledPlatforms.join(", ")}

Content pillars:
${pillars}`;

  return { system: SYSTEM_PROMPT, user };
}

// ─── Result ────────────────────────────────────────────

export type AnalyzeSignalResult =
  | { ok: true; analysis: SignalAnalysis }
  | { ok: false; error: string };

// ─── Core ──────────────────────────────────────────────

const MAX_MODEL_REQUESTS = 2;

export async function analyzeSignal(
  input: SignalAnalysisInput,
  provider: AIProvider
): Promise<AnalyzeSignalResult> {
  const { system, user } = buildAnalysisPrompt(input);
  let lastError = "Unknown AI failure";

  for (let attempt = 1; attempt <= MAX_MODEL_REQUESTS; attempt++) {
    // On the second (final) attempt, tell the model what went wrong.
    const userPrompt =
      attempt === 1
        ? user
        : `${user}\n\nYour previous response was rejected: ${lastError}\nReturn ONLY a valid JSON object matching the required shape.`;

    let raw: string;
    try {
      raw = await provider.generateStructured({ system, user: userPrompt });
    } catch (err) {
      lastError = err instanceof Error ? err.message : "AI provider error";
      continue; // provider failure → one retry allowed
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      lastError = "AI returned invalid JSON";
      continue;
    }

    const result = signalAnalysisSchema.safeParse(parsed);
    if (!result.success) {
      lastError = `AI output failed validation: ${result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")
        .slice(0, 300)}`;
      continue;
    }

    return { ok: true, analysis: result.data };
  }

  return { ok: false, error: lastError };
}

// ─── Persistence mapping ───────────────────────────────

/**
 * Map a validated analysis to DB column values. Pure function.
 * topicScore (overall) is computed server-side — never from the model.
 * null scores stay null; never normalized to 0.
 */
export function buildAnalysisUpdate(analysis: SignalAnalysis) {
  return {
    whyItMatters: analysis.whyItMatters,
    audienceMatch: analysis.audienceMatch,
    contentRisk: analysis.contentRisk,
    possibleAngles: analysis.possibleAngles,
    audienceFitScore: analysis.scores.audienceFit,
    timingScore: analysis.scores.timing,
    contentPotentialScore: analysis.scores.contentPotential,
    topicScore: computeOverallScore(analysis.scores),
    analysisConfidence: analysis.confidence,
    analysisEvidence: analysis.evidence,
    analyzedAt: new Date(),
  };
}
