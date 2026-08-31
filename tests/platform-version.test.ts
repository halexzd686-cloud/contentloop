import { describe, it, expect } from "vitest";

import {
  SAVE_SCHEMAS,
  PROPOSAL_SCHEMAS,
  emptyPlatformData,
  normalizePlatformData,
  isPlatform,
  type Platform,
} from "@/lib/validation/platform-version";
import {
  adaptPlatform,
  buildAdaptPrompt,
  type AdaptPlatformInput,
} from "@/lib/ai/adapt-platform";
import type { AIProvider } from "@/lib/ai/provider";
import { buildDefaultModules } from "@/lib/validation/master";

/**
 * M1.5 Platform Versions — validation + AI adaptation boundary tests.
 * API-level semantics (POST create / PUT 404 / locked 409) are covered
 * by the Supabase smoke test; here we cover schemas, canonical shape,
 * AI proposal validation and prompt boundaries.
 */

// ─── Fixtures ──────────────────────────────────────────

const VALID_XHS = {
  title: "实测 Claude Agent",
  coverCopy: "真实工作流测试",
  opening: "最近我们把它接进了内容流水线",
  body: "正文内容……",
  cta: "欢迎评论区交流",
  tags: ["AI", "内容运营"],
};

const VALID_BILIBILI = {
  title: "Claude Agent 实测",
  coverCopy: "真实测评",
  openingHook: "这期我们不做参数党",
  script: "完整脚本……",
  chapters: ["开场", "测试", "结论"],
  description: "简介……",
};

const VALID_DOUYIN = {
  hook: "3 秒告诉你结论",
  script: "短视频脚本……",
  rhythmNotes: "前 3 秒 hook，中段加快",
  cta: "关注看后续",
};

function makeInput(overrides: Partial<AdaptPlatformInput> = {}): AdaptPlatformInput {
  return {
    targetPlatform: "xiaohongshu",
    content: { title: "Claude Agent 实测" },
    brief: {
      targetAudience: "AI 工具早期用户",
      userProblem: "评测多为参数罗列",
      coreQuestion: "真实工作流里好用吗",
      mainAngle: "真实流水线实测",
      contentPromise: "给出实操结论",
      keyEvidence: "团队实测记录",
      differentiation: "真实使用而非功能列表",
      cta: "试用并反馈",
    },
    masterModules: buildDefaultModules(() => "id").map((m, i) => ({
      ...m,
      id: `m${i}`,
      content: m.type === "hook" ? "实测开场" : `模块内容 ${i}`,
    })),
    signal: {
      title: "Claude Agent 实测",
      summary: "信号摘要",
      sourceUrl: "https://example.com/article",
      selectedAngle: "实测角度",
      primaryPlatform: "xiaohongshu",
    },
    brandTargetAudience: "AI 工具早期用户",
    playbook: null,
    existingData: null,
    ...overrides,
  };
}

function stubProvider(respond: () => string | Error): {
  provider: AIProvider;
  calls: () => number;
} {
  let n = 0;
  return {
    calls: () => n,
    provider: {
      async generateStructured() {
        n += 1;
        const r = respond();
        if (r instanceof Error) throw r;
        return r;
      },
    },
  };
}

// ─── Platform guard ────────────────────────────────────

describe("isPlatform", () => {
  it("accepts the three V1 platforms only", () => {
    expect(isPlatform("xiaohongshu")).toBe(true);
    expect(isPlatform("bilibili")).toBe(true);
    expect(isPlatform("douyin")).toBe(true);
    expect(isPlatform("tiktok")).toBe(false);
    expect(isPlatform("youtube")).toBe(false);
  });
});

// ─── Human save schemas ────────────────────────────────

