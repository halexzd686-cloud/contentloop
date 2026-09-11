"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RefreshCw, Plus } from "lucide-react";
import {
  buildFormulaPreview,
  type MetricFormat,
} from "@/lib/metrics/engine";
import { platformLabel } from "@/lib/labels";

/**
 * Settings → Metrics — M2.2 Metric Definition Engine.
 *
 * Definitions are authoritative configuration. No AI here.
 * Display name = canonical anchor; team terminology goes in Alias.
 * Derived metrics always show the calculation direction (preview),
 * never just a jargon name.
 */

interface MetricDef {
  id: string;
  platform: string;
  key: string;
  displayName: string;
  alias: string | null;
  type: "raw" | "derived";
  numeratorKey: string | null;
  denominatorKey: string | null;
  formula: string | null;
  format: MetricFormat;
  meaning: string | null;
  caution: string | null;
  isActive: boolean;
}

const PLATFORMS = [
  { key: "xiaohongshu", label: "Xiaohongshu" },
  { key: "bilibili", label: "Bilibili" },
  { key: "douyin", label: "Douyin" },
] as const;

const FORMAT_LABEL: Record<MetricFormat, string> = {
  count: "计数",
  percentage: "百分比（×100%）",
  ratio: "比值（x : 1）",
};

export default function SettingsPage() {
  const [defs, setDefs] = useState<MetricDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<MetricDef | null>(null);
  const [createPlatform, setCreatePlatform] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/metrics");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加载失败");
      setDefs(data.definitions);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const byPlatform = useMemo(() => {
    const map = new Map<string, MetricDef[]>();
    for (const p of PLATFORMS) map.set(p.key, []);
    for (const d of defs) map.get(d.platform)?.push(d);
    return map;
  }, [defs]);

  const nameOf = useCallback(
    (platform: string) => (key: string) =>
      defs.find((d) => d.platform === platform && d.key === key)
        ? (defs.find((d) => d.platform === platform && d.key === key)!.alias ??
          defs.find((d) => d.platform === platform && d.key === key)!.displayName)
        : undefined,
    [defs]
  );

  async function toggleActive(d: MetricDef) {
    setActionError(null);
    try {
      const res = await fetch(`/api/settings/metrics/${d.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !d.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "更新失败");
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "更新失败");
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-ink-primary">设置</h1>

      <div className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
          指标
        </h2>
        <p className="mt-1 text-xs text-ink-secondary">
          这些定义控制每项指标如何计算和展示。派生指标始终显示其公式。
        </p>
      </div>

      {actionError && (
        <div className="mt-4 rounded-[8px] border border-danger/20 bg-danger/5 p-3 text-xs text-danger">
          {actionError}
        </div>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-ink-muted">正在加载指标…</p>
      ) : loadError ? (
        <div className="mt-6 flex items-center gap-3">
          <p className="text-sm text-danger">{loadError}</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setLoading(true);
              load();
            }}
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            重试
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-6">
          {PLATFORMS.map((p) => (
            <div key={p.key}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-ink-primary">
                  {platformLabel(p.key)}
                </h3>
                <button
                  className="inline-flex items-center gap-1 text-xs text-mint-600 hover:underline"
                  onClick={() => setCreatePlatform(p.key)}
                >
                  <Plus className="h-3 w-3" />
                  新建派生指标
                </button>
              </div>
              <div className="mt-2 divide-y divide-border rounded-[8px] border border-border bg-workspace">
                {(byPlatform.get(p.key) ?? []).length === 0 ? (
                  <p className="px-3 py-2.5 text-xs text-ink-secondary">
                    该平台还没有指标定义。
                  </p>
                ) : (
                  (byPlatform.get(p.key) ?? []).map((d) => (
                  <div
                    key={d.id}
                    className={`flex items-center gap-3 px-3 py-2.5 ${d.isActive ? "" : "opacity-60"}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-ink-primary">
                          {d.alias ?? d.displayName}
                        </span>
                        <Badge variant={d.type === "derived" ? "mint" : "default"}>
                          {d.type === "derived" ? "派生" : "原始"}
                        </Badge>
                        {!d.isActive && <Badge variant="default">已停用</Badge>}
                      </div>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        <code className="text-ink-faint">{d.key}</code>
                        {" · "}
                        {FORMAT_LABEL[d.format]}
                        {d.type === "derived" && (
                          <>
                            {" · "}
                            {buildFormulaPreview(d, nameOf(d.platform))}
                          </>
                        )}
                      </p>
                      {d.caution && (
                        <p className="mt-0.5 text-xs text-ink-secondary">
                          ⚠ {d.caution}
                        </p>
                      )}
                    </div>
                    <button
                      className="text-xs text-ink-muted hover:text-ink-primary"
                      onClick={() => setEditTarget(d)}
                    >
                      编辑
                    </button>
                    <button
                      className="text-xs text-ink-muted hover:text-ink-primary"
                      onClick={() => toggleActive(d)}
                    >
                      {d.isActive ? "停用" : "启用"}
                    </button>
                  </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editTarget && (
        <EditMetricDialog
          def={editTarget}
          defs={defs}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            load();
          }}
        />
      )}
      {createPlatform && (
        <CreateDerivedDialog
          platform={createPlatform}
          defs={defs}
          onClose={() => setCreatePlatform(null)}
          onCreated={() => {
            setCreatePlatform(null);
            load();
          }}
        />
      )}
    </div>
  );
}

