import { z } from "zod";

/**
 * Publication validation — data-model §17, PRD §10.2
 *
 * A Publication records that a PlatformVersion was REALLY published
 * on an external platform. All data is human-confirmed:
 * - No auto-generated URLs, no auto "now" timestamps.
 * - platform / contentId / platformVersionId are server-derived from
 *   the PlatformVersion — never user input.
 * - publishedAt: UI sends local-time datetime-local converted to ISO
 *   UTC; a minimal future-time guard (clock skew) applies.
 */

const httpUrl = z
  .string()
  .trim()
  .min(1)
  .max(2000)
  .refine((v) => /^https?:\/\/.+\..+/.test(v), {
    message: "Must be a valid http(s) URL",
  });

/** Allowed future clock skew for publishedAt (2 minutes). */
export const PUBLISHED_AT_FUTURE_SKEW_MS = 2 * 60 * 1000;

const publishedAtField = z
  .string()
  .trim()
  .min(1, "publishedAt is required")
  .refine((v) => !Number.isNaN(new Date(v).getTime()), {
    message: "publishedAt must be a valid datetime",
  })
  .refine(
    (v) =>
      new Date(v).getTime() <= Date.now() + PUBLISHED_AT_FUTURE_SKEW_MS,
    { message: "publishedAt cannot be in the future" }
  );

const editableFields = {
  finalTitle: z.string().trim().min(1).max(500),
  publishedAt: publishedAtField,
  url: httpUrl,
  coverUrl: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .nullable()
    .refine((v) => !v || /^https?:\/\/.+\..+/.test(v), {
      message: "coverUrl must be a valid http(s) URL",
    }),
  notes: z.string().trim().max(2000).optional().nullable(),
};

/** Mark as Published — all required fields human-confirmed. */
export const publicationCreateSchema = z.object(editableFields).strict();

/** Publication correction — same editable field set. Identity immutable. */
export const publicationEditSchema = z.object(editableFields).strict();

export type PublicationCreateInput = z.infer<typeof publicationCreateSchema>;
export type PublicationEditInput = z.infer<typeof publicationEditSchema>;

// ─── Derived helpers ───────────────────────────────────

/** Default finalTitle prefill: platform title, Douyin falls back to Content title. */
export function prefillFinalTitle(
  platform: string,
  versionData: Record<string, unknown>,
  contentTitle: string
): string {
  if (platform === "douyin") return contentTitle;
  const title = versionData.title;
  return typeof title === "string" && title.trim() !== "" ? title : contentTitle;
}

/** 24h / 72h checkpoints are purely derived from publishedAt (no rows). */
export function deriveCheckpoints(publishedAt: string): {
  checkpoint24h: string;
  checkpoint72h: string;
} {
  const base = new Date(publishedAt).getTime();
  return {
    checkpoint24h: new Date(base + 24 * 3600 * 1000).toISOString(),
    checkpoint72h: new Date(base + 72 * 3600 * 1000).toISOString(),
  };
}

/** Publication progress over the target set (active PlatformVersions). */
export function publicationProgress(
  versions: { status: string }[]
): { published: number; total: number } {
  return {
    published: versions.filter((v) => v.status === "published").length,
    total: versions.length,
  };
}