describe("human save schemas", () => {
  it("accepts valid canonical data for all three platforms", () => {
    expect(SAVE_SCHEMAS.xiaohongshu.safeParse(VALID_XHS).success).toBe(true);
    expect(SAVE_SCHEMAS.bilibili.safeParse(VALID_BILIBILI).success).toBe(true);
    expect(SAVE_SCHEMAS.douyin.safeParse(VALID_DOUYIN).success).toBe(true);
  });

  it("allows incomplete human drafts (empty strings / empty arrays)", () => {
    expect(SAVE_SCHEMAS.xiaohongshu.safeParse(emptyPlatformData("xiaohongshu")).success).toBe(true);
    expect(SAVE_SCHEMAS.bilibili.safeParse(emptyPlatformData("bilibili")).success).toBe(true);
    expect(SAVE_SCHEMAS.douyin.safeParse(emptyPlatformData("douyin")).success).toBe(true);
  });

  it("rejects unknown keys (strict shape, no Record<string, unknown>)", () => {
    const r = SAVE_SCHEMAS.xiaohongshu.safeParse({ ...VALID_XHS, hack: "x" });
    expect(r.success).toBe(false);
  });

  it("rejects missing canonical keys", () => {
    const rest = { ...VALID_XHS } as Record<string, unknown>;
    delete rest.body;
    expect(SAVE_SCHEMAS.xiaohongshu.safeParse(rest).success).toBe(false);
  });

  it("rejects tags that are not a string array", () => {
    expect(
      SAVE_SCHEMAS.xiaohongshu.safeParse({ ...VALID_XHS, tags: "AI" }).success
    ).toBe(false);
    expect(
      SAVE_SCHEMAS.xiaohongshu.safeParse({ ...VALID_XHS, tags: [1, 2] }).success
    ).toBe(false);
  });

  it("rejects invalid bilibili chapters shape", () => {
    expect(
      SAVE_SCHEMAS.bilibili.safeParse({ ...VALID_BILIBILI, chapters: "开场" }).success
    ).toBe(false);
  });
});

// ─── AI proposal schemas ───────────────────────────────

describe("AI proposal schemas", () => {
  it("requires non-empty title/body (xiaohongshu)", () => {
    expect(
      PROPOSAL_SCHEMAS.xiaohongshu.safeParse({ ...VALID_XHS, title: "  " }).success
    ).toBe(false);
    expect(
      PROPOSAL_SCHEMAS.xiaohongshu.safeParse({ ...VALID_XHS, body: "" }).success
    ).toBe(false);
  });

  it("requires non-empty script (bilibili / douyin)", () => {
    expect(
      PROPOSAL_SCHEMAS.bilibili.safeParse({ ...VALID_BILIBILI, script: "" }).success
    ).toBe(false);
    expect(
      PROPOSAL_SCHEMAS.douyin.safeParse({ ...VALID_DOUYIN, script: "" }).success
    ).toBe(false);
  });

  it("accepts valid proposals", () => {
    expect(PROPOSAL_SCHEMAS.xiaohongshu.safeParse(VALID_XHS).success).toBe(true);
    expect(PROPOSAL_SCHEMAS.bilibili.safeParse(VALID_BILIBILI).success).toBe(true);
    expect(PROPOSAL_SCHEMAS.douyin.safeParse(VALID_DOUYIN).success).toBe(true);
  });
});

// ─── Canonical shape ───────────────────────────────────

describe("canonical platform data", () => {
  it("emptyPlatformData carries the full canonical key set", () => {
    expect(Object.keys(emptyPlatformData("xiaohongshu")).sort()).toEqual(
      ["body", "coverCopy", "cta", "opening", "tags", "title"].sort()
    );
    expect(Object.keys(emptyPlatformData("bilibili")).sort()).toEqual(
      ["chapters", "coverCopy", "description", "openingHook", "script", "title"].sort()
    );
    expect(Object.keys(emptyPlatformData("douyin")).sort()).toEqual(
      ["cta", "hook", "rhythmNotes", "script"].sort()
    );
  });

  it("normalize fills missing keys and drops unknown keys", () => {
    const n = normalizePlatformData("xiaohongshu", {
      title: "T",
      hack: "drop me",
    });
    expect(n).toEqual({
      title: "T",
      coverCopy: "",
      opening: "",
      body: "",
      cta: "",
      tags: [],
    });
  });

  it("normalize coerces wrong-typed values to canonical defaults", () => {
    const n = normalizePlatformData("bilibili", {
      title: 42,
      chapters: ["a", "", 7, "b"],
    });
    expect(n).toEqual({
      title: "",
      coverCopy: "",
      openingHook: "",
      script: "",
      chapters: ["a", "b"],
      description: "",
    });
  });
});

