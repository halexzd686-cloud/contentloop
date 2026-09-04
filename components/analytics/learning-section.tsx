"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw } from "lucide-react";

/**
 * Learning section — M3.3, inside the concluded Test drawer.
 *
 * AI Draft = wording proposal only (zero DB writes). Save is the only
 * write. evidenceSummary is server-built and never editable.
 */

interface LearningContextData {
  pillars: { id: string; name: string }[];
  learning: {
    id: string;
    text: string;
    platform: string | null;
    pillarId: string | null;
    evidenceSummary: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  evidenceSummaryPreview: string | null;
  defaultPillarId: string | null;
  outcome: string | null;
  sourceStale: boolean;
}

export function LearningSection({ testId }: { testId: string }) {
  const [ctx, setCtx] = useState<LearningContextData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [text, setText] = useState("");
  const [pillarId, setPillarId] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingSaved, setEditingSaved] = useState(false);
  const pillars = ctx?.pillars ?? [];

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/tests/${testId}/learning`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setCtx(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }, [testId]);

  useEffect(() => {
    const t = setTimeout(() => load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  function startCreate() {
    setCreating(true);
    setText("");
    setDraft(null);
    setPillarId(ctx?.defaultPillarId ?? null);
  }

  async function generateDraft() {
    setAiBusy(true);
    setAiError(null);
    try {
      const res = await fetch(`/api/tests/${testId}/learning/draft`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Draft failed");
      setDraft(data.draft.text);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Draft failed");
    } finally {
      setAiBusy(false);
    }
  }

  async function save() {
    if (text.trim() === "" || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/tests/${testId}/learning`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, pillarId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setCreating(false);
      setDraft(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit() {
    if (!ctx?.learning || text.trim() === "" || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/learnings/${ctx.learning.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, pillarId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setEditingSaved(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (error && !ctx) {
    return <p className="text-xs text-danger">{error}</p>;
  }
  if (!ctx) {
    return <p className="text-xs text-ink-faint">Loading learning…</p>;
  }

  return (
    <section className="rounded-[8px] border border-border bg-canvas p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Learning
      </p>

      {ctx.sourceStale && (
        <p className="mt-2 rounded-[8px] border border-warning/30 bg-warning/5 p-2 text-xs text-ink-secondary">
          This Test&apos;s underlying source data has changed. This Learning is
          based on the frozen evidence captured at conclusion time.
        </p>
      )}

      {/* Saved state */}
      {ctx.learning && !editingSaved && (
        <div className="mt-2 space-y-2">
          <p className="text-sm text-ink-primary">{ctx.learning.text}</p>
          <p className="text-[11px] text-ink-faint">
            {ctx.learning.platform ?? "all platforms"}
            {ctx.learning.pillarId ? ` · pillar scoped` : ""}
            {" · "}saved {new Date(ctx.learning.createdAt).toLocaleString()}
          </p>
          {/* M4.2: persistent guidance — a saved Learning never rewrites
              content; Studio (Brief tab) is the only Apply surface. */}
          <p className="text-xs text-ink-muted">
            Saved. This does not change any content. Apply it from Studio →
            Brief on eligible content.
          </p>
          <details className="text-xs text-ink-muted">
            <summary className="cursor-pointer">Evidence summary</summary>
            <pre className="mt-1 whitespace-pre-wrap rounded-[8px] border border-border bg-workspace p-2 font-sans">
              {ctx.learning.evidenceSummary}
            </pre>
          </details>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingSaved(true);
              setText(ctx.learning!.text);
              setPillarId(ctx.learning!.pillarId);
            }}
          >
            Edit
          </Button>
        </div>
      )}

      {/* Edit saved (wording/scope only) */}
      {ctx.learning && editingSaved && (
        <div className="mt-2 space-y-2">
          <textarea
            rows={3}
            maxLength={2000}
            className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-secondary">
              Pillar scope
            </label>
            <select
              className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600"
              value={pillarId ?? ""}
              onChange={(e) => setPillarId(e.target.value || null)}
            >
              <option value="">No pillar scope</option>
              {pillars.map((pl) => (
                <option key={pl.id} value={pl.id}>{pl.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={saveEdit} disabled={saving || text.trim() === ""}>
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditingSaved(false)}>Cancel</Button>
          </div>
          <p className="text-[11px] text-ink-faint">
            Evidence summary is frozen and never rewritten by edits.
          </p>
        </div>
      )}

      {/* Create */}
      {!ctx.learning && !creating && (
        <Button variant="secondary" size="sm" className="mt-2" onClick={startCreate}>
          Create Learning
        </Button>
      )}

      {!ctx.learning && creating && (
        <div className="mt-2 space-y-2">
          <details className="text-xs text-ink-muted" open>
            <summary className="cursor-pointer">Evidence summary (server)</summary>
            <pre className="mt-1 whitespace-pre-wrap rounded-[8px] border border-border bg-workspace p-2 font-sans">
              {ctx.evidenceSummaryPreview}
            </pre>
          </details>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-ink-secondary">Learning text *</label>
              <button
                className="inline-flex items-center gap-1 text-xs text-mint-600 hover:underline"
                onClick={generateDraft}
                disabled={aiBusy}
              >
                <Sparkles className="h-3 w-3" />
                {aiBusy ? "Drafting…" : "Draft with AI"}
              </button>
            </div>
            {aiError && (
              <p className="mt-1 text-xs text-danger">
                {aiError}{" "}
                <button className="underline" onClick={generateDraft}>
                  <RefreshCw className="mr-0.5 inline h-3 w-3" />Retry
                </button>
              </p>
            )}
            {draft !== null && (
              <div className="mt-1 rounded-[8px] border border-mint-600/30 bg-mint-100/40 p-2">
                <p className="text-xs text-ink-primary">{draft}</p>
                <div className="mt-1.5 flex gap-2">
                  <button
                    className="text-xs font-medium text-mint-600 hover:underline"
                    onClick={() => {
                      setText(draft);
                      setDraft(null);
                    }}
                  >
                    Apply
                  </button>
                  <button
                    className="text-xs text-ink-muted hover:underline"
                    onClick={() => setDraft(null)}
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}
            <textarea
              rows={3}
              maxLength={2000}
              className="mt-1 w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600"
              placeholder="What should future content remember from this test?"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-secondary">
              Pillar scope (optional)
            </label>
            <select
              className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600"
              value={pillarId ?? ""}
              onChange={(e) => setPillarId(e.target.value || null)}
            >
              <option value="">No pillar scope</option>
              {pillars.map((pl) => (
                <option key={pl.id} value={pl.id}>{pl.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={save} disabled={saving || text.trim() === ""}>
              {saving ? "Saving…" : "Save Learning"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setCreating(false); setDraft(null); }}>
              Cancel
            </Button>
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      )}

    </section>
  );
}
