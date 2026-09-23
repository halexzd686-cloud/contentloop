"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FountainLoader } from "@/components/motion/fountain-loader";
import { ThinkingOrbs } from "@/components/motion/thinking-orbs";
import { AiActionButton } from "@/components/ui/ai-action-button";
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
import { platformLabel, metricCautionLabel } from "@/lib/labels";
import type { AIPlaybookDraft } from "@/lib/validation/playbook";

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

interface Pillar {
  id: string;
  name: string;
}

interface TeamMember {
  id: string;
  name: string;
  title: string | null;
}

interface Playbook {
  platform: string;
  voice: string | null;
  titleStyle: string | null;
  hookStyle: string | null;
  structure: string | null;
  cta: string | null;
  avoid: string[] | null;
  goodExamples: { title: string; note?: string; url?: string }[] | null;
  updatedAt: string;
}

const PLAYBOOK_FIELDS: {
  key: "voice" | "titleStyle" | "hookStyle" | "structure" | "cta";
  label: string;
}[] = [
  { key: "voice", label: "语气" },
  { key: "titleStyle", label: "标题风格" },
  { key: "hookStyle", label: "钩子" },
  { key: "structure", label: "结构" },
  { key: "cta", label: "行动召唤" },
];

const PLATFORMS = [
  { key: "xiaohongshu", label: "Xiaohongshu" },
  { key: "bilibili", label: "Bilibili" },
  { key: "douyin", label: "Douyin" },
] as const;

const FORMAT_LABEL: Record<MetricFormat, string> = {
  count: "计数",
  percentage: "百分比",
  ratio: "比值",
};

const SECTIONS = ["指标定义", "平台规范", "内容方向", "团队成员"] as const;
type SectionKey = (typeof SECTIONS)[number];

const INK2 = "var(--cl-neutral)";
const HAIRLINE = "1px solid var(--border-hairline)";
const RULE = "1px solid var(--border)";

