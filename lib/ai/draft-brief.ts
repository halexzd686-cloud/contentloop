import { aiBriefDraftSchema, type AIBriefDraft } from "@/lib/validation/brief";
import type { AIProvider } from "@/lib/ai/provider";

/**
 * AI Draft Brief — M1.3
 *
 * AI suggests a complete Brief draft. The draft is a PROPOSAL only:
 * it is returned to the caller and never persisted here. The human must
 * explicitly Apply it before any database write can happen.
 *
 * Retry budget: one Generate click = at most 2 model requests.
 */

// ─── Input ─────────────────────────────────────────────

export interface BriefDraftInput {
  content: {
    title: string;
    status: string;
    ownerName: string | null;
    reviewerName: string | null;
  };
  /** Linked Signal decision context + analysis (null when manually created). */
  signal: {
    title: string;
    summary: string | null;
    sourceType: string | null;
    /** Metadata only — the model has NOT read the webpage behind it. */
    sourceUrl: string | null;
    selectedAngle: string | null;
    primaryPlatform: string | null;
    whyItMatters: string | null;
    audienceMatch: string | null;
    contentRisk: string | null;
    possibleAngles: string[] | null;
    topicScore: number | null;
    evidence: { claim: string; source: string }[] | null;
  } | null;
  brandTargetAudience: string;
  brandEnabledPlatforms: string[];
  pillars: { name: string; description: string | null; primaryGoal: string | null }[];
  /**
   * Platform Playbook = strategy context (voice / positioning / structure /
   * CTA style). It is NEVER a source of factual evidence.
   */
  playbook: {
    voice: string | null;
    titleStyle: string | null;
    hookStyle: string | null;
    structure: string | null;
    cta: string | null;
    avoid: string[] | null;
  } | null;
}

// ─── Prompt ────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a content strategy assistant for a small content team.
You draft an operational Brief for a content project. A human will review, edit and approve it — you only propose.

You respond ONLY with a single JSON object matching this exact shape:
{
  "targetAudience": string,
  "userProblem": string,
  "coreQuestion": string,
  "mainAngle": string,
  "contentPromise": string,
  "keyEvidence": string,
  "differentiation": string,
  "cta": string
}

Strict rules:
- All 8 fields are required, non-empty strings.
- keyEvidence may ONLY reference the supplied signal data and analysis context (with their stated provenance). NEVER invent numbers, facts, product capabilities or external information.
- If there is not enough trustworthy evidence, write exactly: "Not enough verified evidence yet."
- The Playbook (if supplied) is strategy context only: voice, positioning, structure and CTA style. It is NOT a source of factual evidence — never cite it in keyEvidence.
- You have NOT read the webpage behind any sourceUrl. Do not claim facts from the URL itself.
- Write in the language of the content/signal title (Chinese input → Chinese output).`;

export function buildBriefDraftPrompt(input: BriefDraftInput): {
  system: string;
  user: string;
} {
  const sections: string[] = [];

  sections.push(`Content project:
- title: ${input.content.title}
- status: ${input.content.status}
- owner: ${input.content.ownerName ?? "(unassigned)"}
- reviewer: ${input.content.reviewerName ?? "(none)"}`);

  if (input.signal) {
    const s = input.signal;
    const lines = [
      `- title: ${s.title}`,
      `- summary: ${s.summary ?? "(not provided)"}`,
      `- sourceType: ${s.sourceType ?? "(unknown)"}`,
      `- sourceUrl: ${s.sourceUrl ?? "(none)"} — you have NOT read this page; it is metadata only.`,
      `- selectedAngle: ${s.selectedAngle ?? "(none)"}`,
      `- primaryPlatform: ${s.primaryPlatform ?? "(none)"}`,
    ];
    if (s.topicScore !== null) lines.push(`- topicScore: ${s.topicScore} (0-100)`);
    if (s.whyItMatters) lines.push(`- analysis.whyItMatters: ${s.whyItMatters}`);
    if (s.audienceMatch) lines.push(`- analysis.audienceMatch: ${s.audienceMatch}`);
    if (s.contentRisk) lines.push(`- analysis.contentRisk: ${s.contentRisk}`);
    if (s.possibleAngles && s.possibleAngles.length > 0) {
      lines.push(`- analysis.possibleAngles: ${s.possibleAngles.join(" | ")}`);
    }
    if (s.evidence && s.evidence.length > 0) {
      lines.push(
        `- analysis.evidence (with provenance): ${s.evidence
          .map((e) => `[${e.source}] ${e.claim}`)
          .join(" | ")}`
      );
    }
    sections.push(`Linked signal (decision context + analysis):\n${lines.join("\n")}`);
  } else {
    sections.push("Linked signal: (none — manually created content)");
  }

  sections.push(`Brand context:
- targetAudience: ${input.brandTargetAudience}
- enabledPlatforms: ${input.brandEnabledPlatforms.join(", ")}`);

  const pillars =
    input.pillars.length > 0
      ? input.pillars
          .map(
            (p) =>
              `- ${p.name}${p.description ? `: ${p.description}` : ""}${p.primaryGoal ? ` (goal: ${p.primaryGoal})` : ""}`
          )
          .join("\n")
      : "- (none configured)";
  sections.push(`Content pillars:\n${pillars}`);

  if (input.playbook) {
    const p = input.playbook;
    const parts = [
      p.voice && `- voice: ${p.voice}`,
      p.titleStyle && `- titleStyle: ${p.titleStyle}`,
      p.hookStyle && `- hookStyle: ${p.hookStyle}`,
      p.structure && `- structure: ${p.structure}`,
      p.cta && `- cta: ${p.cta}`,
      p.avoid && p.avoid.length > 0 && `- avoid: ${p.avoid.join("; ")}`,
    ].filter(Boolean);
    if (parts.length > 0) {
      sections.push(
        `Platform playbook (strategy context ONLY — never cite as evidence):\n${parts.join("\n")}`
      );
    }
  }

  return {
    system: SYSTEM_PROMPT,
    user: `Draft the Brief for this content project.\n\n${sections.join("\n\n")}`,
  };
}

// ─── Core ──────────────────────────────────────────────

export type DraftBriefResult =
  | { ok: true; draft: AIBriefDraft }
  | { ok: false; error: string };

const MAX_MODEL_REQUESTS = 2;

export async function draftBrief(
  input: BriefDraftInput,
  provider: AIProvider
): Promise<DraftBriefResult> {
  const { system, user } = buildBriefDraftPrompt(input);
  let lastError = "Unknown AI failure";

  for (let attempt = 1; attempt <= MAX_MODEL_REQUESTS; attempt++) {
    const userPrompt =
      attempt === 1
        ? user
        : `${user}\n\nYour previous response was rejected: ${lastError}\nReturn ONLY a valid JSON object matching the required shape.`;

    let raw: string;
    try {
      raw = await provider.generateStructured({ system, user: userPrompt });
    } catch (err) {
      lastError = err instanceof Error ? err.message : "AI provider error";
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      lastError = "AI returned invalid JSON";
      continue;
    }

    const result = aiBriefDraftSchema.safeParse(parsed);
    if (!result.success) {
      lastError = `AI output failed validation: ${result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")
        .slice(0, 300)}`;
      continue;
    }

    return { ok: true, draft: result.data };
  }

  return { ok: false, error: lastError };
}
