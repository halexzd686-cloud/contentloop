import {
  PROPOSAL_SCHEMAS,
  normalizePlatformData,
  type Platform,
  type PlatformData,
} from "@/lib/validation/platform-version";
import type { AIProvider } from "@/lib/ai/provider";
import type { MasterModule } from "@/lib/validation/master";

/**
 * AI Platform Adaptation — M1.5
 *
 * Adapts the platform-neutral Content Master into one platform's
 * structured version. The result is a PROPOSAL only: it is returned
 * to the caller and never persisted here. A human must explicitly
 * Apply (initial adapt) or Accept (re-adapt) before any DB write.
 *
 * One-way flow: ContentMaster → PlatformVersion. Never writes back.
 *
 * Retry budget: one Adapt click = at most 2 model requests.
 */

// ─── Input ─────────────────────────────────────────────

export interface AdaptPlatformInput {
  targetPlatform: Platform;
  content: {
    title: string;
  };
  brief: {
    targetAudience: string;
    userProblem: string;
    coreQuestion: string;
    mainAngle: string;
    contentPromise: string;
    keyEvidence: string;
    differentiation: string;
    cta: string;
  };
  /** The platform-neutral master — the PRIMARY content source. */
  masterModules: MasterModule[];
  signal: {
    title: string;
    summary: string | null;
    /** Metadata only — the model has NOT read the webpage behind it. */
    sourceUrl: string | null;
    selectedAngle: string | null;
    primaryPlatform: string | null;
  } | null;
  brandTargetAudience: string;
  /**
   * Platform Playbook = strategy context (voice / title style / structure /
   * CTA / avoid). It is NEVER a source of factual evidence.
   * null when the platform has no custom playbook.
   */
  playbook: {
    voice: string | null;
    titleStyle: string | null;
    hookStyle: string | null;
    structure: string | null;
    cta: string | null;
    avoid: string[] | null;
    goodExamples: { title: string; note?: string | null }[] | null;
  } | null;
  /**
   * Re-adapt: the current human-edited version. The proposal should
   * improve on it, not contradict its facts. null for initial adapt.
   */
  existingData: PlatformData | null;
}

// ─── Prompt ────────────────────────────────────────────

const PLATFORM_GUIDE: Record<Platform, string> = {
  xiaohongshu: `Target platform: Xiaohongshu (小红书) — lifestyle/experience note.
Fields:
- title: short, curiosity-driven note title (required)
- coverCopy: short text shown on the cover image
- opening: 1-2 sentence hook opening
- body: the main note content (required)
- cta: closing call-to-action
- tags: array of topic hashtags without the # symbol`,
  bilibili: `Target platform: Bilibili (B站) — mid/long-form video.
Fields:
- title: video title (required)
- coverCopy: short cover text
- openingHook: the first-seconds hook of the video
- script: the full video script (required)
- chapters: array of chapter titles in order
- description: video description / show notes`,
  douyin: `Target platform: Douyin (抖音) — short-form video.
Fields:
- hook: the first-seconds hook
- script: the full short-video script (required)
- rhythmNotes: pacing / beat notes for editing
- cta: closing call-to-action`,
};

const SYSTEM_PROMPT = `You are a content adaptation assistant for a small content team.
You adapt a platform-neutral Content Master into ONE platform's structured version. A human will review, edit and confirm your proposal — you only propose.

You respond ONLY with a single JSON object matching the exact field shape given for the target platform. All canonical keys must be present; use "" or [] only when a field genuinely does not apply.

Strict rules:
- The Content Master is the primary source. Adapt, reorganize, compress or expand ITS content — never invent numbers, facts, cases or product capabilities that are not in the supplied material.
- If the Master's evidence module says evidence still needs verification, do NOT upgrade it into a confirmed fact.
- You have NOT read the webpage behind any sourceUrl. Do not claim facts from the URL itself.
- The Platform Playbook (if supplied) is strategy context only: voice, title style, hook style, structure, CTA style, things to avoid. It is NOT a source of factual evidence.
- If no custom playbook is supplied, use generic best-practice structure for the platform.
- Fields marked (required) must be non-empty.
- Write in the language of the Content Master (Chinese input → Chinese output).`;