// ─── AI adaptation ─────────────────────────────────────

describe("adaptPlatform", () => {
  it("returns a normalized proposal for valid AI JSON", async () => {
    const { provider, calls } = stubProvider(() =>
      JSON.stringify({ ...VALID_XHS, extra: "dropped" })
    );
    const r = await adaptPlatform(makeInput(), provider);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.proposal).toEqual(VALID_XHS);
      expect(Object.keys(r.proposal as object)).not.toContain("extra");
    }
    expect(calls()).toBe(1);
  });

  it("retries once on invalid JSON, then succeeds (max 2 requests)", async () => {
    let i = 0;
    const { provider, calls } = stubProvider(() =>
      i++ === 0 ? "not json{{" : JSON.stringify(VALID_XHS)
    );
    const r = await adaptPlatform(makeInput(), provider);
    expect(r.ok).toBe(true);
    expect(calls()).toBe(2);
  });

  it("fails after 2 requests on persistent schema failure — never a third call", async () => {
    const { provider, calls } = stubProvider(() =>
      JSON.stringify({ title: "only title" })
    );
    const r = await adaptPlatform(makeInput(), provider);
    expect(r.ok).toBe(false);
    expect(calls()).toBe(2);
  });

  it("fails after 2 requests on persistent provider errors", async () => {
    const { provider, calls } = stubProvider(() => new Error("boom"));
    const r = await adaptPlatform(makeInput(), provider);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeTruthy();
    expect(calls()).toBe(2);
  });

  it("prompt states the model has NOT read the sourceUrl page", () => {
    const { user } = buildAdaptPrompt(makeInput());
    expect(user).toContain("you have NOT read this page");
  });

  it("prompt marks playbook as strategy context, never evidence", () => {
    const { user } = buildAdaptPrompt(
      makeInput({
        playbook: {
          voice: "克制专业",
          titleStyle: "短标题",
          hookStyle: null,
          structure: null,
          cta: null,
          avoid: ["夸张承诺"],
          goodExamples: null,
        },
      })
    );
    expect(user).toContain("strategy context ONLY");
    expect(user).toContain("克制专业");
  });

  it("prompt explicitly notes missing playbook instead of fabricating one", () => {
    const { user } = buildAdaptPrompt(makeInput({ playbook: null }));
    expect(user).toContain("Platform playbook: NONE");
    expect(user).toContain("Do not fabricate playbook rules");
  });

  it("re-adapt includes the existing human version as the base", () => {
    const { user } = buildAdaptPrompt(
      makeInput({ existingData: VALID_XHS })
    );
    expect(user).toContain("Current human-edited version");
    expect(user).toContain("实测 Claude Agent");
    expect(user).toContain("Re-adapt");
  });

  it("initial adapt does not include a re-adapt base", () => {
    const { user } = buildAdaptPrompt(makeInput({ existingData: null }));
    expect(user).not.toContain("Current human-edited version");
  });

  it("each platform adapts with its own schema (isolation)", async () => {
    for (const p of ["xiaohongshu", "bilibili", "douyin"] as Platform[]) {
      const valid =
        p === "xiaohongshu"
          ? VALID_XHS
          : p === "bilibili"
            ? VALID_BILIBILI
            : VALID_DOUYIN;
      const { provider } = stubProvider(() => JSON.stringify(valid));
      const r = await adaptPlatform(makeInput({ targetPlatform: p }), provider);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.proposal).toEqual(valid);
    }
  });
});
