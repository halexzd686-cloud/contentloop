"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { prefillFinalTitle } from "@/lib/validation/publication";
import type { PublicationSummary } from "@/lib/publication";
import type { WorkflowSnapshot } from "@/lib/workflow-snapshot";

/**
 * Mark as Published / Edit Publication modal — M2.1.
 *
 * ONE modal, ONE API client, ONE validation path — shared by Studio
 * Review tab and Pipeline Drawer (no duplicated publication logic).
 *
 * A Publication records a REAL external publish. Nothing is
 * auto-submitted: publishedAt starts empty (never auto "now"), the
 * final title is only a prefill that the human confirms.
 */

export interface PublicationResult {
  workflow?: WorkflowSnapshot;
  publication: PublicationSummary;
  publicationProgress: { published: number; total: number };
}

interface PublicationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentId: string;
  platform: string;
  platformLabel: string;
  /** Prefill source: platform version data (null in Pipeline context). */
  versionData: Record<string, unknown> | null;
  contentTitle: string;
  /** Edit mode when provided. */
  existing?: PublicationSummary | null;
  /** M2.4: when metric snapshots exist, publishedAt is locked. */
  snapshotsExist?: boolean;
  onDone: (result: PublicationResult) => void;
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PublicationModal({
  open,
  onOpenChange,
  contentId,
  platform,
  platformLabel,
  versionData,
  contentTitle,
  existing,
  snapshotsExist = false,
  onDone,
}: PublicationModalProps) {
  const isEdit = !!existing;
  const [finalTitle, setFinalTitle] = useState(
    existing?.finalTitle ??
      prefillFinalTitle(platform, versionData ?? {}, contentTitle)
  );
  const [publishedAt, setPublishedAt] = useState(
    existing ? toLocalInputValue(existing.publishedAt) : ""
  );
  const [url, setUrl] = useState(existing?.url ?? "");
  const [coverUrl, setCoverUrl] = useState(existing?.coverUrl ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid =
    finalTitle.trim() !== "" && publishedAt !== "" && url.trim() !== "";

  async function submit() {
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/contents/${contentId}/versions/${platform}/publication`,
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            finalTitle: finalTitle.trim(),
            // datetime-local = user's local time → ISO UTC
            publishedAt: new Date(publishedAt).toISOString(),
            url: url.trim(),
            coverUrl: coverUrl.trim() || null,
            notes: notes.trim() || null,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.details ? `${data.error}: ${data.details}` : data.error || "Failed"
        );
      }
      onDone(data as PublicationResult);
      onOpenChange(false);
    } catch (err) {
      // Keep user input on failure.
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Publication" : "Mark as Published"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Correct the publication record. Platform and status do not change."
              : `Record that the ${platformLabel} version was really published. This cannot be undone.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-secondary">
              Platform
            </label>
            <input
              className="w-full rounded-[8px] border border-border bg-surface-subtle px-3 py-2 text-sm text-ink-muted"
              value={platformLabel}
              disabled
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-secondary">
              Final Title *
            </label>
            <input
              className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm text-ink-primary outline-none focus:border-mint-600"
              value={finalTitle}
              onChange={(e) => setFinalTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-secondary">
              Published At * (your local time)
            </label>
            <input
              type="datetime-local"
              className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm text-ink-primary outline-none focus:border-mint-600 disabled:bg-surface-subtle disabled:text-ink-muted"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              disabled={snapshotsExist}
            />
            {snapshotsExist && (
              <p className="mt-1 text-[11px] text-ink-faint">
                Published time is locked because metric snapshots already exist.
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-secondary">
              URL *
            </label>
            <input
              className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm text-ink-primary outline-none focus:border-mint-600"
              placeholder="https://…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-secondary">
              Cover URL (optional)
            </label>
            <input
              className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm text-ink-primary outline-none focus:border-mint-600"
              placeholder="https://…"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-secondary">
              Notes (optional)
            </label>
            <textarea
              className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm text-ink-primary outline-none focus:border-mint-600"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && (
            <div className="rounded-[8px] border border-danger/20 bg-danger/5 p-3 text-xs text-danger">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={submit}
            disabled={!valid || submitting}
          >
            {submitting
              ? isEdit
                ? "Saving…"
                : "Marking…"
              : isEdit
                ? "Save Correction"
                : "Confirm Published"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
