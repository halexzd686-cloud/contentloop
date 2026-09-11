"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw } from "lucide-react";
import { AI_PROPOSAL_APPLY_HELPER, platformLabel } from "@/lib/labels";

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
      if (!res.ok) throw new Error(data.error || "加载失败");
      setCtx(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
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
      if (!res.ok) throw new Error(data.error || "生成草稿失败");
      setDraft(data.draft.text);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "生成草稿失败");
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
      if (!res.ok) throw new Error(data.error || "保存失败");
      setCreating(false);
      setDraft(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
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
      if (!res.ok) throw new Error(data.error || "保存失败");
      setEditingSaved(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  if (error && !ctx) {
    return <p className="text-xs text-danger">{error}</p>;
  }
  if (!ctx) {
    return <p className="text-xs text-ink-faint">正在加载经验…</p>;
  }

  return (
    <section className="rounded-[8px] border border-border bg-canvas p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
        运营经验
      </p>
      <p className="mt-1 text-xs text-ink-secondary">
        你从已完成的运营测试中选择保存的可复用经验。
      </p>

      {ctx.sourceStale && (
        <p className="mt-2 rounded-[8px] border border-warning/30 bg-warning/5 p-2 text-xs text-ink-secondary">
          该测试的底层数据已变化。这条经验基于结论时定格的证据。
        </p>
      )}

      {/* Saved state */}
      {ctx.learning && !editingSaved && (
        <div className="mt-2 space-y-2">
          <p className="text-sm text-ink-primary">{ctx.learning.text}</p>
          <p className="text-[11px] text-ink-faint">
            {ctx.learning.platform ? platformLabel(ctx.learning.platform) : "全部平台"}
            {ctx.learning.pillarId ? ` · 限定内容方向` : ""}
            {" · "}保存于 {new Date(ctx.learning.createdAt).toLocaleString()}
          </p>
          {/* M4.2: persistent guidance — a saved Learning never rewrites
              content; Studio (Brief tab) is the only Apply surface. */}
          <p className="text-xs text-ink-muted">
            已保存。这不会改动任何内容。请在内容工作台的“内容简报”中应用到合适的内容。
          </p>
          <details className="text-xs text-ink-muted">
            <summary className="cursor-pointer">证据摘要</summary>
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
            编辑
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
              内容方向范围
            </label>
            <select
              className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600"
              value={pillarId ?? ""}
              onChange={(e) => setPillarId(e.target.value || null)}
            >
              <option value="">不限内容方向</option>
              {pillars.map((pl) => (
                <option key={pl.id} value={pl.id}>{pl.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={saveEdit} disabled={saving || text.trim() === ""}>
              {saving ? "保存中…" : "保存"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditingSaved(false)}>取消</Button>
          </div>
          <p className="text-[11px] text-ink-faint">
            证据摘要定格于结论时，编辑不会改写它。
          </p>
        </div>
      )}

      {/* Create */}
      {!ctx.learning && !creating && (
        <Button variant="secondary" size="sm" className="mt-2" onClick={startCreate}>
          保存运营经验
        </Button>
      )}

      {!ctx.learning && creating && (
        <div className="mt-2 space-y-2">
          <details className="text-xs text-ink-muted" open>
            <summary className="cursor-pointer">证据摘要（定格于结论时）</summary>
            <pre className="mt-1 whitespace-pre-wrap rounded-[8px] border border-border bg-workspace p-2 font-sans">
              {ctx.evidenceSummaryPreview}
            </pre>
          </details>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-ink-secondary">经验内容 *</label>
              <button
                className="inline-flex items-center gap-1 text-xs text-mint-600 hover:underline"
                onClick={generateDraft}
                disabled={aiBusy}
              >
                <Sparkles className="h-3 w-3" />
                {aiBusy ? "AI 正在起草…" : "AI 生成经验草稿"}
              </button>
            </div>
            {aiError && (
              <p className="mt-1 text-xs text-danger">
                {aiError}{" "}
                <button className="underline" onClick={generateDraft}>
                  <RefreshCw className="mr-0.5 inline h-3 w-3" />重试
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
                    应用
                  </button>
                  <button
                    className="text-xs text-ink-muted hover:underline"
                    onClick={() => setDraft(null)}
                  >
                    放弃
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-ink-secondary">
                  {AI_PROPOSAL_APPLY_HELPER}
                </p>
              </div>
            )}
            <textarea
              rows={3}
              maxLength={2000}
              className="mt-1 w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600"
              placeholder="未来的内容应该记住这次测试的什么？"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-secondary">
              内容方向范围（可选）
            </label>
            <select
              className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600"
              value={pillarId ?? ""}
              onChange={(e) => setPillarId(e.target.value || null)}
            >
              <option value="">不限内容方向</option>
              {pillars.map((pl) => (
                <option key={pl.id} value={pl.id}>{pl.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={save} disabled={saving || text.trim() === ""}>
              {saving ? "保存中…" : "保存运营经验"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setCreating(false); setDraft(null); }}>
              取消
            </Button>
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      )}

    </section>
  );
}
