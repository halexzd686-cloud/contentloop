import { describe, it, expect } from "vitest";

import {
  aiBriefDraftSchema,
  briefSaveSchema,
  briefApproveSchema,
  EMPTY_BRIEF,
} from "@/lib/validation/brief";
import { resolveApprover } from "@/lib/brief";
import {
  draftBrief,
  buildBriefDraftPrompt,
  type BriefDraftInput,
} from "@/lib/ai/draft-brief";
import type { AIProvider } from "@/lib/ai/provider";

/**
 * M1.3 — Studio Brief Core tests.
 * No mock framework: provider is an injected fake function.
 */

// ─── Fixtures ──────────────────────────────────────────

const fullBrief = {
  targetAudience: "AI-curious content creators",
  userProblem: "They don't know which AI video tools are worth adopting",
  coreQuestion: "Is this new AI video editor worth switching to?",
  mainAngle: "Hands-on review with real workflow test",
  contentPromise: "A clear verdict with practical usage examples",
  keyEvidence: "Signal: community discussion shows growing traction",
  differentiation: "We test in a real production pipeline, not a demo",
  cta: "Comment with your current editing tool",
};

const baseInput: BriefDraftInput = {
  content: {
    title: "New AI video editing tool review",
    status: "planning",
    ownerName: "Alex Chen",
    reviewerName: null,
  },
  signal: {
    title: "New AI video editing tool gaining traction",
    summary: "Community discussion about an emerging AI video editor",
    sourceType: "community",
    sourceUrl: "https://example.com/ai-video-tool",
    selectedAngle: "Hands-on review",
    primaryPlatform: "bilibili",
    whyItMatters: "Community traction signals real interest",
    audienceMatch: "Fits AI-curious creators",
    contentRisk: "Tool may be immature",
    possibleAngles: ["Hands-on review", "Comparison"],
    topicScore: 85,
    evidence: [
      { claim: "Title mentions community traction", source: "signal_input" },
    ],
  },
  brandTargetAudience: "AI-curious content creators",
  brandEnabledPlatforms: ["xiaohongshu", "bilibili", "douyin"],
  pillars: [
    { name: "AI Tools", description: "Reviews of AI tools", primaryGoal: "growth" },
  ],
  playbook: {
    voice: "Professional but approachable",
    titleStyle: null,
    hookStyle: null,
    structure: null,
    cta: "Question at the end",
    avoid: null,
  },
};

function fakeProvider(script: (string | Error)[]): {
  provider: AIProvider;
  calls: () => number;
} {
  let calls = 0;
  return {
    calls: () => calls,
    provider: {
      async generateStructured() {
        calls++;
        const next = script[calls - 1];
        if (next === undefined) throw new Error("unexpected extra call");
        if (next instanceof Error) throw next;
        return next;
      },
    },
  };
}

// ─── Validation layers ─────────────────────────────────

describe("brief validation layers", () => {
  it("save schema accepts a partial draft (empty strings allowed)", () => {
    const r = briefSaveSchema.safeParse({
      ...EMPTY_BRIEF,
      mainAngle: "Hands-on review",
    });
    expect(r.success).toBe(true);
  });

  it("approve schema rejects a partial draft", () => {
    const r = briefApproveSchema.safeParse({
      ...EMPTY_BRIEF,
      mainAngle: "Hands-on review",
    });
    expect(r.success).toBe(false);
  });

  it("approve schema rejects whitespace-only required fields", () => {
    const r = briefApproveSchema.safeParse({
      ...fullBrief,
      cta: "   ",
    });
    expect(r.success).toBe(false);
  });

  it("approve schema accepts a complete brief", () => {
    expect(briefApproveSchema.safeParse(fullBrief).success).toBe(true);
  });

  it("AI draft schema requires all 8 fields non-empty", () => {
    expect(aiBriefDraftSchema.safeParse(fullBrief).success).toBe(true);
    expect(
      aiBriefDraftSchema.safeParse({ ...fullBrief, cta: "" }).success
    ).toBe(false);
    const missingField: Record<string, unknown> = { ...fullBrief };
    delete missingField.cta;
    expect(aiBriefDraftSchema.safeParse(missingField).success).toBe(false);
  });
});

// ─── Approver resolution ───────────────────────────────

describe("resolveApprover", () => {
  const reviewer = { id: "r-1", isActive: true };
  const owner = { id: "o-1", isActive: true };

  it("uses reviewer when present and active", () => {
    expect(resolveApprover(reviewer, owner)?.id).toBe("r-1");
  });

  it("falls back to owner when reviewer is absent", () => {
    expect(resolveApprover(null, owner)?.id).toBe("o-1");
  });

  it("falls back to owner when reviewer is inactive", () => {
    expect(resolveApprover({ ...reviewer, isActive: false }, owner)?.id).toBe(
      "o-1"
    );
  });

  it("rejects when neither reviewer nor owner is usable", () => {
    expect(resolveApprover(null, null)).toBeNull();
    expect(
      resolveApprover({ ...reviewer, isActive: false }, { ...owner, isActive: false })
    ).toBeNull();
  });
});

// ─── AI draft: proposal only, bounded retry ────────────

describe("draftBrief", () => {
  it("returns a validated proposal (no persistence involved)", async () => {
    const { provider, calls } = fakeProvider([JSON.stringify(fullBrief)]);
    const r = await draftBrief(baseInput, provider);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.draft.mainAngle).toBe(fullBrief.mainAngle);
    expect(calls()).toBe(1);
  });

  it("rejects invalid JSON after max 2 model requests", async () => {
    const { provider, calls } = fakeProvider(["nope", "still nope"]);
    const r = await draftBrief(baseInput, provider);
    expect(r.ok).toBe(false);
    expect(calls()).toBe(2);
  });

  it("rejects schema-invalid draft (missing field), never 3+ requests", async () => {
    const invalid = JSON.stringify({ ...fullBrief, cta: "" });
    const { provider, calls } = fakeProvider([invalid, invalid]);
    const r = await draftBrief(baseInput, provider);
    expect(r.ok).toBe(false);
    expect(calls()).toBe(2);
  });
});

// ─── Evidence boundary ─────────────────────────────────

describe("brief draft evidence boundary", () => {
  it("playbook is labeled strategy context, never evidence", () => {
    const { system, user } = buildBriefDraftPrompt(baseInput);
    expect(system).toContain("NOT a source of factual evidence");
    expect(user).toContain("strategy context ONLY — never cite as evidence");
  });

  it("keyEvidence rule forbids invented facts and allows explicit insufficiency", () => {
    const { system } = buildBriefDraftPrompt(baseInput);
    expect(system).toContain("NEVER invent numbers, facts");
    expect(system).toContain("Not enough verified evidence yet.");
  });

  it("sourceUrl is metadata only — webpage never claimed as read", () => {
    const { system, user } = buildBriefDraftPrompt(baseInput);
    expect(system).toContain("have NOT read the webpage");
    expect(user).toContain("metadata only");
  });

  it("signal decision context (angle/platform) is included, not copied to content", () => {
    const { user } = buildBriefDraftPrompt(baseInput);
    expect(user).toContain("selectedAngle: Hands-on review");
    expect(user).toContain("primaryPlatform: bilibili");
    expect(user).toContain("status: planning");
  });
});
