import { describe, it, expect } from "vitest";

import {
  signalAnalysisSchema,
  computeOverallScore,
  type SignalAnalysis,
} from "@/lib/ai/schemas";
import {
  analyzeSignal,
  buildAnalysisPrompt,
  buildAnalysisUpdate,
  canAnalyzeStatus,
  type SignalAnalysisInput,
} from "@/lib/ai/analyze-signal";
import { AIProviderError, type AIProvider } from "@/lib/ai/provider";

/**
 * M1.2B — Structured Signal Analysis tests.
 * No mock framework: provider is an injected fake function.
 */

// ─── Fixtures ──────────────────────────────────────────

const validAnalysis: SignalAnalysis = {
  whyItMatters: "AI video tools are trending in the creator community.",
  audienceMatch: "Fits the brand's AI-focused creator audience.",
  contentRisk: "Tool may not be mature yet.",
  possibleAngles: ["Hands-on review", "Comparison with CapCut"],
  scores: { audienceFit: 80, timing: 70, contentPotential: 90 },
  evidence: [
    { claim: "Signal title mentions a new AI video tool", source: "signal_input" },
  ],
  confidence: "medium",
};

const baseInput: SignalAnalysisInput = {
  inputType: "url",
  title: "New AI video editing tool gaining traction",
  summary: "Community discussion about an emerging AI video editor",
  sourceType: "community",
  sourceUrl: "https://example.com/ai-video-tool",
  publishedAt: null,
  brandTargetAudience: "AI-curious content creators",
  brandEnabledPlatforms: ["xiaohongshu", "bilibili", "douyin"],
  pillars: [
    { name: "AI Tools", description: "Reviews of AI tools", primaryGoal: "growth" },
  ],
};

