"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ResultSection, type ResultData } from "@/components/analytics/test-result-section";
import { LearningSection } from "@/components/analytics/learning-section";
import {
  HAIRLINE,
  RULE,
  INK_FUNCTIONAL,
  SURFACE,
  Motif,
  LedgerLabel,
  StatusDot,
} from "@/components/analytics/ledger";
import { createTestFormSubmittable } from "@/lib/validation/test";
import { CHECKPOINTS } from "@/lib/validation/snapshot";
import {
  checkpointLabel,
  platformLabel,
  testMethodLabel,
  testStatusLabel,
  testRoleLabel,
  TEST_METHOD_HELPERS,
  TEST_METHODS_FOOTNOTE,
  TEST_SECTION_HELPER,
  TEST_ROLE_HELPER,
  CHECKPOINT_HELPER,
  PRIMARY_METRIC_HELPER,
} from "@/lib/labels";

/**
 * Tests section — M3.1 Test Core (Analytics → Tests).
 *
 * Create modal IS the review gate: confirm writes the test with
 * status=running (server-owned). Core definition is locked at create.
 * Running tests: edit descriptive fields, attach/detach publications,
 * or Discard (M4.1 — removes the test and its links only).
 *
 * M8-B3: presentation aligned to the M7 ledger language — hairline
 * rows, Sec/Motif header, status as text + dot. Data flow, gates and
 * conditional branches are unchanged.
 */

interface TestRow {
  id: string;
  title: string;
  platform: string;
  checkpoint: string;
  method: string;
  status: string;
  primaryMetricKey: string;
  publicationCount: number;
  createdAt: string;
}

interface TestDetail {
  test: {
    id: string;
    title: string;
    hypothesis: string;
    change: string;
    primaryMetricKey: string;
    platform: string;
    checkpoint: string;
    method: string;
    status: string;
    keepConsistent: string | null;
    compareWith: string | null;
  };
  publications: {
    id: string;
    publicationId: string;
    role: string;
    finalTitle: string;
    hasCheckpointData: boolean;
  }[];
}

const PLATFORM_KEYS = ["xiaohongshu", "bilibili", "douyin"] as const;

export interface TestCreateRequest {
  platform: string;
  checkpoint: string;
  contextLabel: string;
}

