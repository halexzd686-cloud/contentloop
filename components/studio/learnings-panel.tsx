"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import type { ApplicationItem } from "@/lib/learning-applications";
import {
  LEARNING_APPLY_HELPER,
  platformLabel,
  testOutcomeLabel,
} from "@/lib/labels";

/**
 * Studio Learnings panel — M3.4, inside the Brief tab.
 *
 * Apply/Dismiss writes ONLY learning_applications. Applied learnings
 * are guidance (provenance) — they never rewrite the brief.
 */

interface PanelData {
  applied: ApplicationItem[];
  dismissed: ApplicationItem[];
  available: ApplicationItem[];
}

export function LearningsPanel({ contentId }: { contentId: string }) {
  const [data, setData] = useState<PanelData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDismissed, setShowDismissed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/contents/${contentId}/learning-applications`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }, [contentId]);

  useEffect(() => {
    const t = setTimeout(() => load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  async function act(item: ApplicationItem, action: "applied" | "dismissed") {
    if (busy) return;
    setBusy(item.learningId);
    setError(null);
    try {
      const res = item.applicationId
        ? await fetch(`/api/learning-applications/${item.applicationId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
          })
        : await fetch(`/api/contents/${contentId}/learning-applications`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ learningId: item.learningId, action }),
          });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Action failed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  if (error) {
    return <p className="text-xs text-danger">{error}</p>;
  }
  if (!data) {
    return <p className="text-xs text-ink-faint">Loading learnings…</p>;
  }

  const total =
    data.applied.length + data.dismissed.length + data.available.length;

  return (
    <div className="mt-6 rounded-[8px] border border-border bg-canvas p-3">
      <div className="flex items-center gap-2">
        <BookOpen className="h-3.5 w-3.5 text-ink-muted" />
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Learnings
        </p>
        <span className="text-[11px] text-ink-faint">{total}</span>
      </div>

      {total === 0 && (
        <p className="mt-2 text-xs text-ink-faint">
          No Learnings match this Content yet. Learnings come from concluded
          Tests and match by platform and Pillar.
        </p>
      )}

      {data.applied.length > 0 && (
        <div className="mt-3 space-y-2">
          {data.applied.map((item) => (
            <LearningCard
              key={item.learningId}
              item={item}
              state="applied"
              busy={busy === item.learningId}
              onAction={() => act(item, "dismissed")}
              actionLabel="Dismiss"
            />
          ))}
        </div>
      )}

      {data.available.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
            Available
          </p>
          <p className="mt-1 text-[11px] text-ink-faint">
            {LEARNING_APPLY_HELPER}
          </p>
          <div className="mt-1.5 space-y-2">
            {data.available.map((item) => (
              <LearningCard
                key={item.learningId}
                item={item}
                state="available"
                busy={busy === item.learningId}
                onApply={() => act(item, "applied")}
                onDismiss={() => act(item, "dismissed")}
              />
            ))}
          </div>
        </div>
      )}

      {data.dismissed.length > 0 && (
        <div className="mt-3">
          <button
            className="inline-flex items-center gap-1 text-[11px] text-ink-muted hover:text-ink-primary"
            onClick={() => setShowDismissed(!showDismissed)}
          >
            {showDismissed ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            Dismissed ({data.dismissed.length})
          </button>
          {showDismissed && (
            <div className="mt-1.5 space-y-2">
              {data.dismissed.map((item) => (
                <LearningCard
                  key={item.learningId}
                  item={item}
                  state="dismissed"
                  busy={busy === item.learningId}
                  onAction={() => act(item, "applied")}
                  actionLabel="Apply"
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LearningCard({
  item,
  state,
  busy,
  onAction,
  actionLabel,
  onApply,
  onDismiss,
}: {
  item: ApplicationItem;
  state: "applied" | "available" | "dismissed";
  busy: boolean;
  onAction?: () => void;
  actionLabel?: string;
  onApply?: () => void;
  onDismiss?: () => void;
}) {
  const [expand, setExpand] = useState(false);
  return (
    <div className="rounded-[8px] border border-border bg-workspace p-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-ink-primary">{item.text}</p>
        {state === "applied" && (
          <Badge variant="mint">Applied</Badge>
        )}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-ink-muted">
        {item.platform && <span>{platformLabel(item.platform)}</span>}
        {item.pillarName && <span>· {item.pillarName}</span>}
        {item.sourceTestTitle && (
          <span>
            · test: {item.sourceTestTitle}
            {item.sourceTestOutcome ? ` (${testOutcomeLabel(item.sourceTestOutcome)})` : ""}
          </span>
        )}
        {item.sourceStale && (
          <span className="text-warning">
            · source test data changed — review before relying on it
          </span>
        )}
        {item.scopeMismatch && (
          <span className="text-warning">
            · no longer matches this content&apos;s platform or pillar
          </span>
        )}
      </div>
      <div className="mt-1.5 flex items-center gap-3">
        <button
          className="text-[11px] text-ink-muted hover:text-ink-primary"
          onClick={() => setExpand(!expand)}
        >
          {expand ? "Hide evidence" : "Evidence"}
        </button>
        {state === "available" && (
          <>
            <button
              className="text-[11px] font-medium text-mint-600 hover:underline disabled:opacity-50"
              onClick={onApply}
              disabled={busy}
            >
              Apply
            </button>
            <button
              className="text-[11px] text-ink-muted hover:underline disabled:opacity-50"
              onClick={onDismiss}
              disabled={busy}
            >
              Dismiss
            </button>
          </>
        )}
        {state !== "available" && onAction && (
          <button
            className="text-[11px] text-ink-muted hover:underline disabled:opacity-50"
            onClick={onAction}
            disabled={busy}
          >
            {actionLabel}
          </button>
        )}
      </div>
      {expand && item.evidenceSummary && (
        <pre className="mt-1.5 whitespace-pre-wrap rounded-[8px] border border-border bg-canvas p-2 font-sans text-[11px] text-ink-secondary">
          {item.evidenceSummary}
        </pre>
      )}
    </div>
  );
}