/** Fake provider returning queued responses or throwing queued errors. */
function fakeProvider(
  script: (string | Error)[]
): { provider: AIProvider; calls: () => number } {
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

// ─── Structured schema ─────────────────────────────────

describe("signalAnalysisSchema", () => {
  it("accepts a valid analysis", () => {
    expect(signalAnalysisSchema.safeParse(validAnalysis).success).toBe(true);
  });

  it("rejects invalid confidence", () => {
    const r = signalAnalysisSchema.safeParse({
      ...validAnalysis,
      confidence: "very_high",
    });
    expect(r.success).toBe(false);
  });

  it("rejects more than 3 possible angles", () => {
    const r = signalAnalysisSchema.safeParse({
      ...validAnalysis,
      possibleAngles: ["a", "b", "c", "d"],
    });
    expect(r.success).toBe(false);
  });

  it("rejects more than 3 evidence items", () => {
    const r = signalAnalysisSchema.safeParse({
      ...validAnalysis,
      evidence: [
        { claim: "a", source: "signal_input" },
        { claim: "b", source: "signal_input" },
        { claim: "c", source: "signal_input" },
        { claim: "d", source: "signal_input" },
      ],
    });
    expect(r.success).toBe(false);
  });

  it("rejects scores outside 0-100", () => {
    for (const bad of [-1, 101]) {
      const r = signalAnalysisSchema.safeParse({
        ...validAnalysis,
        scores: { ...validAnalysis.scores, audienceFit: bad },
      });
      expect(r.success).toBe(false);
    }
  });

  it("rejects non-integer scores (no fake precision)", () => {
    const r = signalAnalysisSchema.safeParse({
      ...validAnalysis,
      scores: { ...validAnalysis.scores, timing: 87.36 },
    });
    expect(r.success).toBe(false);
  });

  it("retains null scores", () => {
    const r = signalAnalysisSchema.safeParse({
      ...validAnalysis,
      scores: { audienceFit: null, timing: 70, contentPotential: 90 },
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.scores.audienceFit).toBeNull();
  });

  it("accepts insufficient_evidence with all null scores and empty angles", () => {
    const r = signalAnalysisSchema.safeParse({
      whyItMatters: null,
      audienceMatch: null,
      contentRisk: null,
      possibleAngles: [],
      scores: { audienceFit: null, timing: null, contentPotential: null },
      evidence: [],
      confidence: "insufficient_evidence",
    });
    expect(r.success).toBe(true);
  });

  it("rejects insufficient_evidence with non-null scores", () => {
    const r = signalAnalysisSchema.safeParse({
      ...validAnalysis,
      confidence: "insufficient_evidence",
    });
    expect(r.success).toBe(false);
  });
});

// ─── Overall score (server-side) ───────────────────────

describe("computeOverallScore", () => {
  it("computes rounded mean: 80/70/90 → 80", () => {
    expect(
      computeOverallScore({ audienceFit: 80, timing: 70, contentPotential: 90 })
    ).toBe(80);
  });

  it("rounds fractional means", () => {
    expect(
      computeOverallScore({ audienceFit: 81, timing: 70, contentPotential: 90 })
    ).toBe(80); // 241/3 = 80.33 → 80
  });

  it("returns null when any dimension is null", () => {
    expect(
      computeOverallScore({ audienceFit: null, timing: 70, contentPotential: 90 })
    ).toBeNull();
    expect(
      computeOverallScore({ audienceFit: null, timing: null, contentPotential: null })
    ).toBeNull();
  });

  it("never converts null to 0", () => {
    const overall = computeOverallScore({
      audienceFit: null,
      timing: 50,
      contentPotential: 50,
    });
    expect(overall).not.toBe(0);
    expect(overall).toBeNull();
  });
});

// ─── Evidence boundary ─────────────────────────────────

describe("evidence boundary", () => {
  it("rejects unsupported evidence source types", () => {
    const r = signalAnalysisSchema.safeParse({
      ...validAnalysis,
      evidence: [{ claim: "The webpage says X", source: "verified_fact" }],
    });
    expect(r.success).toBe(false);
  });

  it("prompt explicitly states the URL was not read", () => {
    const { system, user } = buildAnalysisPrompt(baseInput);
    expect(system).toContain("have NOT read the webpage");
    expect(user).toContain("metadata only");
    expect(user).toContain(baseInput.sourceUrl!);
  });

  it("prompt only carries real system data (no fabricated page content)", () => {
    const { user } = buildAnalysisPrompt(baseInput);
    expect(user).toContain(baseInput.title);
    expect(user).toContain(baseInput.summary!);
    expect(user).toContain(baseInput.brandTargetAudience);
    expect(user).toContain("AI Tools");
  });
});

// ─── Provider behavior + retry budget ──────────────────

describe("analyzeSignal with injected provider", () => {
  it("succeeds on valid JSON", async () => {
    const { provider, calls } = fakeProvider([JSON.stringify(validAnalysis)]);
    const r = await analyzeSignal(baseInput, provider);
    expect(r.ok).toBe(true);
    expect(calls()).toBe(1);
  });

  it("fails after empty responses (max 2 model requests)", async () => {
    const { provider, calls } = fakeProvider([
      new AIProviderError("empty_response", "empty"),
      new AIProviderError("empty_response", "empty"),
    ]);
    const r = await analyzeSignal(baseInput, provider);
    expect(r.ok).toBe(false);
    expect(calls()).toBe(2);
  });

  it("retries malformed JSON once, then fails", async () => {
    const { provider, calls } = fakeProvider(["not json {{{", "still not json"]);
    const r = await analyzeSignal(baseInput, provider);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("invalid JSON");
    expect(calls()).toBe(2);
  });

  it("recovers when the second attempt returns valid JSON", async () => {
    const { provider, calls } = fakeProvider([
      "garbage",
      JSON.stringify(validAnalysis),
    ]);
    const r = await analyzeSignal(baseInput, provider);
    expect(r.ok).toBe(true);
    expect(calls()).toBe(2);
  });

  it("retries schema failure once, then fails", async () => {
    const invalid = JSON.stringify({ ...validAnalysis, confidence: "wrong" });
    const { provider, calls } = fakeProvider([invalid, invalid]);
    const r = await analyzeSignal(baseInput, provider);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("validation");
    expect(calls()).toBe(2);
  });

  it("retries rate limit once, then fails — never 3+ requests", async () => {
    const { provider, calls } = fakeProvider([
      new AIProviderError("rate_limited", "429"),
      new AIProviderError("rate_limited", "429"),
    ]);
    const r = await analyzeSignal(baseInput, provider);
    expect(r.ok).toBe(false);
    expect(calls()).toBe(2);
  });
});

// ─── Persistence mapping ───────────────────────────────

describe("buildAnalysisUpdate", () => {
  it("maps a valid analysis with server-computed overall", () => {
    const u = buildAnalysisUpdate(validAnalysis);
    expect(u.whyItMatters).toBe(validAnalysis.whyItMatters);
    expect(u.audienceFitScore).toBe(80);
    expect(u.topicScore).toBe(80); // round((80+70+90)/3)
    expect(u.analysisConfidence).toBe("medium");
    expect(u.analysisEvidence).toHaveLength(1);
    expect(u.analyzedAt).toBeInstanceOf(Date);
  });

  it("keeps null scores null and overall null — never 0", () => {
    const u = buildAnalysisUpdate({
      whyItMatters: null,
      audienceMatch: null,
      contentRisk: null,
      possibleAngles: [],
      scores: { audienceFit: null, timing: null, contentPotential: null },
      evidence: [],
      confidence: "insufficient_evidence",
    });
    expect(u.audienceFitScore).toBeNull();
    expect(u.timingScore).toBeNull();
    expect(u.contentPotentialScore).toBeNull();
    expect(u.topicScore).toBeNull();
    expect(u.topicScore).not.toBe(0);
    expect(u.analysisConfidence).toBe("insufficient_evidence");
  });

  it("never touches status / decision fields", () => {
    const u = buildAnalysisUpdate(validAnalysis);
    expect(u).not.toHaveProperty("status");
    expect(u).not.toHaveProperty("skipReason");
    expect(u).not.toHaveProperty("selectedAngle");
    expect(u).not.toHaveProperty("primaryPlatform");
    expect(u).not.toHaveProperty("ownerId");
  });
});

// ─── AI status boundary ────────────────────────────────

describe("canAnalyzeStatus", () => {
  it("allows new and reviewing", () => {
    expect(canAnalyzeStatus("new")).toBe(true);
    expect(canAnalyzeStatus("reviewing")).toBe(true);
  });

  it("rejects selected and skipped", () => {
    expect(canAnalyzeStatus("selected")).toBe(false);
    expect(canAnalyzeStatus("skipped")).toBe(false);
  });
});
