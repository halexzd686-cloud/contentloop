import { aiLearningDraftSchema, type AILearningDraft } from "@/lib/validation/learning";
import type { AIProvider } from "@/lib/ai/provider";

/**
 * AI Learning Draft — M3.3.
 *
 * AI writes WORDING ONLY ({ text }). It never authors numbers, scope,
 * evidence, or confidence. ONE model request — no repair retry (the
 * manual path always exists). Zero DB writes; Apply/Save is human.
 */

interface FrozenEvidenceLite {
  primaryMetric?: { key: string; format: string; label: string };
  publications?: {
    role: string;
    finalTitle: string;
    availability: string;
    value: number | null;
  }[];
}

export interface LearningDraftInput {
  test: {
    title: string;
    hypothesis: string;
    change: string;
    method: string;
    platform: string;
    checkpoint: string;
    primaryMetricKey: string;
    keepConsistent: string | null;
    compareWith: string | null;
    outcome: string;
    conclusion: string;
    resultEvidence: FrozenEvidenceLite;
  };
}

const SYSTEM_PROMPT = `You draft ONE short operational learning from a concluded content test. A human will review, edit and save it — you only propose wording.

Rules:
- Base everything ONLY on the supplied frozen test evidence.
- Preserve uncertainty; never claim causality, proof, or statistical significance.
- Never invent metrics, sample sizes, or numbers. Never reference industry benchmarks.
- If the outcome is no_clear_result, the learning must say the evidence is insufficient — do not spin it into a win.
- Write in the language of the test title/conclusion (Chinese input → Chinese output).
- Keep it under 500 characters.`;

export function buildLearningDraftPrompt(input: LearningDraftInput): {
  system: string;
  user: string;
} {
  const t = input.test;
  return {
    system: SYSTEM_PROMPT,
    user: `Test: ${t.title}
Platform: ${t.platform} · Checkpoint: ${t.checkpoint} · Method: ${t.method}
Hypothesis: ${t.hypothesis}
Change: ${t.change}
Primary metric: ${t.primaryMetricKey}
${t.keepConsistent ? `Keep consistent: ${t.keepConsistent}` : ""}
${t.compareWith ? `Compare with: ${t.compareWith}` : ""}

Frozen result evidence:
${JSON.stringify(t.resultEvidence)}

Human outcome: ${t.outcome}
Human conclusion: ${t.conclusion}

Draft the learning as JSON: { "text": string }`,
  };
}

export async function draftLearning(
  input: LearningDraftInput,
  provider: AIProvider
): Promise<{ ok: true; draft: AILearningDraft } | { ok: false; error: string }> {
  const { system, user } = buildLearningDraftPrompt(input);
  try {
    const raw = await provider.generateStructured({ system, user });
    const parsed = JSON.parse(raw);
    const result = aiLearningDraftSchema.safeParse(parsed);
    if (!result.success) {
      return { ok: false, error: "AI returned an invalid learning draft." };
    }
    return { ok: true, draft: result.data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "AI provider error",
    };
  }
}
