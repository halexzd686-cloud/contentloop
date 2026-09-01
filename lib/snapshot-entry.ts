/**
 * Snapshot entry mode resolution — M2.5 freeze blocker fix.
 *
 * Mode is decided by CHECKPOINT STATUS, never by whether snapshot
 * data happens to be loaded:
 *   due       → create
 *   submitted → edit (callers must resolve the authoritative
 *               snapshot BEFORE opening the editor; a failed read
 *               shows a local error + Retry, never falls back to
 *               create mode)
 *   not_due   → no action
 */

export type CheckpointStatus = "submitted" | "not_due" | "due";
export type SnapshotEntryMode = "create" | "edit";

export function snapshotEntryMode(
  status: CheckpointStatus
): SnapshotEntryMode | null {
  if (status === "due") return "create";
  if (status === "submitted") return "edit";
  return null;
}
