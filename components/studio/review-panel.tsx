"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock, RefreshCw, Undo2, Check, Send } from "lucide-react";
import type { Platform } from "@/lib/validation/platform-version";
import {
  isChecklistComplete,
  type ReviewChecklist,
} from "@/lib/validation/review";

/**
 * Studio Review tab — M1.6.
 *
 * Human-only review: five checklist items per ACTIVE PlatformVersion
 * (versions that actually exist). AI has no write path here.
 *
 * Actions by state:
 * - in_progress: Send to Review (gate: approved Brief + Master + ≥1 version)
 * - review: per-version checklist / Withdraw / Approve for Publishing /
 *   per-version Return to draft
 * - scheduled: approved summary; per-version Return to draft reopens
 *   only that platform (Content drops back to review)
 */

export interface ReviewVersion {
  id: string;
  platform: Platform;
  status: string;
}

export interface ReviewRow {
  platformVersionId: string;
  factsConfirmed: boolean;
  titleCoverMatch: boolean;
  platformFitConfirmed: boolean;
  riskChecked: boolean;
  humanReviewed: boolean;
  reviewerId: string | null;
  approvedAt: string | null;
}

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

interface ReviewPanelProps {
  contentId: string;
  contentStatus: string;
  briefApproved: boolean;
  hasMaster: boolean;
  versions: ReviewVersion[];
  reviews: ReviewRow[];
  approverName: string | null;
  onChanged: () => void;
}

export function ReviewPanel({
  contentId,
  contentStatus,
  briefApproved,
  hasMaster,
  versions,
  reviews,
  approverName,
  onChanged,
}: ReviewPanelProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localReviews, setLocalReviews] = useState<ReviewRow[]>(reviews);

  useEffect(() => {
    const t = setTimeout(() => setLocalReviews(reviews), 0);
    return () => clearTimeout(t);
  }, [reviews]);

  async function run(action: string, fn: () => Promise<Response>) {
    setBusy(action);
    setError(null);
    try {
      const res = await fn();
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  function reviewFor(v: ReviewVersion) {
    return localReviews.find((r) => r.platformVersionId === v.id);
  }

  function checklistOf(v: ReviewVersion): ReviewChecklist {
    const r = reviewFor(v);
    return {
      factsConfirmed: r?.factsConfirmed ?? false,
      titleCoverMatch: r?.titleCoverMatch ?? false,
      platformFitConfirmed: r?.platformFitConfirmed ?? false,
      riskChecked: r?.riskChecked ?? false,
      humanReviewed: r?.humanReviewed ?? false,
    };
  }

  function toggle(v: ReviewVersion, key: keyof ReviewChecklist) {
    const current = checklistOf(v);
    const next = { ...current, [key]: !current[key] };
    // optimistic update
    setLocalReviews((prev) => {
      const existing = prev.find((r) => r.platformVersionId === v.id);
      if (existing) {
        return prev.map((r) =>
          r.platformVersionId === v.id ? { ...r, ...next } : r
        );
      }
      return [
        ...prev,
        {
          platformVersionId: v.id,
          ...next,
          reviewerId: null,
          approvedAt: null,
        },
      ];
    });
    run(`check-${v.platform}`, () =>
      fetch(`/api/contents/${contentId}/versions/${v.platform}/review`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklist: next }),
      })
    );
  }

  const gateHints: string[] = [];
  if (!briefApproved) gateHints.push("Brief must be approved");
  if (!hasMaster) gateHints.push("Content Master must exist");
  if (versions.length === 0) gateHints.push("Create at least one platform version");

  const aggregateReady =
    versions.length > 0 &&
    versions.every((v) => {
      if (v.status === "approved") return true;
      if (v.status === "review") return isChecklistComplete(checklistOf(v));
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
            const checklist = checklistOf(v);
            const review = reviewFor(v);
            const editable = v.status === "review";
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

                {(editable || v.status === "approved") && (
                  <div className="mt-3 space-y-1.5">
                    {CHECKLIST_ITEMS.map((item) => (
                      <label
                        key={item.key}
                        className={`flex items-center gap-2 text-sm ${
                          editable
                            ? "cursor-pointer text-ink-primary"
                            : "text-ink-muted"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 accent-mint-600"
                          checked={checklist[item.key]}
                          disabled={!editable || busy !== null}
                          onChange={() => toggle(v, item.key)}
                        />
                        {item.label}
                      </label>
                    ))}
                  </div>
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
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              disabled={busy !== null || !aggregateReady}
              title={
                aggregateReady
                  ? "Approve all reviewed platform versions"
                  : "Complete every platform checklist first"
              }
              onClick={() =>
                run("approve", () =>
                  fetch(`/api/contents/${contentId}/review/approve`, {
                    method: "POST",
                  })
                )
              }
            >
              <Check className="mr-1 h-3 w-3" />
              {busy === "approve" ? "Approving…" : "Approve for Publishing"}
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
