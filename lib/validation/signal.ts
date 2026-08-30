import { z } from "zod";

/**
 * Signal validation schemas — data-model §6
 * Scores are nullable; never default to 0.
 */

export const createSignalSchema = z.object({
  inputType: z.enum(["url", "idea"]),
  sourceUrl: z.string().url().optional().or(z.literal("")),
  sourceType: z
    .enum(["official", "community", "competitor", "news", "idea", "other"])
    .optional(),
  title: z.string().min(1, "Title is required").max(500),
  summary: z.string().optional().or(z.literal("")),
  publishedAt: z.string().datetime().optional().or(z.literal("")),
});

export const updateSignalStatusSchema = z.object({
  status: z.enum(["new", "reviewing"]),
});

export const signalQuerySchema = z.object({
  status: z.enum(["new", "reviewing", "selected", "skipped"]).optional(),
  search: z.string().optional(),
});

// ─── M1.2A: Skip Flow ────────────────────────────────────────────────────────

export const SKIP_REASONS = [
  "too_late",
  "saturated",
  "low_audience_fit",
  "insufficient_information",
  "high_production_cost",
  "no_clear_angle",
  "other",
] as const;

export const skipSignalSchema = z.object({
  status: z.literal("skipped"),
  skipReason: z.enum(SKIP_REASONS),
});

// ─── M1.2A: Create Content Flow ──────────────────────────────────────────────

export const createContentFromSignalSchema = z.object({
  primaryPlatform: z.enum(["xiaohongshu", "bilibili", "douyin"]),
  selectedAngle: z.string().min(1, "Selected angle is required").max(500),
  ownerId: z.string().uuid("Invalid owner ID"),
});

export type CreateSignalInput = z.infer<typeof createSignalSchema>;
export type UpdateSignalStatusInput = z.infer<typeof updateSignalStatusSchema>;
export type SignalQuery = z.infer<typeof signalQuerySchema>;
export type SkipSignalInput = z.infer<typeof skipSignalSchema>;
export type CreateContentFromSignalInput = z.infer<
  typeof createContentFromSignalSchema
>;
