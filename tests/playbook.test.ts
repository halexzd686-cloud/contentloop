import { describe, it, expect } from "vitest";

import {
  playbookUpsertSchema,
  aiPlaybookDraftSchema,
} from "@/lib/validation/playbook";

/**
 * M8 Playbook — validation tests (AGENTS §21, PRD §15.4).
 * Human save (upsert) allows empty fields as null; AI draft requires
 * all seven fields present and well-formed. AI output is never
 * persisted — schema rejection is the boundary.
 */

const DRAFT = {
  voice: "口语化、真诚",
  titleStyle: "数字化列表",
  hookStyle: "首句痛点",
  structure: "封面→钩子→价值点→CTA",
  cta: "关注获取更多",
  avoid: ["夸大宣传", "未经验证的说法"],
  goodExamples: [{ title: "案例 A", note: "结构清晰", url: "https://example.com/a" }],
};

const FULL = { platform: "xiaohongshu", ...DRAFT };

describe("playbookUpsertSchema (human save)", () => {
  it("accepts a full playbook", () => {
    const r = playbookUpsertSchema.safeParse(FULL);
    expect(r.success).toBe(true);
  });

  it("accepts all-empty fields as null (never fabricated defaults)", () => {
    const r = playbookUpsertSchema.safeParse({
      platform: "bilibili",
      voice: null,
      titleStyle: null,
      hookStyle: null,
      structure: null,
      cta: null,
      avoid: null,
      goodExamples: null,
    });
    expect(r.success).toBe(true);
  });

  it("rejects unknown platforms", () => {
    expect(
      playbookUpsertSchema.safeParse({ ...FULL, platform: "tiktok" }).success
    ).toBe(false);
  });

  it("rejects identity/extra fields (strict)", () => {
    expect(
      playbookUpsertSchema.safeParse({ ...FULL, id: "x", brandId: "y" }).success
    ).toBe(false);
  });

  it("rejects invalid example URL and missing example title", () => {
    expect(
      playbookUpsertSchema.safeParse({
        ...FULL,
        goodExamples: [{ title: "A", url: "not-a-url" }],
      }).success
    ).toBe(false);
    expect(
      playbookUpsertSchema.safeParse({
        ...FULL,
        goodExamples: [{ title: "" }],
      }).success
    ).toBe(false);
  });
});

describe("aiPlaybookDraftSchema (AI draft boundary)", () => {
  it("accepts a complete draft", () => {
    expect(aiPlaybookDraftSchema.safeParse(DRAFT).success).toBe(true);
  });

  it("rejects missing fields — the model must take a position on each", () => {
    const noVoice = { ...DRAFT, voice: undefined };
    expect(aiPlaybookDraftSchema.safeParse(noVoice).success).toBe(false);
  });

  it("rejects null fields in drafts (null is a human-save concept)", () => {
    expect(
      aiPlaybookDraftSchema.safeParse({ ...DRAFT, voice: null }).success
    ).toBe(false);
  });

  it("rejects extra keys (strict)", () => {
    expect(
      aiPlaybookDraftSchema.safeParse({ ...DRAFT, summary: "extra" }).success
    ).toBe(false);
  });
});
