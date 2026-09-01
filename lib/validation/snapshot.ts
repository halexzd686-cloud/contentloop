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

export const CHECKPOINTS = ["24h", "72h"] as const;
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

export const CHECKPOINT_OFFSET_MS: Record<Checkpoint, number> = {
  "24h": 24 * 3600 * 1000,
  "72h": 72 * 3600 * 1000,
};

/** Small tolerance for observation-vs-target clock differences. */
export const CHECKPOINT_TOLERANCE_MS = 5 * 60 * 1000;

/** Future clock skew allowed for capturedAt (2 minutes). */
export const CAPTURED_AT_FUTURE_SKEW_MS = 2 * 60 * 1000;

export function checkpointDueAt(
  publishedAt: string | Date,
  checkpoint: Checkpoint
): Date {
  return new Date(
    new Date(publishedAt).getTime() + CHECKPOINT_OFFSET_MS[checkpoint]
  );
}

/**
 * UI status derivation (no DB status field):
 * - snapshot exists → Submitted
 * - no snapshot + now < dueAt → Not Due
 * - no snapshot + now >= dueAt → Due
 */
export function checkpointStatus(
  publishedAt: string | Date,
  checkpoint: Checkpoint,
  hasSnapshot: boolean,
  now: Date = new Date()
): "submitted" | "not_due" | "due" {
  if (hasSnapshot) return "submitted";
  return now.getTime() >= checkpointDueAt(publishedAt, checkpoint).getTime()
    ? "due"
    : "not_due";
}

/**
 * Server timing gate: the observation time (capturedAt) must be at or
 * after the checkpoint target (minus tolerance). Submission time is
 * irrelevant — late entry with an on-time capture is legitimate.
 */
export function isCaptureOnTime(
  publishedAt: string | Date,
  checkpoint: Checkpoint,
  capturedAt: string | Date
): boolean {
  const due = checkpointDueAt(publishedAt, checkpoint).getTime();
  return (
    new Date(capturedAt).getTime() >= due - CHECKPOINT_TOLERANCE_MS
  );
}
