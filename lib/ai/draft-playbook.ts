import {
  aiPlaybookDraftSchema,
  type AIPlaybookDraft,
} from "@/lib/validation/playbook";
import { platformLabel } from "@/lib/labels";
import type { AIProvider } from "@/lib/ai/provider";

/**
 * AI Playbook Draft — M8 (AGENTS §21, PRD §15.4).
 *
 * AI drafts wording for the seven fixed Playbook fields. It NEVER
 * writes to the database — the draft fills the human's edit form;
 * only an explicit human save persists. No overwrite of existing
 * rules: the current playbook is context, not a mutation target.
 */

export interface PlaybookDraftInput {
  platform: string;
  current: {
    voice: string | null;
    titleStyle: string | null;
    hookStyle: string | null;
    structure: string | null;
    cta: string | null;
    avoid: string[] | null;
    goodExamples: { title: string; note?: string; url?: string }[] | null;
  } | null;
  /** Saved learnings relevant to this platform (or platform-agnostic). */
  learnings: string[];
}

const SYSTEM_PROMPT = `You draft a platform content playbook for a small content team. A human will review, edit and save it — you only propose wording.

Rules:
- Base the draft ONLY on the supplied current playbook (if any) and saved learnings. Refine, don't contradict, existing rules.
- Never invent metrics, numbers, case results, or industry benchmarks.
- Good examples must come from the supplied current playbook; if none are supplied, return an empty array — never fabricate titles or URLs.
- Write in Chinese, concise operational language. Each text field ≤ 300 characters.
- Structure of the output is fixed — exactly these seven keys.`;

export function buildPlaybookDraftPrompt(input: PlaybookDraftInput): {
  system: string;
  user: string;
} {
  return {
    system: SYSTEM_PROMPT,
    user: `Platform: ${platformLabel(input.platform)} (${input.platform})

Current playbook (may be empty — improve it, do not contradict it):
${JSON.stringify(input.current)}

Saved learnings relevant to this platform:
${input.learnings.length > 0 ? input.learnings.map((t, i) => `${i + 1}. ${t}`).join("\n") : "(none)"}

Draft the playbook as JSON:
{
  "voice": string,
  "titleStyle": string,
  "hookStyle": string,
  "structure": string,
  "cta": string,
  "avoid": string[],
  "goodExamples": [{ "title": string, "note"?: string, "url"?: string }]
}`,
  };
}

export async function draftPlaybook(
  input: PlaybookDraftInput,
  provider: AIProvider
): Promise<{ ok: true; draft: AIPlaybookDraft } | { ok: false; error: string }> {
  const { system, user } = buildPlaybookDraftPrompt(input);
  try {
    const raw = await provider.generateStructured({ system, user });
    const parsed = JSON.parse(raw);
    const result = aiPlaybookDraftSchema.safeParse(parsed);
    if (!result.success) {
      return { ok: false, error: "Playbook draft failed validation." };
    }
    return { ok: true, draft: result.data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "AI provider error",
    };
  }
}
