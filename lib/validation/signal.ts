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

export type CreateSignalInput = z.infer<typeof createSignalSchema>;
export type UpdateSignalStatusInput = z.infer<typeof updateSignalStatusSchema>;
export type SignalQuery = z.infer<typeof signalQuerySchema>;