export default function SettingsPage() {
  const [defs, setDefs] = useState<MetricDef[]>([]);
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<MetricDef | null>(null);
  const [createPlatform, setCreatePlatform] = useState<string | null>(null);
  const [section, setSection] = useState<SectionKey>("指标定义");
  const [platform, setPlatform] = useState<string>("xiaohongshu");

  const load = useCallback(async () => {
    try {
      const [mRes, pRes, tRes, pbRes] = await Promise.all([
        fetch("/api/settings/metrics"),
        fetch("/api/settings/pillars"),
        fetch("/api/team-members"),
        fetch("/api/settings/playbooks"),
      ]);
      const [m, p, t, pb] = await Promise.all([
        mRes.json(),
        pRes.json(),
        tRes.json(),
        pbRes.json(),
      ]);
      if (!mRes.ok) throw new Error(m.error || "加载失败");
      setDefs(m.definitions);
      if (pRes.ok) setPillars(p.pillars ?? []);
      if (tRes.ok) setMembers(t.members ?? []);
      if (pbRes.ok) setPlaybooks(pb.playbooks ?? []);
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

  const platformDefs = useMemo(
    () => defs.filter((d) => d.platform === platform),
    [defs, platform]
  );
  const rawDefs = platformDefs.filter((d) => d.type === "raw");
  const derivedDefs = platformDefs.filter((d) => d.type === "derived");
  const playbook = useMemo(
    () => playbooks.find((pb) => pb.platform === platform) ?? null,
    [playbooks, platform]
  );

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

  const GRID = "1.5fr 1fr 1.1fr 0.75fr 0.5fr";

  function renderMetricRow(d: MetricDef, last: boolean) {
    return (
      <div
        key={d.id}
        className="grid items-baseline gap-3 px-1 py-[11px]"
        style={{
          gridTemplateColumns: GRID,
          borderBottom: last ? "none" : HAIRLINE,
          opacity: d.isActive ? 1 : 0.6,
        }}
      >
        <span className="text-[13.5px] font-semibold text-ink-primary">
          {d.alias ?? d.displayName}
          {d.alias && (
            <span
              className="mt-0.5 block text-[11.5px] font-normal"
              style={{ color: INK2 }}
            >
              原名:{d.displayName}
            </span>
          )}
        </span>
        <span
          className="text-xs"
          style={{ color: INK2, fontFamily: "ui-monospace, 'SF Mono', monospace" }}
        >
          {d.key}
        </span>
        <span className="text-xs" style={{ color: INK2 }}>
          {d.type === "derived" ? "派生" : "原始"} · {FORMAT_LABEL[d.format]}
          {d.type === "derived" && (
            <span className="mt-0.5 block text-[11.5px]">
              {buildFormulaPreview(d, nameOf(d.platform))}
            </span>
          )}
          {d.caution && (
            <span className="mt-0.5 block text-[11.5px]">
              ⚠ {metricCautionLabel(d.caution)}
            </span>
          )}
        </span>
        <button
          className="flex items-center gap-1.5 text-xs"
          style={{ color: INK2 }}
          onClick={() => toggleActive(d)}
          title={d.isActive ? "点击停用" : "点击启用"}
        >
          <span
            className="inline-block h-[5px] w-[5px] rounded-full"
            style={{ background: d.isActive ? "var(--cl-primary)" : "var(--cl-silver)" }}
          />
          {d.isActive ? "启用" : "停用"}
        </button>
        <button
          className="text-left text-xs font-medium"
          style={{ color: "var(--cl-primary-strong)" }}
          onClick={() => setEditTarget(d)}
        >
          编辑
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header — M7: title only */}
      <header
        className="px-7 pb-[18px] pt-6"
        style={{ borderBottom: RULE }}
      >
        <h1 className="text-[24px] font-semibold leading-tight text-ink-primary">
          设置
        </h1>
      </header>

      {loading ? (
        // M7: fountain transition indicator (喷泉动效 + 页面名)
        <div className="flex min-h-[40vh] flex-1 items-center justify-center">
          <FountainLoader size={30} label="正在加载设置" />
        </div>
      ) : loadError ? (
        <div className="flex items-center gap-3 p-7">
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
        <div className="flex min-h-0 flex-1">
          {/* Utility Index */}
          <nav
            className="sticky top-0 w-[184px] shrink-0 self-start py-[18px]"
            style={{ borderRight: RULE, background: "var(--surface-subtle)" }}
          >
            {SECTIONS.map((s) => {
              const on = section === s;
              return (
                <button
                  key={s}
                  onClick={() => setSection(s)}
                  className="relative block w-full px-5 py-[9px] text-left text-[13px]"
                  style={{
                    color: on ? "var(--cl-ink-strong)" : INK2,
                    fontWeight: on ? 600 : 400,
                  }}
                >
                  {on && (
                    <span
                      className="absolute left-0 top-1/2 h-[18px] w-[2px] -translate-y-1/2 rounded-full"
                      style={{ background: "var(--cl-primary)" }}
                    />
                  )}
                  {s}
                </button>
              );
            })}
          </nav>

          <div className="flex-1 overflow-y-auto px-7 py-[22px]">
            {actionError && (
              <div className="mb-4 rounded-[8px] border border-danger/20 bg-danger/5 p-3 text-xs text-danger">
                {actionError}
              </div>
            )}

            {/* ── 指标定义: Configuration Ledger ── */}
            {section === "指标定义" && (
              <div
                className="rounded-[5px] px-[26px] py-5"
                style={{
                  background: "var(--cl-surface)",
                  border: "1px solid var(--border-mid)",
                }}
              >
                {/* Platform Index Tabs + create */}
                <div
                  className="flex gap-6"
                  style={{ borderBottom: RULE }}
                >
                  {PLATFORMS.map((p) => {
                    const on = platform === p.key;
                    return (
                      <button
                        key={p.key}
                        onClick={() => setPlatform(p.key)}
                        className="relative pb-2 text-[13px]"
                        style={{
                          color: on ? "var(--cl-ink-strong)" : INK2,
                          fontWeight: on ? 600 : 400,
                        }}
                      >
                        {platformLabel(p.key)}
                        {on && (
                          <span
                            className="absolute inset-x-0 -bottom-px h-[2px]"
                            style={{ background: "var(--cl-primary)" }}
                          />
                        )}
                      </button>
                    );
                  })}
                  <button
                    className="ml-auto inline-flex items-center gap-1 pb-2 text-[12.5px]"
                    style={{ color: INK2 }}
                    onClick={() => setCreatePlatform(platform)}
                  >
                    <Plus className="h-3 w-3" />
                    新建派生指标
                  </button>
                </div>

                {platformDefs.length === 0 ? (
                  <p className="px-1 py-4 text-xs" style={{ color: INK2 }}>
                    该平台还没有指标定义。
                  </p>
                ) : (
                  <>
                    <div
                      className="px-1 pb-1 pt-3.5 text-[11px] font-semibold tracking-[0.14em]"
                      style={{ color: INK2 }}
                    >
                      原始指标
                    </div>
                    <div
                      className="grid gap-3 px-1 py-2 text-[11px] font-semibold tracking-[0.1em]"
                      style={{
                        gridTemplateColumns: GRID,
                        color: INK2,
                        borderBottom: RULE,
                      }}
                    >
                      <span>显示名</span>
                      <span>技术键</span>
                      <span>类型</span>
                      <span>状态</span>
                      <span />
                    </div>
                    {rawDefs.map((d, i) =>
                      renderMetricRow(
                        d,
                        i === rawDefs.length - 1 && derivedDefs.length === 0
                      )
                    )}
                    {derivedDefs.length > 0 && (
                      <>
                        <div
                          className="px-1 pb-1 pt-3.5 text-[11px] font-semibold tracking-[0.14em]"
                          style={{ color: INK2 }}
                        >
                          派生指标
                        </div>
                        {derivedDefs.map((d, i) =>
                          renderMetricRow(d, i === derivedDefs.length - 1)
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── 平台规范: Playbook ledger (read) + human edit + AI draft ── */}
            {section === "平台规范" && (
              <div
                className="rounded-[5px] px-[26px] py-5"
                style={{
                  background: "var(--cl-surface)",
                  border: "1px solid var(--border-mid)",
                }}
              >
                {/* Platform Index Tabs */}
                <div
                  className="flex gap-6"
                  style={{ borderBottom: RULE }}
                >
                  {PLATFORMS.map((p) => {
                    const on = platform === p.key;
                    return (
                      <button
                        key={p.key}
                        onClick={() => setPlatform(p.key)}
                        className="relative pb-2 text-[13px]"
                        style={{
                          color: on ? "var(--cl-ink-strong)" : INK2,
                          fontWeight: on ? 600 : 400,
                        }}
                      >
                        {platformLabel(p.key)}
                        {on && (
                          <span
                            className="absolute inset-x-0 -bottom-px h-[2px]"
                            style={{ background: "var(--cl-primary)" }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* key 切换平台时重置编辑态 */}
                <PlaybookPanel
                  key={platform}
                  platform={platform}
                  playbook={playbook}
                  onChanged={load}
                />
              </div>
            )}

            {/* ── 内容方向 ── */}
            {section === "内容方向" && (
              <div
                className="rounded-[5px] px-[26px] py-5"
                style={{
                  background: "var(--cl-surface)",
                  border: "1px solid var(--border-mid)",
                }}
              >
                {pillars.length === 0 ? (
                  <p className="px-1 py-2 text-xs" style={{ color: INK2 }}>
                    还没有内容方向。
                  </p>
                ) : (
                  pillars.map((p, i) => (
                    <div
                      key={p.id}
                      className="px-1 py-3"
                      style={{
                        borderBottom:
                          i < pillars.length - 1 ? HAIRLINE : "none",
                      }}
                    >
                      <div className="text-[13.5px] font-semibold text-ink-primary">
                        {p.name}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── 团队成员 ── */}
            {section === "团队成员" && (
              <div
                className="rounded-[5px] px-[26px] py-5"
                style={{
                  background: "var(--cl-surface)",
                  border: "1px solid var(--border-mid)",
                }}
              >
                {members.length === 0 ? (
                  <p className="px-1 py-2 text-xs" style={{ color: INK2 }}>
                    还没有团队成员。
                  </p>
                ) : (
                  members.map((m, i) => (
                    <div
                      key={m.id}
                      className="flex items-baseline gap-3 px-1 py-[11px]"
                      style={{
                        borderBottom:
                          i < members.length - 1 ? HAIRLINE : "none",
                      }}
                    >
                      <span className="text-[13.5px] font-semibold text-ink-primary">
                        {m.name}
                      </span>
                      {m.title && (
                        <span className="text-xs" style={{ color: INK2 }}>
                          {m.title}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
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

// ─── Playbook panel (平台规范) ─────────────────────────

interface PlaybookForm {
  voice: string;
  titleStyle: string;
  hookStyle: string;
  structure: string;
  cta: string;
  /** One avoid-rule per line. */
  avoidText: string;
  examples: { title: string; note: string; url: string }[];
}

const EMPTY_FORM: PlaybookForm = {
  voice: "",
  titleStyle: "",
  hookStyle: "",
  structure: "",
  cta: "",
  avoidText: "",
  examples: [],
};

function formFromPlaybook(pb: Playbook | null): PlaybookForm {
  if (!pb) return EMPTY_FORM;
  return {
    voice: pb.voice ?? "",
    titleStyle: pb.titleStyle ?? "",
    hookStyle: pb.hookStyle ?? "",
    structure: pb.structure ?? "",
    cta: pb.cta ?? "",
    avoidText: (pb.avoid ?? []).join("\n"),
    examples: (pb.goodExamples ?? []).map((e) => ({
      title: e.title,
      note: e.note ?? "",
      url: e.url ?? "",
    })),
  };
}

function formFromDraft(d: AIPlaybookDraft): PlaybookForm {
  return {
    voice: d.voice,
    titleStyle: d.titleStyle,
    hookStyle: d.hookStyle,
    structure: d.structure,
    cta: d.cta,
    avoidText: d.avoid.join("\n"),
    examples: d.goodExamples.map((e) => ({
      title: e.title,
      note: e.note ?? "",
      url: e.url ?? "",
    })),
  };
}

/**
 * Playbook panel — read ledger + human edit + AI draft (AGENTS §21).
 * AI drafts fill the edit form only; the PUT save is always a human
 * action. AI never overwrites saved rules.
 *
 * Learning → Playbook (PRD §15.5, data-model §28 Rule 9): relevant
 * learnings (this platform or platform-agnostic) surface as a light
 * banner; "添加为规则" transcribes the learning text into a
 * human-picked form field — never directly into the saved playbook.
 * "忽略" is session-local (no association table in V1).
 */
function PlaybookPanel({
  platform,
  playbook,
  onChanged,
}: {
  platform: string;
  playbook: Playbook | null;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [draftBanner, setDraftBanner] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<PlaybookForm>(EMPTY_FORM);
  const [learnings, setLearnings] = useState<
    { id: string; text: string; platform: string | null }[] | null
  >(null);
  const [ignored, setIgnored] = useState<Set<string>>(new Set());
  const [ruleTargetFor, setRuleTargetFor] = useState<string | null>(null);
  const [addedNote, setAddedNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/learnings")
      .then((r) => (r.ok ? r.json() : { learnings: [] }))
      .then((d) => {
        if (!cancelled) setLearnings(d.learnings ?? []);
      })
      .catch(() => {
        if (!cancelled) setLearnings([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const relevantLearnings = (learnings ?? []).filter(
    (l) => (l.platform === platform || l.platform === null) && !ignored.has(l.id)
  );

  type RuleField =
    | "voice"
    | "titleStyle"
    | "hookStyle"
    | "structure"
    | "cta"
    | "avoid";

  const RULE_FIELD_LABEL: Record<RuleField, string> = {
    voice: "语气",
    titleStyle: "标题风格",
    hookStyle: "钩子",
    structure: "结构",
    cta: "行动召唤",
    avoid: "避免",
  };

  /** Transcribe a learning into a human-picked field (edit draft only). */
  function addAsRule(
    l: { id: string; text: string },
    field: RuleField
  ) {
    setForm((prev) => {
      const base = editing ? prev : formFromPlaybook(playbook);
      if (field === "avoid") {
        return {
          ...base,
          avoidText: base.avoidText.trim()
            ? `${base.avoidText.trimEnd()}\n${l.text}`
            : l.text,
        };
      }
      const cur = base[field].trim();
      return { ...base, [field]: cur ? `${cur}\n${l.text}` : l.text };
    });
    setEditing(true);
    setDraftBanner(false);
    setRuleTargetFor(null);
    setAddedNote(`已填入「${RULE_FIELD_LABEL[field]}」——请审阅、调整后保存。`);
  }

  function startEdit() {
    setForm(formFromPlaybook(playbook));
    setDraftBanner(false);
    setError(null);
    setEditing(true);
  }

  async function generateDraft() {
    setDrafting(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/playbooks/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失败");
      setForm(formFromDraft(data.draft));
      setDraftBanner(true);
      setEditing(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败");
    } finally {
      setDrafting(false);
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const text = (v: string) => {
        const t = v.trim();
        return t === "" ? null : t;
      };
      const avoid = form.avoidText
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l !== "");
      const examples = form.examples
        .map((e) => ({
          title: e.title.trim(),
          note: e.note.trim(),
          url: e.url.trim(),
        }))
        .filter((e) => e.title !== "")
        .map((e) => ({
          title: e.title,
          ...(e.note ? { note: e.note } : {}),
          ...(e.url ? { url: e.url } : {}),
        }));
      const res = await fetch("/api/settings/playbooks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          voice: text(form.voice),
          titleStyle: text(form.titleStyle),
          hookStyle: text(form.hookStyle),
          structure: text(form.structure),
          cta: text(form.cta),
          avoid: avoid.length > 0 ? avoid : null,
          goodExamples: examples.length > 0 ? examples : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失败");
      setEditing(false);
      setDraftBanner(false);
      setAddedNote(null);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  const FIELD_LABEL: Record<Exclude<keyof PlaybookForm, "avoidText" | "examples">, string> = {
    voice: "语气",
    titleStyle: "标题风格",
    hookStyle: "钩子",
    structure: "结构",
    cta: "行动召唤",
  };

  const inputCls =
    "w-full rounded-[5px] border border-border bg-workspace px-3 py-2 text-[13px] text-ink-primary outline-none focus:border-mint-600";

  return (
    <div>
      {/* Action row */}
      <div className="flex items-center justify-end gap-4 pt-3">
        {drafting ? (
          <span
            className="inline-flex items-center gap-2 text-xs"
            style={{ color: INK2 }}
          >
            <ThinkingOrbs size={18} />
            正在起草平台规范…
          </span>
        ) : editing ? (
          <span className="text-[11.5px]" style={{ color: INK2 }}>
            编辑中——保存后 AI 适配立即引用新规范
          </span>
        ) : (
          <>
            <div className="w-[168px]">
              <AiActionButton label="AI 生成草稿" onClick={generateDraft} />
            </div>
            <button
              className="text-[12.5px] font-medium"
              style={{ color: "var(--cl-primary-strong)" }}
              onClick={startEdit}
            >
              编辑
            </button>
          </>
        )}
      </div>

      {/* Learning → Playbook 提示（PRD §15.5） */}
      {relevantLearnings.length > 0 && (
        <div
          className="mt-3 rounded-[5px] px-3 py-2"
          style={{
            background: "var(--mint-tint)",
            border: "1px solid var(--mint-line)",
          }}
        >
          <p
            className="text-[11px] font-semibold tracking-[0.14em]"
            style={{ color: INK2 }}
          >
            {relevantLearnings.length} 条经验可能与本平台相关
          </p>
          {relevantLearnings.map((l) => (
            <div
              key={l.id}
              className="mt-1.5 pt-1.5"
              style={{ borderTop: HAIRLINE }}
            >
              <p className="text-xs leading-relaxed text-ink-primary">
                {l.text}
                {l.platform === null && (
                  <span style={{ color: INK2 }}>（全平台经验）</span>
                )}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px]">
                {ruleTargetFor === l.id ? (
                  <>
                    <span style={{ color: INK2 }}>添加到字段：</span>
                    {(
                      Object.keys(RULE_FIELD_LABEL) as RuleField[]
                    ).map((f) => (
                      <button
                        key={f}
                        className="font-medium"
                        style={{ color: "var(--cl-primary-strong)" }}
                        onClick={() => addAsRule(l, f)}
                      >
                        {RULE_FIELD_LABEL[f]}
                      </button>
                    ))}
                    <button
                      style={{ color: INK2 }}
                      onClick={() => setRuleTargetFor(null)}
                    >
                      返回
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="font-medium"
                      style={{ color: "var(--cl-primary-strong)" }}
                      onClick={() => setRuleTargetFor(l.id)}
                    >
                      添加为规则
                    </button>
                    <button
                      style={{ color: INK2 }}
                      onClick={() =>
                        setIgnored((prev) => new Set(prev).add(l.id))
                      }
                    >
                      忽略
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {addedNote && editing && (
        <p
          className="mt-3 rounded-[5px] px-3 py-2 text-xs"
          style={{
            color: INK2,
            background: "var(--mint-tint)",
            border: "1px solid var(--mint-line)",
          }}
        >
          {addedNote}
        </p>
      )}

      {error && (
        <div className="mt-3 rounded-[5px] border border-danger/20 bg-danger/5 p-3 text-xs text-danger">
          {error}
        </div>
      )}

      {editing && draftBanner && (
        <div
          className="mt-3 rounded-[5px] px-3 py-2 text-xs"
          style={{
            color: INK2,
            background: "var(--gold-tint)",
            border: "1px solid var(--gold-line)",
          }}
        >
          AI 草稿——请逐条审阅、修改后保存。保存前不会写入，也不会覆盖现有规范。
        </div>
      )}

      {editing ? (
        <div className="mt-2">
          {(
            Object.keys(FIELD_LABEL) as (keyof typeof FIELD_LABEL)[]
          ).map((k) => (
            <div
              key={k}
              className="grid gap-3 px-1 py-[11px]"
              style={{
                gridTemplateColumns: "120px 1fr",
                borderBottom: HAIRLINE,
              }}
            >
              <span
                className="pt-2 text-[11px] font-semibold tracking-[0.14em]"
                style={{ color: INK2 }}
              >
                {FIELD_LABEL[k]}
              </span>
              <textarea
                className={inputCls}
                rows={2}
                value={form[k]}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, [k]: e.target.value }))
                }
              />
            </div>
          ))}
          <div
            className="grid gap-3 px-1 py-[11px]"
            style={{
              gridTemplateColumns: "120px 1fr",
              borderBottom: HAIRLINE,
            }}
          >
            <span
              className="pt-2 text-[11px] font-semibold tracking-[0.14em]"
              style={{ color: INK2 }}
            >
              避免
            </span>
            <div>
              <textarea
                className={inputCls}
                rows={3}
                value={form.avoidText}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, avoidText: e.target.value }))
                }
              />
              <p className="mt-1 text-[11.5px]" style={{ color: INK2 }}>
                每行一条
              </p>
            </div>
          </div>
          <div
            className="grid gap-3 px-1 py-[11px]"
            style={{ gridTemplateColumns: "120px 1fr" }}
          >
            <span
              className="pt-2 text-[11px] font-semibold tracking-[0.14em]"
              style={{ color: INK2 }}
            >
              优秀案例
            </span>
            <div className="space-y-2">
              {form.examples.map((ex, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="flex-1 space-y-1.5">
                    <input
                      className={inputCls}
                      placeholder="标题 *"
                      value={ex.title}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          examples: prev.examples.map((x, j) =>
                            j === i ? { ...x, title: e.target.value } : x
                          ),
                        }))
                      }
                    />
                    <div className="flex gap-2">
                      <input
                        className={inputCls}
                        placeholder="备注（可选）"
                        value={ex.note}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            examples: prev.examples.map((x, j) =>
                              j === i ? { ...x, note: e.target.value } : x
                            ),
                          }))
                        }
                      />
                      <input
                        className={inputCls}
                        placeholder="URL（可选）"
                        value={ex.url}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            examples: prev.examples.map((x, j) =>
                              j === i ? { ...x, url: e.target.value } : x
                            ),
                          }))
                        }
                      />
                    </div>
                  </div>
                  <button
                    className="pt-2 text-xs"
                    style={{ color: INK2 }}
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        examples: prev.examples.filter((_, j) => j !== i),
                      }))
                    }
                  >
                    移除
                  </button>
                </div>
              ))}
              <button
                className="text-[12.5px]"
                style={{ color: INK2 }}
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    examples: [
                      ...prev.examples,
                      { title: "", note: "", url: "" },
                    ],
                  }))
                }
              >
                <Plus className="mr-1 inline h-3 w-3" />
                添加案例
              </button>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditing(false);
                setDraftBanner(false);
                setAddedNote(null);
                setError(null);
              }}
            >
              取消
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={save}
              disabled={saving}
            >
              {saving ? "保存中…" : "保存规范"}
            </Button>
          </div>
        </div>
      ) : !playbook ? (
        <p className="px-1 py-4 text-xs" style={{ color: INK2 }}>
          该平台还没有平台规范——点击「编辑」手动填写，或用「AI 生成草稿」起草后审阅保存。
        </p>
      ) : (
        <>
          {PLAYBOOK_FIELDS.map((f) => (
            <div
              key={f.key}
              className="grid gap-3 px-1 py-[11px]"
              style={{
                gridTemplateColumns: "120px 1fr",
                borderBottom: HAIRLINE,
              }}
            >
              <span
                className="text-[11px] font-semibold tracking-[0.14em]"
                style={{ color: INK2 }}
              >
                {f.label}
              </span>
              <span className="text-[13px] leading-relaxed text-ink-primary">
                {playbook[f.key] ?? "—"}
              </span>
            </div>
          ))}
          <div
            className="grid gap-3 px-1 py-[11px]"
            style={{
              gridTemplateColumns: "120px 1fr",
              borderBottom: HAIRLINE,
            }}
          >
            <span
              className="text-[11px] font-semibold tracking-[0.14em]"
              style={{ color: INK2 }}
            >
              避免
            </span>
            <span className="text-[13px] leading-relaxed text-ink-primary">
              {playbook.avoid && playbook.avoid.length > 0
                ? playbook.avoid.join("；")
                : "—"}
            </span>
          </div>
          <div
            className="grid gap-3 px-1 py-[11px]"
            style={{ gridTemplateColumns: "120px 1fr" }}
          >
            <span
              className="text-[11px] font-semibold tracking-[0.14em]"
              style={{ color: INK2 }}
            >
              优秀案例
            </span>
            <div>
              {playbook.goodExamples && playbook.goodExamples.length > 0 ? (
                playbook.goodExamples.map((ex, i) => (
                  <div
                    key={i}
                    className="text-[13px] leading-relaxed text-ink-primary"
                  >
                    {ex.url ? (
                      <a
                        href={ex.url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline decoration-mint-600/40 underline-offset-2"
                      >
                        {ex.title}
                      </a>
                    ) : (
                      ex.title
                    )}
                    {ex.note && (
                      <span
                        className="block text-[11.5px]"
                        style={{ color: INK2 }}
                      >
                        {ex.note}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <span className="text-[13px] text-ink-primary">—</span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