export function TestsSection({
  publications,
  createRequest,
  onCreateRequestHandled,
}: {
  publications: { publicationId: string; finalTitle: string; platform: string }[];
  /** M4.2: external entry (e.g. from a saved diagnosis). Opens the same
   *  Create Test dialog with safe prefill — never a second mutation path. */
  createRequest?: TestCreateRequest | null;
  onCreateRequestHandled?: () => void;
}) {
  const [tests, setTests] = useState<TestRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // External create request opens the same dialog — derived, no effect.
  const createVisible = createOpen || !!createRequest;

  function closeCreate() {
    setCreateOpen(false);
    onCreateRequestHandled?.();
  }

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/tests");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "运营测试加载失败");
      setTests(data.tests);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "运营测试加载失败");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="mt-10">
      <div className="mb-1 flex items-center gap-2">
        <Motif />
        <span className="text-[15px] font-semibold text-ink-primary">运营测试</span>
        <span
          className="ml-auto text-xs"
          style={{ color: INK_FUNCTIONAL }}
        >
          {loaded ? `${tests.length} 条 · ` : ""}
          {TEST_SECTION_HELPER}
        </span>
        <Button variant="secondary" size="sm" onClick={() => setCreateOpen(true)}>
          创建运营测试
        </Button>
      </div>

      {error && (
        <div className="py-2 text-xs text-danger">{error}</div>
      )}

      {loaded && tests.length === 0 ? (
        <div
          className="mt-2 rounded-[5px] px-6 py-6 text-center"
          style={{ background: SURFACE, border: "1px dashed var(--cl-silver)" }}
        >
          <p className="text-xs" style={{ color: INK_FUNCTIONAL }}>
            还没有运营测试。从一个关于已发布内容的真实问题开始创建。
          </p>
        </div>
      ) : (
        <div className="mt-1" style={{ borderTop: RULE }}>
          {tests.map((t) => (
            <button
              key={t.id}
              className="w-full px-3 py-2.5 text-left transition-colors duration-150 hover:bg-[var(--mint-tint)]"
              style={{ borderBottom: HAIRLINE }}
              onClick={() => setSelectedId(t.id)}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-[13.5px] font-medium text-ink-primary">
                  {t.title}
                </span>
                <span
                  className="flex shrink-0 items-center gap-1.5 text-xs"
                  style={{ color: INK_FUNCTIONAL }}
                >
                  {t.status === "running" && <StatusDot />}
                  {testStatusLabel(t.status)}
                </span>
              </div>
              <p
                className="mt-0.5 text-xs"
                style={{ color: INK_FUNCTIONAL }}
              >
                {platformLabel(t.platform)} · {checkpointLabel(t.checkpoint)} ·{" "}
                {testMethodLabel(t.method)} · {t.primaryMetricKey} ·{" "}
                {t.publicationCount} 条发布
              </p>
            </button>
          ))}
        </div>
      )}

      {createVisible && (
        <CreateTestDialog
          initialPlatform={createRequest?.platform}
          initialCheckpoint={createRequest?.checkpoint}
          contextLabel={createRequest?.contextLabel}
          onClose={closeCreate}
          onCreated={() => {
            closeCreate();
            load();
          }}
        />
      )}

      {selectedId && (
        <TestDetailDrawer
          testId={selectedId}
          publications={publications}
          onClose={() => setSelectedId(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}

// ─── Create Test (modal = the review gate) ─────────────

function CreateTestDialog({
  initialPlatform,
  initialCheckpoint,
  contextLabel,
  onClose,
  onCreated,
}: {
  /** M4.2 safe prefill — presentation only. Platform/checkpoint stay
   *  editable; every other field is always human-chosen. The submit
   *  path and server validation are unchanged. */
  initialPlatform?: string;
  initialCheckpoint?: string;
  contextLabel?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [platform, setPlatform] = useState(initialPlatform ?? "xiaohongshu");
  const [method, setMethod] = useState("");
  const [checkpoint, setCheckpoint] = useState(initialCheckpoint ?? "24h");
  const [title, setTitle] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [change, setChange] = useState("");
  const [primaryMetricKey, setPrimaryMetricKey] = useState("");
  const [keepConsistent, setKeepConsistent] = useState("");
  const [compareWith, setCompareWith] = useState("");
  const [metricOptions, setMetricOptions] = useState<{ key: string; label: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings/metrics")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const defs = (data.definitions as { platform: string; isActive: boolean; key: string; alias: string | null; displayName: string }[])
          .filter((d) => d.platform === platform && d.isActive);
        setMetricOptions(defs.map((d) => ({ key: d.key, label: d.alias ?? d.displayName })));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [platform]);

  const valid = createTestFormSubmittable({
    method,
    title,
    hypothesis,
    change,
    primaryMetricKey,
  });

  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          checkpoint,
          method,
          title,
          hypothesis,
          change,
          primaryMetricKey,
          keepConsistent: keepConsistent || null,
          compareWith: compareWith || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "创建失败");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>创建运营测试</DialogTitle>
          <DialogDescription>
            创建后测试立即开始。平台、数据点、方法、假设和主要指标将锁定。
          </DialogDescription>
        </DialogHeader>

        {contextLabel && (
          <p
            className="rounded-[5px] px-3 py-2 text-xs"
            style={{
              background: SURFACE,
              border: "1px dashed var(--cl-silver)",
              color: INK_FUNCTIONAL,
            }}
          >
            创建运营测试，基于：{contextLabel}
          </p>
        )}

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-secondary">平台 *</label>
              <select className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600" value={platform} onChange={(e) => { setPlatform(e.target.value); setPrimaryMetricKey(""); }}>
                {PLATFORM_KEYS.map((k) => <option key={k} value={k}>{platformLabel(k)}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-secondary">数据点 *</label>
              <select className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600" value={checkpoint} onChange={(e) => setCheckpoint(e.target.value)}>
                {CHECKPOINTS.map((c) => (
                  <option key={c} value={c}>{checkpointLabel(c)}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-ink-secondary">{CHECKPOINT_HELPER}</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-secondary">方法 *</label>
              <select className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600" value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="">— 请选择 —</option>
                {Object.keys(TEST_METHOD_HELPERS).map((k) => <option key={k} value={k}>{testMethodLabel(k)}</option>)}
              </select>
              {method && TEST_METHOD_HELPERS[method] && (
                <p className="mt-1 text-xs text-ink-secondary">{TEST_METHOD_HELPERS[method]}</p>
              )}
              <p className="mt-1 text-xs text-ink-secondary">{TEST_METHODS_FOOTNOTE}</p>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-secondary">标题 *</label>
            <input className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-secondary">假设 *</label>
            <textarea rows={2} className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600" value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-secondary">改动 *</label>
            <textarea rows={2} className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600" value={change} onChange={(e) => setChange(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-secondary">主要指标 *</label>
            <select className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600" value={primaryMetricKey} onChange={(e) => setPrimaryMetricKey(e.target.value)}>
              <option value="">— 请选择 —</option>
              {metricOptions.map((m) => <option key={m.key} value={m.key}>{m.label} ({m.key})</option>)}
            </select>
            <p className="mt-1 text-xs text-ink-secondary">{PRIMARY_METRIC_HELPER}</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-secondary">保持一致项</label>
            <input className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600" value={keepConsistent} onChange={(e) => setKeepConsistent(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-secondary">对比对象</label>
            <input className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600" value={compareWith} onChange={(e) => setCompareWith(e.target.value)} />
          </div>

          {error && (
            <div className="rounded-[8px] border border-danger/20 bg-danger/5 p-3 text-xs text-danger">{error}</div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={submit} disabled={!valid || busy}>
            {busy ? "创建中…" : "确认创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Test detail drawer ────────────────────────────────

function TestDetailDrawer({
  testId,
  publications,
  onClose,
  onChanged,
}: {
  testId: string;
  publications: { publicationId: string; finalTitle: string; platform: string }[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<TestDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attachId, setAttachId] = useState("");
  const [role, setRole] = useState("comparison");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editKeep, setEditKeep] = useState("");
  const [editCompare, setEditCompare] = useState("");
  const [result, setResult] = useState<ResultData | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);
  const [concludeOpen, setConcludeOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [outcome, setOutcome] = useState("no_clear_result");
  const [conclusion, setConclusion] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/tests/${testId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加载失败");
      setDetail(data);
      setError(null);
      const rres = await fetch(`/api/tests/${testId}/result`);
      const rdata = await rres.json();
      if (rres.ok) {
        setResult(rdata);
        setResultError(null);
      } else {
        setResultError(rdata.error || "结果加载失败");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    }
  }, [testId]);

  useEffect(() => {
    const t = setTimeout(() => load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  function startEdit() {
    if (!detail) return;
    setEditTitle(detail.test.title);
    setEditKeep(detail.test.keepConsistent ?? "");
    setEditCompare(detail.test.compareWith ?? "");
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  async function saveEdit() {
    if (!detail || busy || editTitle.trim() === "") return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/tests/${testId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          keepConsistent: editKeep || null,
          compareWith: editCompare || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失败");
      setEditing(false);
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  async function conclude() {
    if (!result || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/tests/${testId}/conclude`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outcome,
          conclusion,
          previewFingerprint: result.previewFingerprint,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Fingerprint conflict: close the panel, refetch the latest
        // authoritative result — the human must re-review before
        // concluding. The error never touches the result state.
        if (res.status === 409) {
          setConcludeOpen(false);
          await load();
        }
        throw new Error(data.error || "完成测试失败");
      }
      setConcludeOpen(false);
      setConclusion("");
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "完成测试失败");
    } finally {
      setBusy(false);
    }
  }

  async function discard() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/tests/${testId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "放弃失败");
      setDiscardOpen(false);
      onChanged();
      onClose();
    } catch (err) {
      setDiscardOpen(false);
      setError(err instanceof Error ? err.message : "放弃失败");
    } finally {
      setBusy(false);
    }
  }

  async function attach() {    if (!attachId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/tests/${testId}/publications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicationId: attachId, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "关联失败");
      setAttachId("");
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "关联失败");
    } finally {
      setBusy(false);
    }
  }

  async function detach(publicationId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/tests/${testId}/publications?publicationId=${publicationId}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "移除失败");
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "移除失败");
    } finally {
      setBusy(false);
    }
  }

  const candidates = useMemo(() => {
    if (!detail) return [];
    const attached = new Set(detail.publications.map((p) => p.publicationId));
    return publications.filter(
      (p) => p.platform === detail.test.platform && !attached.has(p.publicationId)
    );
  }, [detail, publications]);

  const running = detail?.test.status === "running";

  return (
    <Drawer open onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        {detail ? (
          <>
            <DrawerHeader>
              {editing ? (
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-secondary">标题</label>
                  <input
                    className="w-full rounded-[8px] border border-border bg-canvas px-3 py-2 text-sm text-ink-primary outline-none focus:border-mint-600"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />
                </div>
              ) : (
                <DrawerTitle>{detail.test.title}</DrawerTitle>
              )}
              <DrawerDescription>
                {platformLabel(detail.test.platform)} · {checkpointLabel(detail.test.checkpoint)} ·{" "}
                {testMethodLabel(detail.test.method)} · {detail.test.primaryMetricKey} ·{" "}
                {testStatusLabel(detail.test.status)}
              </DrawerDescription>
            </DrawerHeader>

            <div className="space-y-4 text-sm">
              {running && !editing && (
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" onClick={startEdit}>
                    编辑
                  </Button>
                </div>
              )}
              {editing && (
                <div
                  className="space-y-3 rounded-[5px] p-3"
                  style={{
                    background: "var(--mint-tint)",
                    border: "1px solid var(--mint-line)",
                  }}
                >
                  <p className="text-xs font-medium text-ink-primary">
                    编辑中——只有标题、保持一致项和对比对象可以修改。测试定义已锁定。
                  </p>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink-secondary">保持一致项</label>
                    <input
                      className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600"
                      value={editKeep}
                      onChange={(e) => setEditKeep(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink-secondary">对比对象</label>
                    <input
                      className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600"
                      value={editCompare}
                      onChange={(e) => setEditCompare(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="primary" size="sm" onClick={saveEdit} disabled={busy || editTitle.trim() === ""}>
                      {busy ? "保存中…" : "保存"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={cancelEdit}>
                      取消
                    </Button>
                  </div>
                </div>
              )}
              <section>
                <LedgerLabel>假设</LedgerLabel>
                <p className="mt-1 text-ink-primary">{detail.test.hypothesis}</p>
              </section>
              <section>
                <LedgerLabel>改动</LedgerLabel>
                <p className="mt-1 text-ink-primary">{detail.test.change}</p>
              </section>
              {!editing && (detail.test.keepConsistent || detail.test.compareWith) && (
                <section className="text-xs" style={{ color: INK_FUNCTIONAL }}>
                  {detail.test.keepConsistent && <p>保持一致项：{detail.test.keepConsistent}</p>}
                  {detail.test.compareWith && <p>对比对象：{detail.test.compareWith}</p>}
                </section>
              )}

              <section>
                <LedgerLabel>
                  发布记录（{detail.publications.length}）
                </LedgerLabel>
                <div className="mt-2" style={{ borderTop: HAIRLINE }}>
                  {detail.publications.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-2 px-1 py-2"
                      style={{ borderBottom: HAIRLINE }}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-ink-primary">{p.finalTitle}</p>
                        <p className="text-[11px]" style={{ color: INK_FUNCTIONAL }}>
                          {testRoleLabel(p.role)} · {p.hasCheckpointData ? `已有 ${checkpointLabel(detail.test.checkpoint)} 数据` : `还没有 ${checkpointLabel(detail.test.checkpoint)} 数据`}
                        </p>
                      </div>
                      {running && (
                        <button
                          className="shrink-0 text-xs hover:text-danger"
                          style={{ color: INK_FUNCTIONAL }}
                          onClick={() => detach(p.publicationId)}
                          disabled={busy}
                        >
                          移除
                        </button>
                      )}
                    </div>
                  ))}
                  {detail.publications.length === 0 && (
                    <p className="py-2 text-xs text-ink-faint">尚未关联发布记录。</p>
                  )}
                </div>

                {running && (
                  <div className="mt-3 space-y-2">
                    {/* Row 1: publication selector takes the full width —
                        long titles can never push the action out. */}
                    <select
                      className="w-full min-w-0 rounded-[8px] border border-border bg-workspace px-2 py-1.5 text-xs outline-none focus:border-mint-600"
                      value={attachId}
                      onChange={(e) => setAttachId(e.target.value)}
                    >
                      <option value="">选择发布记录…</option>
                      {candidates.map((p) => (
                        <option key={p.publicationId} value={p.publicationId}>{p.finalTitle}</option>
                      ))}
                    </select>
                    {/* Row 2: role flexible, Add never shrinks away. */}
                    <div className="flex items-center gap-2">
                      <select
                        className="min-w-0 flex-1 rounded-[8px] border border-border bg-workspace px-2 py-1.5 text-xs outline-none focus:border-mint-600"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                      >
                        <option value="comparison">{testRoleLabel("comparison")}</option>
                        <option value="control">{testRoleLabel("control")}</option>
                        <option value="variant">{testRoleLabel("variant")}</option>
                      </select>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="shrink-0"
                        onClick={attach}
                        disabled={!attachId || busy}
                      >
                        添加
                      </Button>
                    </div>
                    <p className="text-xs text-ink-secondary">{TEST_ROLE_HELPER}</p>
                  </div>
                )}
              </section>

              {!running && <LearningSection testId={testId} />}

              <ResultSection
                running={running}
                result={result}
                resultError={resultError}
                onRetryResult={load}
                concludeOpen={concludeOpen}
                onOpenConclude={() => setConcludeOpen(true)}
                onCloseConclude={() => setConcludeOpen(false)}
                outcome={outcome}
                setOutcome={setOutcome}
                conclusion={conclusion}
                setConclusion={setConclusion}
                onConclude={conclude}
                busy={busy}
              />

              {running && (
                <div className="pt-3" style={{ borderTop: RULE }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger hover:bg-danger/5 hover:text-danger"
                    onClick={() => setDiscardOpen(true)}
                  >
                    放弃测试
                  </Button>
                </div>
              )}

              {error && (
                <div className="rounded-[8px] border border-danger/20 bg-danger/5 p-3 text-xs text-danger">{error}</div>
              )}
            </div>

            {discardOpen && (
              <Dialog open onOpenChange={(o) => !o && setDiscardOpen(false)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>放弃测试</DialogTitle>
                    <DialogDescription>
                      这会删除这个进行中的运营测试及其发布关联。不会删除已发布内容或指标数据。
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setDiscardOpen(false)}>
                      取消
                    </Button>
                    <Button variant="danger" onClick={discard} disabled={busy}>
                      {busy ? "放弃中…" : "放弃测试"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </>
        ) : (
          <p className="text-sm text-ink-muted">正在加载测试…</p>
        )}
      </DrawerContent>
    </Drawer>
  );
}
