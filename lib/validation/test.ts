import { z } from "zod";

/**
 * Test validation — M3.1 (data-model §23, AGENTS §19).
 *
 * Test identity = Brand + Platform + Primary Metric + Checkpoint +
 * method/hypothesis. Client never submits status (server = running),
 * outcome, conclusion, concludedAt, or any result data.
 */

export const TEST_METHODS = [
  "ab",
  "sequential",
  "before_after",
  "content_comparison",
] as const;

export const TEST_ROLES = ["control", "variant", "comparison"] as const;

export const createTestSchema = z
  .object({
    platform: z.enum(["xiaohongshu", "bilibili", "douyin"]),
    checkpoint: z.enum(["24h", "72h"]),
    method: z.enum(TEST_METHODS),
    title: z.string().trim().min(1).max(500),
    hypothesis: z.string().trim().min(1).max(2000),
    change: z.string().trim().min(1).max(2000),
    primaryMetricKey: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .regex(/^[a-z][a-z0-9_]*$/, "invalid metric key"),
    keepConsistent: z.string().trim().max(2000).nullable().optional(),
    compareWith: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();

export type CreateTestInput = z.infer<typeof createTestSchema>;

/** Running tests may edit descriptive fields only. Core definition is locked. */
export const patchTestSchema = z
  .object({
    title: z.string().trim().min(1).max(500).optional(),
    keepConsistent: z.string().trim().max(2000).nullable().optional(),
    compareWith: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();

export type PatchTestInput = z.infer<typeof patchTestSchema>;

export const attachPublicationSchema = z
  .object({
    publicationId: z.string().uuid(),
    role: z.enum(TEST_ROLES).default("comparison"),
  })
  .strict();

export type AttachPublicationInput = z.infer<typeof attachPublicationSchema>;

/**
 * M4.2 — Create Test dialog submittability (pure).
 *
 * Method is part of the locked Test identity, so it must be an
 * explicit human choice: the dialog starts with method unset
 * ("— select —") and this gate keeps Confirm disabled until one is
 * picked. The diagnosis entry prefills only platform/checkpoint —
 * never method.
 */
export function createTestFormSubmittable(input: {
  method: string;
  title: string;
  hypothesis: string;
  change: string;
  primaryMetricKey: string;
}): boolean {
  return (
    (TEST_METHODS as readonly string[]).includes(input.method) &&
    input.title.trim() !== "" &&
    input.hypothesis.trim() !== "" &&
    input.change.trim() !== "" &&
    input.primaryMetricKey !== ""
  );
}
