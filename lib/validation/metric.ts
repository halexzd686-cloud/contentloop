import { z } from "zod";

/**
 * MetricDefinition validation — M2.2.
 *
 * Immutable after creation: key / platform / type. Editable:
 * alias / meaning / caution / isActive; derived (pre-Snapshot) may
 * also edit numeratorKey / denominatorKey / format.
 * Custom derived metrics are allowed; custom raw metrics are NOT.
 */

export const metricFormatEnumValues = ["count", "percentage", "ratio"] as const;

const machineKey = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[a-z][a-z0-9_]*$/, "key must be lowercase snake_case");

const optionalText = z.string().trim().max(2000).nullable().optional();

/** PUT /api/settings/metrics/[id] — editable fields only. */
export const metricEditSchema = z
  .object({
    alias: optionalText,
    meaning: optionalText,
    caution: optionalText,
    isActive: z.boolean().optional(),
    numeratorKey: machineKey.optional(),
    denominatorKey: machineKey.optional(),
    format: z.enum(metricFormatEnumValues).optional(),
  })
  .strict();

/** POST /api/settings/metrics/derived — custom derived metric. */
export const derivedCreateSchema = z
  .object({
    platform: z.enum(["xiaohongshu", "bilibili", "douyin"]),
    displayName: z.string().trim().min(1).max(255),
    alias: optionalText,
    numeratorKey: machineKey,
    denominatorKey: machineKey,
    format: z.enum(["percentage", "ratio"]),
    meaning: optionalText,
    caution: optionalText,
  })
  .strict();

export type MetricEditInput = z.infer<typeof metricEditSchema>;
export type DerivedCreateInput = z.infer<typeof derivedCreateSchema>;

/**
 * Stable machine key for custom derived metrics (server-generated at
 * creation; immutable afterwards — display-name edits never re-key).
 */
export function generateCustomKey(
  displayName: string,
  randomSuffix: () => string = () =>
    Math.random().toString(36).slice(2, 6)
): string {
  const slug = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  const base = slug.length > 0 ? slug : "metric";
  return `custom_${base}_${randomSuffix()}`;
}
