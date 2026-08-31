/**
 * WorkflowSnapshot — M1.6 workflow state-sync architecture.
 *
 * Every low-frequency workflow mutation (Send to Review / Withdraw /
 * Approve for Publishing / Return to Draft / Submit to Review /
 * Edit Brief / Approve Brief / Return to Editing / Pipeline drag)
 * returns ONE authoritative snapshot in its mutation response.
 * The client applies it through a single apply function — no second
 * full-detail GET, no per-panel patching.
 *
 * Deliberately small: only what workflow UI consumes. Editing
 * payloads (brief fields, master modules, version data) are NOT
 * included — they are never touched by workflow transitions.
 */

export interface WorkflowVersionState {
  id: string;
  platform: string;
  status: string;
}

export interface WorkflowReviewState {
  platformVersionId: string;
  factsConfirmed: boolean;
  titleCoverMatch: boolean;
  platformFitConfirmed: boolean;
  riskChecked: boolean;
  humanReviewed: boolean;
  reviewerId: string | null;
  approvedAt: string | null;
}

export interface WorkflowBriefState {
  status: string;
  approvedAt: string | null;
  approvedBy: string | null;
}

export interface WorkflowSnapshot {
  content: { id: string; status: string };
  brief: WorkflowBriefState | null;
  hasMaster: boolean;
  versions: WorkflowVersionState[];
  reviews: WorkflowReviewState[];
}

/**
 * Stale-response protection: every workflow action gets a monotonically
 * increasing revision at START time. Only the latest action's response
 * may be applied — an older response arriving later is dropped.
 */
export function isLatestWorkflowRevision(
  actionRevision: number,
  latestStartedRevision: number
): boolean {
  return actionRevision >= latestStartedRevision;
}

/**
 * Client-side snapshot application for the versions list: statuses
 * come from the snapshot; editing payloads (data) are preserved from
 * current state. Versions unknown to local state are appended.
 */
export interface VersionLike {
  id: string;
  platform: string;
  status: string;
}

export function applyVersionsSnapshot<T extends VersionLike>(
  prev: T[],
  snapVersions: WorkflowVersionState[]
): T[] {
  return snapVersions.map((v) => {
    const old = prev.find((p) => p.id === v.id);
    return old
      ? { ...old, status: v.status }
      : ({ id: v.id, platform: v.platform, status: v.status } as T);
  });
}