// ─── Edit dialog ───────────────────────────────────────

function EditMetricDialog({
  def,
  defs,
  onClose,
  onSaved,
}: {
  def: MetricDef;
  defs: MetricDef[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [alias, setAlias] = useState(def.alias ?? "");
  const [meaning, setMeaning] = useState(def.meaning ?? "");
  const [caution, setCaution] = useState(def.caution ?? "");
  const [numeratorKey, setNumeratorKey] = useState(def.numeratorKey ?? "");
  const [denominatorKey, setDenominatorKey] = useState(def.denominatorKey ?? "");
  const [format, setFormat] = useState<MetricFormat>(def.format);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rawOptions = defs.filter(
    (d) => d.platform === def.platform && d.type === "raw"
  );
  const lookup = (key: string) =>
    rawOptions.find((d) => d.key === key)
      ? (rawOptions.find((d) => d.key === key)!.alias ??
        rawOptions.find((d) => d.key === key)!.displayName)
      : undefined;

  const preview =
    def.type === "derived" && numeratorKey && denominatorKey
      ? buildFormulaPreview(
          { key: def.key, type: "derived", numeratorKey, denominatorKey, format },
          lookup
        )
      : "";

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        alias: alias || null,
        meaning: meaning || null,
        caution: caution || null,
      };
      if (def.type === "derived") {
        body.numeratorKey = numeratorKey;
        body.denominatorKey = denominatorKey;
        body.format = format;
      }
      const res = await fetch(`/api/settings/metrics/${def.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失败");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            编辑：{def.alias ?? def.displayName}
          </DialogTitle>
          <DialogDescription>
            <code>{def.key}</code> · {platformLabel(def.platform)} · {def.type === "derived" ? "派生" : "原始"}{" "}
            —— key、平台和类型不可更改。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-secondary">
              别名（团队叫法）
            </label>
            <input
              className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
            />
          </div>

          {def.type === "derived" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-secondary">
                    分子
                  </label>
                  <select
                    className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600"
                    value={numeratorKey}
                    onChange={(e) => setNumeratorKey(e.target.value)}
                  >
                    {rawOptions.map((r) => (
                      <option key={r.key} value={r.key}>
                        {r.alias ?? r.displayName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-secondary">
                    分母
                  </label>
                  <select
                    className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600"
                    value={denominatorKey}
                    onChange={(e) => setDenominatorKey(e.target.value)}
                  >
                    {rawOptions.map((r) => (
                      <option key={r.key} value={r.key}>
                        {r.alias ?? r.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-secondary">
                  格式
                </label>
                <select
                  className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600"
                  value={format}
                  onChange={(e) => setFormat(e.target.value as MetricFormat)}
                >
                  <option value="percentage">百分比（×100%）</option>
                  <option value="ratio">比值（x : 1）</option>
                </select>
              </div>
              {preview && (
                <p className="rounded-[8px] border border-mint-600/30 bg-mint-100/40 px-3 py-2 text-xs text-ink-secondary">
                  预览：{preview}
                </p>
              )}
            </>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-secondary">
              含义
            </label>
            <textarea
              className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600"
              rows={2}
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-secondary">
              注意事项
            </label>
            <input
              className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600"
              value={caution}
              onChange={(e) => setCaution(e.target.value)}
            />
          </div>

          {error && (
            <div className="rounded-[8px] border border-danger/20 bg-danger/5 p-3 text-xs text-danger">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" onClick={save} disabled={saving}>
            {saving ? "保存中…" : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create custom derived dialog ──────────────────────

function CreateDerivedDialog({
  platform,
  defs,
  onClose,
  onCreated,
}: {
  platform: string;
  defs: MetricDef[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const rawOptions = defs.filter(
    (d) => d.platform === platform && d.type === "raw"
  );
  const [displayName, setDisplayName] = useState("");
  const [alias, setAlias] = useState("");
  const [numeratorKey, setNumeratorKey] = useState(rawOptions[0]?.key ?? "");
  const [denominatorKey, setDenominatorKey] = useState(rawOptions[0]?.key ?? "");
  const [format, setFormat] = useState<"percentage" | "ratio">("percentage");
  const [meaning, setMeaning] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = (key: string) =>
    rawOptions.find((d) => d.key === key)
      ? (rawOptions.find((d) => d.key === key)!.alias ??
        rawOptions.find((d) => d.key === key)!.displayName)
      : undefined;

  const preview =
    numeratorKey && denominatorKey
      ? buildFormulaPreview(
          { key: "", type: "derived", numeratorKey, denominatorKey, format },
          lookup
        )
      : "";

  async function create() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/metrics/derived", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          displayName,
          alias: alias || null,
          numeratorKey,
          denominatorKey,
          format,
          meaning: meaning || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "创建失败");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新建派生指标</DialogTitle>
          <DialogDescription>
            平台：{platformLabel(platform)}。派生指标只能引用直接录入的指标。它的 key 生成一次后保持不变。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-secondary">
              展示名称 *
            </label>
            <input
              className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-secondary">
              别名（团队叫法，可选）
            </label>
            <input
              className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-secondary">
                分子 *
              </label>
              <select
                className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600"
                value={numeratorKey}
                onChange={(e) => setNumeratorKey(e.target.value)}
              >
                {rawOptions.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.alias ?? r.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-secondary">
                分母 *
              </label>
              <select
                className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600"
                value={denominatorKey}
                onChange={(e) => setDenominatorKey(e.target.value)}
              >
                {rawOptions.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.alias ?? r.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-secondary">
              格式 *
            </label>
            <select
              className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600"
              value={format}
              onChange={(e) => setFormat(e.target.value as "percentage" | "ratio")}
            >
              <option value="percentage">百分比（×100%）</option>
              <option value="ratio">比值（x : 1）</option>
            </select>
          </div>
          {preview && (
            <p className="rounded-[8px] border border-mint-600/30 bg-mint-100/40 px-3 py-2 text-xs text-ink-secondary">
              预览：{preview}
              {format === "ratio" ? " → x : 1" : " → x.x%"}
            </p>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-secondary">
              含义（可选）
            </label>
            <textarea
              className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600"
              rows={2}
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
            />
          </div>

          {error && (
            <div className="rounded-[8px] border border-danger/20 bg-danger/5 p-3 text-xs text-danger">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button
            variant="primary"
            onClick={create}
            disabled={creating || displayName.trim() === ""}
          >
            {creating ? "创建中…" : "创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
