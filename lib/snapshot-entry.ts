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

export interface SnapshotRawInput {
  value: string;
  isNA: boolean;
}

/**
 * Initial form inputs.
 *
 * Create mode (no existing snapshot): every field BLANK + unresolved
 * (value "", isNA false) — never visually "0", never null.
 * Edit mode: stored 0 renders "0"; stored null renders N/A;
 * a key absent from the stored map renders blank.
 */
export function initSnapshotInputs(
  rawKeys: string[],
  existingMetrics: Record<string, number | null> | null
): Record<string, SnapshotRawInput> {
  const out: Record<string, SnapshotRawInput> = {};
  for (const k of rawKeys) {
    const stored = existingMetrics?.[k];
    if (stored === null) {
      out[k] = { value: "", isNA: true };
    } else if (stored !== undefined) {
      out[k] = { value: String(stored), isNA: false };
    } else {
      out[k] = { value: "", isNA: false };
    }
  }
  return out;
}