export function buildAdaptPrompt(input: AdaptPlatformInput): {
  system: string;
  user: string;
} {
  const sections: string[] = [];

  sections.push(PLATFORM_GUIDE[input.targetPlatform]);

  const masterText = input.masterModules
    .map((m) => `### ${m.type}\n${m.content || "(empty)"}`)
    .join("\n\n");
  sections.push(`Content Master (platform-neutral source — PRIMARY material):\n${masterText}`);

  const b = input.brief;
  sections.push(`Approved Brief (strategy contract):
- targetAudience: ${b.targetAudience}
- userProblem: ${b.userProblem}
- coreQuestion: ${b.coreQuestion}
- mainAngle: ${b.mainAngle}
- contentPromise: ${b.contentPromise}
- keyEvidence: ${b.keyEvidence}
- differentiation: ${b.differentiation}
- cta: ${b.cta}`);

  if (input.signal) {
    const s = input.signal;
    sections.push(`Linked signal (context):
- title: ${s.title}
- summary: ${s.summary ?? "(not provided)"}
- sourceUrl: ${s.sourceUrl ?? "(none)"} — you have NOT read this page; it is metadata only.
- selectedAngle: ${s.selectedAngle ?? "(none)"}
- primaryPlatform: ${s.primaryPlatform ?? "(none)"}`);
  }

  sections.push(`Brand target audience: ${input.brandTargetAudience}`);

  if (input.playbook) {
    const p = input.playbook;
    const parts = [
      p.voice && `- voice: ${p.voice}`,
      p.titleStyle && `- titleStyle: ${p.titleStyle}`,
      p.hookStyle && `- hookStyle: ${p.hookStyle}`,
      p.structure && `- structure: ${p.structure}`,
      p.cta && `- cta: ${p.cta}`,
      p.avoid && p.avoid.length > 0 && `- avoid: ${p.avoid.join("; ")}`,
      p.goodExamples &&
        p.goodExamples.length > 0 &&
        `- goodExamples: ${p.goodExamples
          .map((e) => e.title + (e.note ? ` (${e.note})` : ""))
          .join(" | ")}`,
    ].filter(Boolean);
    sections.push(
      parts.length > 0
        ? `Platform playbook (strategy context ONLY — never cite as evidence):\n${parts.join("\n")}`
        : "Platform playbook: (exists but empty — use generic platform structure)"
    );
  } else {
    sections.push(
      "Platform playbook: NONE — use generic best-practice structure for this platform. Do not fabricate playbook rules."
    );
  }

  if (input.existingData) {
    sections.push(`Current human-edited version (re-adapt base — improve it, keep its facts):
${JSON.stringify(input.existingData, null, 2)}`);
  }

  const action = input.existingData
    ? "Re-adapt this platform version from the Content Master."
    : "Adapt the Content Master into this platform's version.";

  return {
    system: SYSTEM_PROMPT,
    user: `${action}\n\n${sections.join("\n\n")}`,
  };
}

// ─── Core ──────────────────────────────────────────────

export type AdaptPlatformResult =
  | { ok: true; proposal: PlatformData }
  | { ok: false; error: string };

const MAX_MODEL_REQUESTS = 2;

export async function adaptPlatform(
  input: AdaptPlatformInput,
  provider: AIProvider
): Promise<AdaptPlatformResult> {
  const { system, user } = buildAdaptPrompt(input);
  const schema = PROPOSAL_SCHEMAS[input.targetPlatform];
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

    const result = schema.safeParse(parsed);
    if (!result.success) {
      lastError = `AI output failed validation: ${result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")
        .slice(0, 300)}`;
      continue;
    }

    return {
      ok: true,
      proposal: normalizePlatformData(input.targetPlatform, result.data),
    };
  }

  return { ok: false, error: lastError };
}
