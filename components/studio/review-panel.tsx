"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock, RefreshCw, Undo2, Check, Send } from "lucide-react";
import type { Platform } from "@/lib/validation/platform-version";
import {
  isChecklistComplete,
  type ReviewChecklist,
} from "@/lib/validation/review";
import { ChecklistEditor } from "@/lib/checklist-editor";
import type { SaveQueueState } from "@/lib/save-queue";
import type { WorkflowSnapshot } from "@/lib/workflow-snapshot";

/**
 * Studio Review tab — M1.6.
 *
 * Human-only review: five checklist items per ACTIVE PlatformVersion.
 * AI has no write path here.
 *
 * Interaction model (fixed after browser-acceptance blocker):
 * - Checkbox clicks update local state immediately; persistence is
 *   debounced (~300ms) and serialized per platform (ChecklistEditor +
 *   SaveQueue). Saving NEVER blocks further clicks.
 * - Checklist saves do NOT refetch the content; local state is
 *   authoritative for the editing session. Stale acks can't roll back.
 * - Approve for Publishing flushes every pending save first; a failed
 *   flush blocks approve (the server re-verifies regardless).
 */

export interface ReviewVersion {
  id: string;
  platform: Platform;
  status: string;
}

export type ReviewRow = WorkflowSnapshot["reviews"][number];

const PLATFORM_LABEL: Record<string, string> = {
  xiaohongshu: "Xiaohongshu",
  bilibili: "Bilibili",
  douyin: "Douyin",
};

const CHECKLIST_ITEMS: { key: keyof ReviewChecklist; label: string }[] = [
  { key: "factsConfirmed", label: "Facts confirmed" },
  { key: "titleCoverMatch", label: "Title / cover matches body" },
  { key: "platformFitConfirmed", label: "Platform fit confirmed" },
  { key: "riskChecked", label: "No obvious risk" },
  { key: "humanReviewed", label: "Final version human-reviewed" },
];

const EMPTY: ReviewChecklist = {
  factsConfirmed: false,
  titleCoverMatch: false,
  platformFitConfirmed: false,
  riskChecked: false,
  humanReviewed: false,
};

const SAVE_LABEL: Record<SaveQueueState, string> = {
  idle: "",
  pending: "",
  saving: "Saving…",
  saved: "Saved",
  failed: "Save failed",
};

interface ReviewPanelProps {
  contentId: string;
  contentStatus: string;
  briefApproved: boolean;
  hasMaster: boolean;
  versions: ReviewVersion[];
  reviews: ReviewRow[];
  approverName: string | null;
  /** Start a workflow action — returns its revision for stale-guard. */
  beginAction: () => number;
  /** Apply the authoritative snapshot returned by a mutation. */
  onWorkflow: (snap: WorkflowSnapshot, rev: number) => void;
}

