"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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
import {
  PublicationModal,
  type PublicationResult,
} from "@/components/studio/publication-modal";
import type { PublicationSummary } from "@/lib/publication";
import {
  MetricSnapshotModal,
  type SnapshotSummary,
} from "@/components/studio/snapshot-modal";
import {
  checkpointDueAt,
  checkpointStatus,
  type Checkpoint,
  type TimedCheckpoint,
} from "@/lib/validation/snapshot";
import { platformLabel, versionStatusLabel } from "@/lib/labels";

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

const CHECKLIST_ITEMS: { key: keyof ReviewChecklist; label: string }[] = [
  { key: "factsConfirmed", label: "事实已核实" },
  { key: "titleCoverMatch", label: "标题/封面与正文一致" },
  { key: "platformFitConfirmed", label: "平台适配已确认" },
  { key: "riskChecked", label: "无明显风险" },
  { key: "humanReviewed", label: "最终版本已人工复核" },
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
  saving: "保存中…",
  saved: "已保存",
  failed: "保存失败",
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
  /** Publication records (M2.1), keyed by platformVersionId. */
  publications: PublicationSummary[];
  /** Full version data for finalTitle prefill (from page state). */
  versionData: Record<string, Record<string, unknown>>;
  contentTitle: string;
  /** Apply a publication mutation result (snapshot + record upsert). */
  onPublication: (result: PublicationResult, rev: number) => void;
  /** Metric snapshots for this content's publications (M2.3). */
  metricSnapshots: SnapshotSummary[];
  /** Upsert a snapshot after Save Snapshot / Save Changes. */
  onSnapshot: (snapshot: SnapshotSummary) => void;
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
  publications,
  versionData,
  contentTitle,
  onPublication,
  metricSnapshots,
  onSnapshot,
}: ReviewPanelProps) {
  // busy = explicit structural actions only (send/withdraw/approve/
  // return/submit). Checklist saves NEVER set busy and never block.
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checklists, setChecklists] = useState<Record<string, ReviewChecklist>>({});
  const [saveStates, setSaveStates] = useState<Record<string, SaveQueueState>>({});
  const editorsRef = useRef<Map<string, ChecklistEditor>>(new Map());
  const [pubModal, setPubModal] = useState<{ platform: Platform; edit: boolean } | null>(null);
  const [snapModal, setSnapModal] = useState<{ publication: PublicationSummary; checkpoint: Checkpoint } | null>(null);

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
          if (!res.ok) throw new Error(data.error || "保存失败");
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
      if (!res.ok) throw new Error(data.error || "操作失败");
      if (data.workflow) onWorkflow(data.workflow, rev);
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
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
          "清单保存失败。请先重试保存再批准。"
        );
      }
      const rev = beginAction();
      const res = await fetch(`/api/contents/${contentId}/review/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "批准失败");
      if (data.workflow) onWorkflow(data.workflow, rev);
    } catch (err) {
      setError(err instanceof Error ? err.message : "批准失败");
    } finally {
      setBusy(null);
    }
  }

  const gateHints: string[] = [];
  if (!briefApproved) gateHints.push("需要先确认内容简报");
  if (!hasMaster) gateHints.push("需要先创建内容母稿");
  if (versions.length === 0) gateHints.push("请先创建至少一个平台版本");

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
          <h2 className="text-sm font-semibold text-ink-primary">审核</h2>
          <Badge variant={contentStatus === "scheduled" ? "mint" : "default"}>
            {contentStatus === "review"
              ? "审核中"
              : contentStatus === "scheduled"
                ? "已通过待发布"
                : "未在审核"}
          </Badge>
        </div>
        {approverName && (
          <span className="text-xs text-ink-muted">审核人：{approverName}</span>
        )}
        {contentStatus === "scheduled" && (
          <Link
            href="/app/pipeline"
            className="text-xs font-medium text-mint-600 hover:underline"
          >
            去内容流程查看
          </Link>
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
            请先创建至少一个平台版本。
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
                      {platformLabel(v.platform)}
                    </span>
                    <Badge variant={v.status === "approved" ? "mint" : "default"}>
                      {versionStatusLabel(v.status)}
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
                            重试
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
                      退回草稿
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
                        提交审核
                      </Button>
                    )}
                </div>

                {v.status === "approved" && review?.approvedAt && (
                  <p className="mt-2 text-xs text-ink-muted">
                    已于 {new Date(review.approvedAt).toLocaleString()}
                    {approverName ? ` 由 ${approverName} 通过` : " 通过"}
                  </p>
                )}

                {/* M2.1: Mark as Published (approved + scheduled content) */}
                {v.status === "approved" && contentStatus === "scheduled" && (
                  <div className="mt-3">
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={busy !== null}
                      onClick={() => setPubModal({ platform: v.platform, edit: false })}
                    >
                      标记已发布
                    </Button>
                  </div>
                )}

                {/* M2.1: Publication card (immutable fact, correction allowed) */}
                {v.status === "published" &&
                  (() => {
                    const pub = publications.find(
                      (pb) => pb.platformVersionId === v.id
                    );
                    if (!pub) {
                      return (
                        <p className="mt-2 text-xs text-ink-faint">
                          已发布——发布记录加载失败。请刷新页面；若仍失败，请到内容流程页查看。
                        </p>
                      );
                    }
                    return (
                      <div className="mt-3 rounded-[8px] border border-mint-600/30 bg-mint-100/40 p-3">
                        <p className="text-sm font-medium text-ink-primary">
                          {pub.finalTitle}
                        </p>
                        <a
                          href={pub.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 block break-all text-xs text-mint-600 hover:underline"
                        >
                          {pub.url}
                        </a>
                        <p className="mt-1 text-xs text-ink-muted">
                          发布于 {new Date(pub.publishedAt).toLocaleString()}
                        </p>
                        {pub.coverUrl && (
                          <p className="mt-1 break-all text-xs text-ink-muted">
                            封面：{pub.coverUrl}
                          </p>
                        )}
                        {pub.notes && (
                          <p className="mt-1 text-xs text-ink-secondary">
                            备注：{pub.notes}
                          </p>
                        )}
                        {/* M2.3: checkpoint metric entry */}
                        <div className="mt-2 space-y-1">
                          {(["24h", "72h"] as TimedCheckpoint[]).map((c) => {
                            const snap = metricSnapshots.find(
                              (sn) =>
                                sn.publicationId === pub.id && sn.checkpoint === c
                            );
                            const st = checkpointStatus(pub.publishedAt, c, !!snap);
                            return (
                              <div
                                key={c}
                                className="flex items-center justify-between text-xs"
                              >
                                <span className="text-ink-secondary">
                                  {c}{" "}
                                  <span className="text-ink-muted">
                                    {st === "submitted"
                                      ? `已提交 · 记录于 ${new Date(snap!.capturedAt).toLocaleString()}`
                                      : st === "due"
                                        ? `自 ${checkpointDueAt(pub.publishedAt, c).toLocaleString()} 起待录入`
                                        : `未到时间——请在 ${checkpointDueAt(pub.publishedAt, c).toLocaleString()} 后再录入`}
                                  </span>
                                </span>
                                {st === "due" && (
                                  <button
                                    className="font-medium text-mint-600 hover:underline"
                                    onClick={() =>
                                      setSnapModal({ publication: pub, checkpoint: c })
                                    }
                                  >
                                    录入 {c} 数据
                                  </button>
                                )}
                                {st === "submitted" && (
                                  <button
                                    className="text-ink-muted hover:text-ink-primary"
                                    onClick={() =>
                                      setSnapModal({ publication: pub, checkpoint: c })
                                    }
                                  >
                                    编辑数据
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <button
                          className="mt-2 text-xs text-mint-600 hover:underline"
                          onClick={() => setPubModal({ platform: v.platform, edit: true })}
                        >
                          修改发布记录
                        </button>
                      </div>
                    );
                  })()}

                {v.status === "draft" && (
                  <p className="mt-2 text-xs text-ink-faint">
                    草稿——不在本轮审核中。
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
                          全选
                        </button>
                        <button
                          className="text-xs text-ink-muted hover:underline disabled:opacity-50"
                          disabled={!editable}
                          onClick={() => getEditor(v).setAll(false)}
                        >
                          清空
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
              {busy === "send" ? "提交中…" : "提交审核"}
            </Button>
          </div>
        )}

        {contentStatus === "review" && (
          <div>
            {anySaveFailed && (
              <p className="mb-2 text-xs text-danger">
                清单保存失败——请先重试保存再批准。
              </p>
            )}
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                disabled={busy !== null || !aggregateReady || anySaveFailed}
                title={
                  aggregateReady
                    ? "批准所有已审核的平台版本"
                    : "请先完成每个平台的审核清单"
                }
                onClick={handleApprove}
              >
                <Check className="mr-1 h-3 w-3" />
                {busy === "approve" ? "保存并审核中…" : "审核通过并待发布"}
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
                撤回审核
              </Button>
            </div>
          </div>
        )}

        {contentStatus === "scheduled" && (
          <p className="text-xs text-ink-muted">
            已审核通过待发布。已发布{" "}
            {versions.filter((v) => v.status === "published").length} /{" "}
            {versions.length}——请在各平台真实发布后标记已发布。
          </p>
        )}

        {contentStatus === "published" && (
          <p className="text-xs text-mint-600">
            所有目标平台均已发布。这条内容已完成。
          </p>
        )}
      </div>

      {/* Mark as Published / Edit Publication modal */}
      {snapModal && (
        <MetricSnapshotModal
          key={`${snapModal.publication.id}:${snapModal.checkpoint}`}
          open
          onOpenChange={(o) => !o && setSnapModal(null)}
          publication={{
            id: snapModal.publication.id,
            platform: snapModal.publication.platform,
            finalTitle: snapModal.publication.finalTitle,
            publishedAt: snapModal.publication.publishedAt,
          }}
          checkpoint={snapModal.checkpoint}
          mode={
            metricSnapshots.some(
              (sn) =>
                sn.publicationId === snapModal.publication.id &&
                sn.checkpoint === snapModal.checkpoint
            )
              ? "edit"
              : "create"
          }
          existing={
            metricSnapshots.find(
              (sn) =>
                sn.publicationId === snapModal.publication.id &&
                sn.checkpoint === snapModal.checkpoint
            ) ?? null
          }
          onDone={onSnapshot}
        />
      )}
      {pubModal && (
        <PublicationModal
          open
          onOpenChange={(o) => !o && setPubModal(null)}
          contentId={contentId}
          platform={pubModal.platform}
          platformLabel={platformLabel(pubModal.platform)}
          versionData={versionData[pubModal.platform] ?? null}
          contentTitle={contentTitle}
          existing={
            pubModal.edit
              ? (publications.find(
                  (pb) =>
                    pb.platformVersionId ===
                    versions.find((v) => v.platform === pubModal.platform)?.id
                ) ?? null)
              : null
          }
          snapshotsExist={metricSnapshots.some(
            (sn) =>
              sn.publicationId ===
              publications.find(
                (pb) =>
                  pb.platformVersionId ===
                  versions.find((v) => v.platform === pubModal.platform)?.id
              )?.id
          )}
          onDone={(result) => onPublication(result, beginAction())}
        />
      )}
    </div>
  );
}
