import { z } from "zod";

/**
 * PlatformVersion validation — data-model §12 / §13, PRD §8.8
 *
 * Canonical JSONB data shape per platform (frozen M1.5 decision):
 * persisted `data` always carries the full canonical key set —
 * incomplete human drafts use "" / [], never missing keys, never
 * a long markdown string.
 *
 * Two validation layers (same discipline as Brief):
 * - AI proposal schema: strict structured contract (required fields
 *   must be non-empty).
 * - Human save schema: incomplete draft allowed, but shape and field
 *   types must be legal. No Record<string, unknown>.
 */

export const PLATFORMS = ["xiaohongshu", "bilibili", "douyin"] as const;
export type Platform = (typeof PLATFORMS)[number];

export function isPlatform(value: string): value is Platform {
  return (PLATFORMS as readonly string[]).includes(value);
}

/**
 * Formal editability rule (frozen M2.1): the ordinary platform editor
 * is editable ONLY for status = draft. review / approved are read-only
 * (Return to Draft restores draft); published is strictly read-only —
 * no auto-save, no Re-adapt, no mutation path at all.
 */
export function isVersionEditable(status: string | null | undefined): boolean {
  return status === "draft";
}

const text = z.string().max(20000);
const shortText = z.string().max(500);
// Empty entries are allowed at the API boundary (e.g. a just-added tag row);
// normalizePlatformData strips them before persistence.
const tagList = z.array(z.string().max(100)).max(30);
const aiText = z.string().trim().min(1).max(20000);

// ─── Canonical shapes ──────────────────────────────────

export const xiaohongshuSaveSchema = z
  .object({
    title: shortText,
    coverCopy: shortText,
    opening: text,
    body: text,
    cta: shortText,
    tags: tagList,
  })
  .strict();

export const bilibiliSaveSchema = z
  .object({
    title: shortText,
    coverCopy: shortText,
    openingHook: text,
    script: text,
    chapters: tagList,
    description: text,
  })
  .strict();

export const douyinSaveSchema = z
  .object({
    hook: shortText,
    script: text,
    rhythmNotes: text,
    cta: shortText,
  })
  .strict();

export const SAVE_SCHEMAS = {
  xiaohongshu: xiaohongshuSaveSchema,
  bilibili: bilibiliSaveSchema,
  douyin: douyinSaveSchema,
} as const;

export type XiaohongshuData = z.infer<typeof xiaohongshuSaveSchema>;
export type BilibiliData = z.infer<typeof bilibiliSaveSchema>;
export type DouyinData = z.infer<typeof douyinSaveSchema>;
export type PlatformData = XiaohongshuData | BilibiliData | DouyinData;

// ─── AI proposal schemas (stricter contract) ───────────

export const xiaohongshuProposalSchema = z
  .object({
    title: aiText.max(500),
    coverCopy: z.string().max(500),
    opening: z.string().max(20000),
    body: aiText,
    cta: z.string().max(500),
    tags: tagList,
  });

export const bilibiliProposalSchema = z
  .object({
    title: aiText.max(500),
    coverCopy: z.string().max(500),
    openingHook: z.string().max(20000),
    script: aiText,
    chapters: tagList,
    description: z.string().max(20000),
  });

export const douyinProposalSchema = z
  .object({
    hook: z.string().max(500),
    script: aiText,
    rhythmNotes: z.string().max(20000),
    cta: z.string().max(500),
  });

export const PROPOSAL_SCHEMAS = {
  xiaohongshu: xiaohongshuProposalSchema,
  bilibili: bilibiliProposalSchema,
  douyin: douyinProposalSchema,
} as const;

// ─── Canonical empty / normalization ───────────────────

/** Canonical empty draft — structured emptiness, never mock content. */
export function emptyPlatformData(platform: Platform): PlatformData {
  switch (platform) {
    case "xiaohongshu":
      return { title: "", coverCopy: "", opening: "", body: "", cta: "", tags: [] };
    case "bilibili":
      return {
        title: "",
        coverCopy: "",
        openingHook: "",
        script: "",
        chapters: [],
        description: "",
      };
    case "douyin":
      return { hook: "", script: "", rhythmNotes: "", cta: "" };
  }
}

/**
 * Normalize any validated shape to the full canonical key set.
 * Missing keys become "" / []; unknown keys are dropped.
 */
export function normalizePlatformData(
  platform: Platform,
  data: Record<string, unknown>
): PlatformData {
  const empty = emptyPlatformData(platform) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(empty)) {
    const value = data[key];
    if (Array.isArray(empty[key])) {
      out[key] = Array.isArray(value)
        ? value.filter((v): v is string => typeof v === "string" && v.trim() !== "")
        : [];
    } else {
      out[key] = typeof value === "string" ? value : "";
    }
  }
  return out as PlatformData;
}