export function ReviewPanel({
  contentId,
  contentStatus,
  briefApproved,
  hasMaster,
  versions,
  reviews,
  approverName,
  beginAction,
  onWorkflow,
}: ReviewPanelProps) {
  // busy = explicit structural actions only (send/withdraw/approve/
  // return/submit). Checklist saves NEVER set busy and never block.
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checklists, setChecklists] = useState<Record<string, ReviewChecklist>>({});
  const [saveStates, setSaveStates] = useState<Record<string, SaveQueueState>>({});
  const editorsRef = useRef<Map<string, ChecklistEditor>>(new Map());

  function checklistFromProps(versionId: string): ReviewChecklist {
    const r = reviews.find((rv) => rv.platformVersionId === versionId);
    return r
      ? {
          factsConfirmed: r.factsConfirmed,
          titleCoverMatch: r.titleCoverMatch,
          platformFitConfirmed: r.platformFitConfirmed,
          riskChecked: r.riskChecked,
          humanReviewed: r.humanReviewed,
        }
      : { ...EMPTY };
  }

  // Hydrate local editors from DB data. Checklist saves never trigger a
  // reload, so this only runs after explicit actions / initial load —
  // moments where busy blocked editing and no local edits are in flight.
  useEffect(() => {
    const t = setTimeout(() => {
      editorsRef.current = new Map();
      const next: Record<string, ReviewChecklist> = {};
      for (const v of versions) {
        next[v.id] = checklistFromProps(v.id);
      }
      setChecklists(next);
      setSaveStates({});
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviews, versions]);

  function getEditor(v: ReviewVersion): ChecklistEditor {
    let editor = editorsRef.current.get(v.id);
    if (!editor) {
      editor = new ChecklistEditor(
        checklists[v.id] ?? checklistFromProps(v.id),
        async (snapshot) => {
          const res = await fetch(
            `/api/contents/${contentId}/versions/${v.platform}/review`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ checklist: snapshot }),
            }
          );
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Save failed");
          // Response is an acknowledgement only — never applied to local state.
        },
        (state) => setChecklists((prev) => ({ ...prev, [v.id]: state })),
        (s) => setSaveStates((prev) => ({ ...prev, [v.id]: s }))
      );
      editorsRef.current.set(v.id, editor);
    }
    return editor;
  }

  async function run(action: string, fn: () => Promise<Response>) {
    setBusy(action);
    setError(null);
    const rev = beginAction();
    try {
      const res = await fn();
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      if (data.workflow) onWorkflow(data.workflow, rev);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  async function handleApprove() {
    setBusy("approve");
    setError(null);
    try {
      // Flush every pending checklist save BEFORE approving.
      const results = await Promise.all(
        versions.map((v) => getEditor(v).flush())
      );
      if (results.some((ok) => !ok)) {
        throw new Error(
          "A checklist save failed. Retry the save before approving."
        );
      }
      const rev = beginAction();
      const res = await fetch(`/api/contents/${contentId}/review/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Approve failed");
      if (data.workflow) onWorkflow(data.workflow, rev);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setBusy(null);
    }
  }

  const gateHints: string[] = [];
  if (!briefApproved) gateHints.push("Brief must be approved");
  if (!hasMaster) gateHints.push("Content Master must exist");
  if (versions.length === 0) gateHints.push("Create at least one platform version");

  const anySaveFailed = versions.some((v) => saveStates[v.id] === "failed");
  const aggregateReady =
    versions.length > 0 &&
    versions.every((v) => {
      if (v.status === "approved") return true;
      if (v.status === "review") {
        return isChecklistComplete(checklists[v.id] ?? EMPTY);
      }
      return false;
    });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-ink-primary">Review</h2>
          <Badge variant={contentStatus === "scheduled" ? "mint" : "default"}>
            {contentStatus === "review"
              ? "IN REVIEW"
              : contentStatus === "scheduled"
                ? "APPROVED FOR PUBLISHING"
                : "NOT IN REVIEW"}
          </Badge>
        </div>
        {approverName && (
          <span className="text-xs text-ink-muted">Reviewer: {approverName}</span>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-[8px] border border-danger/20 bg-danger/5 p-3 text-xs text-danger">
          {error}
        </div>
      )}

      {versions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Lock className="h-5 w-5 text-ink-faint" />
          <p className="mt-3 text-sm text-ink-secondary">
            Create at least one platform version first.
          </p>
        </div>
      )}

      {versions.length > 0 && (
        <div className="space-y-4">
          {versions.map((v) => {
            const checklist = checklists[v.id] ?? EMPTY;
            const saveState = saveStates[v.id] ?? "idle";
            const review = reviews.find((r) => r.platformVersionId === v.id);
            const editable = v.status === "review" && busy === null;
            return (
              <div
                key={v.platform}
                className="rounded-[8px] border border-border bg-workspace p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink-primary">
                      {PLATFORM_LABEL[v.platform] ?? v.platform}
                    </span>
                    <Badge variant={v.status === "approved" ? "mint" : "default"}>
                      {v.status}
                    </Badge>
                    {v.status === "review" && (
                      <span
                        className={`text-xs ${
                          saveState === "failed"
                            ? "text-danger"
                            : saveState === "saved"
                              ? "text-mint-600"
                              : "text-ink-muted"
                        }`}
                      >
                        {SAVE_LABEL[saveState]}
                        {saveState === "failed" && (
                          <button
                            className="ml-1 underline"
                            onClick={() => getEditor(v).retry()}
                          >
                            Retry
                          </button>
                        )}
                      </span>
                    )}
                  </div>
                  {(v.status === "review" || v.status === "approved") && (
                    <button
                      className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink-primary disabled:opacity-50"
                      disabled={busy !== null}
                      onClick={() =>
                        run(`rtd-${v.platform}`, () =>
                          fetch(
                            `/api/contents/${contentId}/versions/${v.platform}/return-to-draft`,
                            { method: "POST" }
                          )
                        )
                      }
                    >
                      <Undo2 className="h-3 w-3" />
                      Return to draft
                    </button>
                  )}
                  {v.status === "draft" &&
                    (contentStatus === "review" || contentStatus === "scheduled") && (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={busy !== null}
                        onClick={() =>
                          run(`sub-${v.platform}`, () =>
                            fetch(
                              `/api/contents/${contentId}/versions/${v.platform}/submit-review`,
                              { method: "POST" }
                            )
                          )
                        }
                      >
                        Submit to review
                      </Button>
                    )}
                </div>

                {v.status === "approved" && review?.approvedAt && (
                  <p className="mt-2 text-xs text-ink-muted">
                    Approved {new Date(review.approvedAt).toLocaleString()}
                    {approverName ? ` by ${approverName}` : ""}
                  </p>
                )}

                {v.status === "draft" && (
                  <p className="mt-2 text-xs text-ink-faint">
                    Draft — not part of the current review round.
                  </p>
                )}

                {(v.status === "review" || v.status === "approved") && (
                  <>
                    {v.status === "review" && (
                      <div className="mt-2 flex gap-3">
                        <button
                          className="text-xs text-mint-600 hover:underline disabled:opacity-50"
                          disabled={!editable}
                          onClick={() => getEditor(v).setAll(true)}
                        >
                          Select All
                        </button>
                        <button
                          className="text-xs text-ink-muted hover:underline disabled:opacity-50"
                          disabled={!editable}
                          onClick={() => getEditor(v).setAll(false)}
                        >
                          Clear All
                        </button>
                      </div>
                    )}
                    <div className="mt-2 space-y-1.5">
                      {CHECKLIST_ITEMS.map((item) => (
                        <label
                          key={item.key}
                          className={`flex items-center gap-2 text-sm ${
                            v.status === "review"
                              ? "cursor-pointer text-ink-primary"
                              : "text-ink-muted"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 accent-mint-600"
                            checked={checklist[item.key]}
                            disabled={!editable}
                            onChange={() => getEditor(v).toggle(item.key)}
                          />
                          {item.label}
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 border-t border-border pt-4">
        {contentStatus === "in_progress" && (
          <div>
            {gateHints.length > 0 && (
              <ul className="mb-3 space-y-1 text-xs text-ink-muted">
                {gateHints.map((h) => (
                  <li key={h}>• {h}</li>
                ))}
              </ul>
            )}
            <Button
              variant="primary"
              size="sm"
              disabled={busy !== null || gateHints.length > 0}
              onClick={() =>
                run("send", () =>
                  fetch(`/api/contents/${contentId}/review`, { method: "POST" })
                )
              }
            >
              <Send className="mr-1 h-3 w-3" />
              {busy === "send" ? "Sending…" : "Send to Review"}
            </Button>
          </div>
        )}

        {contentStatus === "review" && (
          <div>
            {anySaveFailed && (
              <p className="mb-2 text-xs text-danger">
                A checklist save failed — retry it before approving.
              </p>
            )}
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                disabled={busy !== null || !aggregateReady || anySaveFailed}
                title={
                  aggregateReady
                    ? "Approve all reviewed platform versions"
                    : "Complete every platform checklist first"
                }
                onClick={handleApprove}
              >
                <Check className="mr-1 h-3 w-3" />
                {busy === "approve" ? "Saving & Approving…" : "Approve for Publishing"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy !== null}
                onClick={() =>
                  run("withdraw", () =>
                    fetch(`/api/contents/${contentId}/review/withdraw`, {
                      method: "POST",
                    })
                  )
                }
              >
                <RefreshCw className="mr-1 h-3 w-3" />
                Withdraw
              </Button>
            </div>
          </div>
        )}

        {contentStatus === "scheduled" && (
          <p className="text-xs text-ink-muted">
            Approved for publishing. The Publication record is created after
            real publishing (later milestone).
          </p>
        )}
      </div>
    </div>
  );
}
