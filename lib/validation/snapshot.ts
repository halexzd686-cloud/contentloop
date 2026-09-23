import { z } from "zod";

/**
 * MetricSnapshot validation — M2.3 (data-model §19).
 *
 * Frozen semantics:
 * - No Snapshot row = Not Entered. key=null = explicit N/A.
 *   key=0 = real zero. null never becomes 0.
 * - Persist RAW values only. Derived metrics are computed at read
 *   time by lib/metrics/engine.ts + MetricDefinitions.
 * - capturedAt = when the human actually observed the platform data
 *   (NOT submission time, NOT the checkpoint target). Editable for
 *   correction; never identity.
 * - source is always server-derived "manual" in M2.3.
 */

export const TIMED_CHECKPOINTS = ["24h", "72h"] as const;
export type TimedCheckpoint = (typeof TIMED_CHECKPOINTS)[number];

/**
 * data-model §19.3: "24h" | "72h" | "manual".
 * manual = ad-hoc observation — no target time, never "due", one row
 * per publication (same UNIQUE(publication_id, checkpoint) semantics).
 */
export const CHECKPOINTS = [...TIMED_CHECKPOINTS, "manual"] as const;
export type Checkpoint = (typeof CHECKPOINTS)[number];

export function isCheckpoint(value: string): value is Checkpoint {
  return (CHECKPOINTS as readonly string[]).includes(value);
}

/** Count raw metric value: non-negative finite integer, or explicit null. */
const rawValue = z
  .number()
  .int()
  .nonnegative()
  .finite()
  .nullable();

/** POST/PUT payload: metrics map + capturedAt. Identity never accepted. */
export const snapshotUpsertSchema = z
  .object({
    metrics: z.record(z.string(), rawValue),
    capturedAt: z
      .string()
      .trim()
      .min(1)
      .refine((v) => !Number.isNaN(new Date(v).getTime()), {
        message: "capturedAt must be a valid datetime",
      }),
  })
  .strict();

export type SnapshotUpsertInput = z.infer<typeof snapshotUpsertSchema>;

// ─── Timing ────────────────────────────────────────────

export const CHECKPOINT_OFFSET_MS: Record<TimedCheckpoint, number> = {
  "24h": 24 * 3600 * 1000,
  "72h": 72 * 3600 * 1000,
};

/** Small tolerance for observation-vs-target clock differences. */
export const CHECKPOINT_TOLERANCE_MS = 5 * 60 * 1000;

/** Future clock skew allowed for capturedAt (2 minutes). */
export const CAPTURED_AT_FUTURE_SKEW_MS = 2 * 60 * 1000;

export function checkpointDueAt(
  publishedAt: string | Date,
  checkpoint: TimedCheckpoint
): Date {
  return new Date(
    new Date(publishedAt).getTime() + CHECKPOINT_OFFSET_MS[checkpoint]
  );
}

/**
 * UI status derivation (no DB status field) — timed checkpoints only;
 * manual observations have no schedule and are never "due":
 * - snapshot exists → Submitted
 * - no snapshot + now < dueAt → Not Due
 * - no snapshot + now >= dueAt → Due
 */
export function checkpointStatus(
  publishedAt: string | Date,
  checkpoint: TimedCheckpoint,
  hasSnapshot: boolean,
  now: Date = new Date()
): "submitted" | "not_due" | "due" {
  if (hasSnapshot) return "submitted";
  return now.getTime() >= checkpointDueAt(publishedAt, checkpoint).getTime()
    ? "due"
    : "not_due";
}

/**
 * Server timing gate (timed checkpoints only): the observation time
 * (capturedAt) must be at or after the checkpoint target (minus
 * tolerance). Submission time is irrelevant — late entry with an
 * on-time capture is legitimate.
 */
export function isCaptureOnTime(
  publishedAt: string | Date,
  checkpoint: TimedCheckpoint,
  capturedAt: string | Date
): boolean {
  const due = checkpointDueAt(publishedAt, checkpoint).getTime();
  return (
    new Date(capturedAt).getTime() >= due - CHECKPOINT_TOLERANCE_MS
  );
}

/**
 * M5.3A D01 — manual metric entry count parser.
 *
 * Accepts standard comma thousands separators ("18,600" → 18600) with
 * strict grouping; malformed grouping ("1,2,3", "12,34", ",123",
 * "123,"), negatives, decimals and non-numeric text stay invalid.
 * Same grouping semantics as the CSV/XLSX import normalizer. Blank is
 * NOT invalid here — blank means unresolved (handled by the caller).
 */
export type CountText =
  | { kind: "blank" }
  | { kind: "invalid" }
  | { kind: "number"; value: number };

export function parseCountText(raw: string): CountText {
  const text = raw.trim();
  if (text === "") return { kind: "blank" };
  const normalized = /^\d{1,3}(,\d{3})+$/.test(text)
    ? text.replace(/,/g, "")
    : text;
  if (!/^\d+$/.test(normalized)) return { kind: "invalid" };
  return { kind: "number", value: Number(normalized) };
}
