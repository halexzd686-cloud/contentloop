"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FountainLoader } from "@/components/motion/fountain-loader";
import { RibbonPillLoader } from "@/components/motion/ribbon-pill-loader";
import { RefreshCw } from "lucide-react";
import {
  formatMetricValue,
  type MetricFormat,
} from "@/lib/metrics/engine";
import {
  calculateComparison,
  formatDelta,
  selectDefaultTarget,
  parseAnalyticsTarget,
} from "@/lib/metrics/comparison";
import {
  MetricSnapshotModal,
  type SnapshotSummary,
} from "@/components/studio/snapshot-modal";
import type { Checkpoint } from "@/lib/validation/snapshot";
import { snapshotEntryMode } from "@/lib/snapshot-entry";
import {
  LoopAnalysis,
  type DiagnosisRecord,
} from "@/components/analytics/loop-analysis";
import { ImportMetricsModal } from "@/components/analytics/import-modal";
import { TestsSection, type TestCreateRequest } from "@/components/analytics/tests-section";
import { LearningsSection } from "@/components/analytics/learnings-section";
import { HAIRLINE, RULE, Sec, StatusDot } from "@/components/analytics/ledger";
import { buildObservations } from "@/lib/metrics/observations";
import { CollapsibleRail } from "@/components/layout/collapsible-rail";
import { platformLabel, snapshotStatusLabel, checkpointLabel, BASELINE_COHORT_HELPER, DEMO_NOTICE } from "@/lib/labels";
import { DemoBadge } from "@/components/ui/demo-badge";

/**
 * Analytics — /app/analytics (M2.5)
 *
 * Fact → Baseline → Deterministic Comparison. No AI, no diagnosis
 * prose, no quality scoring, no cross-platform aggregation.
 * Fact and baseline are separate failure boundaries.
 */

interface IndexPublication {
  contentId: string;
  contentTitle: string;
  publicationId: string;
  finalTitle: string;
  platform: string;
  pillarName: string | null;
  publishedAt: string;
  isDemo: boolean;
  has24h: boolean;
  has72h: boolean;
  hasManual: boolean;
  checkpoints: { checkpoint: Checkpoint; status: "submitted" | "not_due" | "due" }[];
}

interface MetricValue {
  key: string;
  label: string;
  type: "raw" | "derived";
  format: MetricFormat;
  value: number | null;
  formulaPreview: string | null;
}

interface BaselineMetric {
  median: number | null;
  sampleCount: number;
}

interface BaselineScope {
  candidateCount: number;
  medianCaptureDeltaMinutes: number | null;
  metrics: Record<string, BaselineMetric>;
}

interface Observation {
  key: string;
  label: string;
  kind: "above" | "below";
  ratio: number | null;
  value: number;
  baselineMedian: number;
}

interface Detail {
  fact: {
    publicationId: string;
    contentId: string;
    contentTitle: string;
    isDemo: boolean;
    finalTitle: string;
    platform: string;
    pillarName: string | null;
    checkpoint: string;
    publishedAt: string;
    url: string;
    targetAt: string | null;
    capturedAt: string | null;
    captureDeltaMinutes: number | null;
    hasSnapshot: boolean;
    snapshot: SnapshotSummary | null;
    metrics: MetricValue[];
  };
  accountBaseline: BaselineScope | null;
  pillarBaseline: (BaselineScope & { pillarId: string | null }) | { unavailable: string } | null;
  baselineError: string | null;
  observations: Observation[];
  diagnosis: DiagnosisRecord | null;
  diagnosisStale: boolean;
}

function formatCaptureDelta(minutes: number | null): string {
  if (minutes === null) return "";
  const sign = minutes >= 0 ? "+" : "";
  if (Math.abs(minutes) < 90) return `${sign}${Math.round(minutes)} 分钟（相对目标）`;
  const hours = minutes / 60;
  if (Math.abs(hours) < 48) return `${sign}${hours.toFixed(1)} 小时（相对目标）`;
  return `${sign}${(hours / 24).toFixed(1)} 天（相对目标）`;
}

// ─── M7 section chrome (approved analytics-final-v2) ───
// Shared with the Tests / Learnings sections via components/analytics/ledger.

export default function AnalyticsPage() {
  const [index, setIndex] = useState<IndexPublication[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selected, setSelected] = useState<{ publicationId: string; checkpoint: Checkpoint } | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [importOpen, setImportOpen] = useState(false);
  const [snapModal, setSnapModal] = useState<{
    publication: IndexPublication;
    checkpoint: Checkpoint;
    existing: SnapshotSummary | null;
    mode: "create" | "edit";
  } | null>(null);
  const [snapEntryLoading, setSnapEntryLoading] = useState<string | null>(null);
  const [snapEntryError, setSnapEntryError] = useState<{
    key: string;
    message: string;
  } | null>(null);
  const [testCreateRequest, setTestCreateRequest] =
    useState<TestCreateRequest | null>(null);

  /**
   * Checkpoint-status-driven entry (M2.5 blocker fix):
   * - due → create mode immediately
   * - submitted → resolve the authoritative snapshot FIRST (loaded
   *   detail fast path, else GET detail), then open edit mode.
   *   A failed read shows a local error + Retry — never falls back
   *   to create mode, never risks a duplicate POST.
   */
  async function openSnapshotEntry(pub: IndexPublication, cp: Checkpoint) {
    // manual has no schedule: mode comes straight from existence.
    const mode =
      cp === "manual"
        ? pub.hasManual
          ? ("edit" as const)
          : ("create" as const)
        : snapshotEntryMode(
            pub.checkpoints.find((c) => c.checkpoint === cp)?.status ??
              "not_due"
          );
    if (!mode) return;

    if (mode === "create") {
      setSnapModal({ publication: pub, checkpoint: cp, existing: null, mode });
      return;
    }

    // Fast path: selected detail already holds the snapshot.
    if (
      detail?.fact.publicationId === pub.publicationId &&
      detail.fact.checkpoint === cp &&
      detail.fact.snapshot
    ) {
      setSnapModal({
        publication: pub,
        checkpoint: cp,
        existing: detail.fact.snapshot,
        mode,
      });
      return;
    }

    const key = `${pub.publicationId}:${cp}`;
    setSnapEntryLoading(key);
    setSnapEntryError(null);
    try {
      const res = await fetch(`/api/analytics/${pub.publicationId}/${cp}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加载失败");
      if (!data.fact.snapshot) throw new Error("指标数据不存在");
      setSnapModal({
        publication: pub,
        checkpoint: cp,
        existing: data.fact.snapshot,
        mode,
      });
    } catch {
      setSnapEntryError({ key, message: "指标数据加载失败。" });
    } finally {
      setSnapEntryLoading(null);
    }
  }

  const loadIndex = useCallback(async () => {
    try {
      const res = await fetch("/api/analytics");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加载失败");
      setIndex(data.publications);
      setLoadError(null);
      return data.publications as IndexPublication[];
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "加载失败");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (publicationId: string, checkpoint: Checkpoint) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const res = await fetch(`/api/analytics/${publicationId}/${checkpoint}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加载失败");
      setDetail(data);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "加载失败");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const select = useCallback(
    (publicationId: string, checkpoint: Checkpoint) => {
      setSelected({ publicationId, checkpoint });
      loadDetail(publicationId, checkpoint);
    },
    [loadDetail]
  );

  /** Baseline-only retry: read-only baseline endpoint, fact untouched. */
  const retryBaseline = useCallback(async () => {
    if (!selected || !detail) return;
    try {
      const res = await fetch(
        `/api/publications/${selected.publicationId}/metric-snapshots/${selected.checkpoint}/baseline`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "基线加载失败");
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              accountBaseline: data.account,
              pillarBaseline: data.pillar,
              baselineError: null,
              // Same deterministic rules as the server read; keeps the
              // observation section consistent after a baseline retry.
              observations: buildObservations(
                prev.fact.metrics,
                data.account
              ),
            }
          : prev
      );
    } catch (err) {
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              baselineError:
                err instanceof Error ? err.message : "基线加载失败",
            }
          : prev
      );
    }
  }, [selected, detail]);

  useEffect(() => {
    const t = setTimeout(async () => {
      const pubs = await loadIndex();
      // M5.2 (G-51): query deep-link beats the default target; invalid
      // or stale query silently falls back to the default selection.
      const viaQuery = parseAnalyticsTarget(window.location.search, pubs);
      const target = viaQuery ?? selectDefaultTarget(pubs);
      if (target) select(target.publicationId, target.checkpoint);
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedPub = index.find((p) => p.publicationId === selected?.publicationId);

  const raws = useMemo(
    () => detail?.fact.metrics.filter((m) => m.type === "raw") ?? [],
    [detail]
  );
  const deriveds = useMemo(
    () => detail?.fact.metrics.filter((m) => m.type === "derived") ?? [],
    [detail]
  );
  const formatByKey = useMemo(
    () => new Map(detail?.fact.metrics.map((m) => [m.key, m.format]) ?? []),
    [detail]
  );

  function baselineFor(scope: BaselineScope | null | { unavailable: string }, key: string) {
    if (!scope || "unavailable" in scope) return null;
    return scope.metrics[key] ?? null;
  }

  /** Fact ledger row — M7: hairline ledger, current value strongest. */
  function renderFactRow(m: MetricValue) {
    return (
      <div
        key={m.key}
        className="grid items-baseline gap-4 px-1 py-2.5"
        style={{
          gridTemplateColumns: m.formulaPreview ? "1fr auto auto" : "1fr auto",
          borderBottom: HAIRLINE,
        }}
      >
        <span className="text-[13px] text-ink-primary">{m.label}</span>
        {m.formulaPreview && (
          <span className="text-xs" style={{ color: "var(--cl-neutral)" }}>
            {m.formulaPreview}
          </span>
        )}
        <span className="text-right text-[14.5px] font-semibold tabular-nums text-ink-primary">
          {formatMetricValue(m.format, m.value)}
        </span>
      </div>
    );
  }

  /** Baseline comparison row — M7: 当前值 / 账号中位数 / 方向中位数 + n=. */
  function renderBaselineRow(m: MetricValue) {
    const account = detail ? baselineFor(detail.accountBaseline, m.key) : null;
    const pillar = detail ? baselineFor(detail.pillarBaseline, m.key) : null;
    const accCmp = account ? calculateComparison(m.value, account.median) : null;
    const pilCmp = pillar ? calculateComparison(m.value, pillar.median) : null;
    return (
      <div
        key={m.key}
        className="grid items-baseline gap-2.5 px-1 py-[9px] text-[12.5px]"
        style={{ gridTemplateColumns: "1.2fr 1fr 1fr 1fr", borderBottom: HAIRLINE }}
      >
        <span className="text-ink-primary">{m.label}</span>
        <span className="text-right text-[13.5px] font-semibold tabular-nums text-ink-primary">
          {formatMetricValue(m.format, m.value)}
        </span>
        <span className="text-right tabular-nums" style={{ color: "var(--cl-neutral)" }}>
          {account ? (
            <>
              {formatMetricValue(m.format, account.median)}{" "}
              <span className="text-[11.5px]">n={account.sampleCount}</span>
              <span className="ml-1.5 text-[11.5px]">
                {formatDelta(m.format, accCmp?.absoluteDelta ?? null)}
              </span>
            </>
          ) : (
            "N/A"
          )}
        </span>
        <span className="text-right tabular-nums" style={{ color: "var(--cl-neutral)" }}>
          {detail?.pillarBaseline && "unavailable" in detail.pillarBaseline ? (
            <span className="text-[11.5px]">未设置内容方向</span>
          ) : pillar ? (
            <>
              {formatMetricValue(m.format, pillar.median)}{" "}
              <span className="text-[11.5px]">n={pillar.sampleCount}</span>
              <span className="ml-1.5 text-[11.5px]">
                {formatDelta(m.format, pilCmp?.absoluteDelta ?? null)}
              </span>
            </>
          ) : (
            "N/A"
          )}
        </span>
      </div>
    );
  }

  if (loading) {
    // M7: fountain transition indicator (喷泉动效 + 页面名)
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center">
        <FountainLoader size={30} label="正在加载数据复盘" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-sm text-danger">{loadError}</p>
        <Button variant="secondary" size="sm" onClick={() => { setLoading(true); loadIndex(); }}>
          <RefreshCw className="mr-1 h-3 w-3" />
          重试
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Main: index + fact/baseline evidence report */}
      <div className="flex-1 overflow-y-auto px-7 py-5">
        <div className="flex items-center justify-between">
          <h1 className="text-[24px] font-semibold leading-tight text-ink-primary">数据复盘</h1>
          <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
            导入数据
          </Button>
        </div>

        {index.length === 0 ? (
          <div className="mt-12 flex flex-col items-center text-center">
            <p className="text-sm text-ink-secondary">还没有已发布的内容。</p>
            <p className="mt-1 text-xs text-ink-muted">
              请先把一个平台版本标记为已发布。
            </p>
          </div>
        ) : (
          <>
            {/* Publication index — M7 numbered rows with selected rail */}
            <div className="mt-4" style={{ borderTop: RULE }}>
              {index.map((p, i) => {
                const sel = selected?.publicationId === p.publicationId;
                return (
                  <button
                    key={p.publicationId}
                    onClick={() => {
                      const cp: Checkpoint = p.has72h ? "72h" : "24h";
                      select(p.publicationId, cp);
                    }}
                    className="relative flex w-full items-center gap-4 px-3 py-[13px] text-left transition-colors duration-150 hover:bg-[var(--mint-tint)]"
                    style={{
                      borderBottom: HAIRLINE,
                      background: sel ? "var(--mint-tint)" : undefined,
                    }}
                  >
                    {sel && (
                      <span
                        className="absolute left-0 top-1/2 h-6 w-[2px] -translate-y-1/2 rounded-full"
                        style={{ background: "var(--cl-primary)" }}
                      />
                    )}
                    <span
                      className="w-5 shrink-0 text-[14px]"
                      style={{
                        fontFamily: "var(--font-cormorant), serif",
                        color: "var(--ink-muted)",
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[14.5px] font-semibold text-ink-primary">
                          {p.finalTitle}
                        </span>
                        <DemoBadge isDemo={p.isDemo} />
                      </div>
                      <div
                        className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs"
                        style={{ color: "var(--cl-neutral)" }}
                      >
                        <span>{platformLabel(p.platform)}</span>
                        {p.pillarName && <span>· {p.pillarName}</span>}
                        <span>
                          · 发布于 {new Date(p.publishedAt).toLocaleDateString()}
                        </span>
                        {p.checkpoints.map((c) => (
                          <span key={c.checkpoint}>
                            · {c.checkpoint} {snapshotStatusLabel(c.status)}
                            {c.status === "due" && (
                              <span
                                className="ml-1 font-medium text-mint-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openSnapshotEntry(p, c.checkpoint);
                                }}
                              >
                                录入
                              </span>
                            )}
                            {c.status === "submitted" && (
                              <span
                                className="ml-1 hover:text-ink-primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openSnapshotEntry(p, c.checkpoint);
                                }}
                              >
                                {snapEntryLoading ===
                                `${p.publicationId}:${c.checkpoint}`
                                  ? "加载中…"
                                  : "编辑"}
                              </span>
                            )}
                            {snapEntryError?.key ===
                              `${p.publicationId}:${c.checkpoint}` && (
                              <span className="ml-1 text-danger">
                                {snapEntryError.message}
                                <span
                                  className="ml-1 underline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openSnapshotEntry(p, c.checkpoint);
                                  }}
                                >
                                  重试
                                </span>
                              </span>
                            )}
                          </span>
                        ))}
                        {p.hasManual && (
                          <span>
                            · {checkpointLabel("manual")} {snapshotStatusLabel("submitted")}
                            <span
                              className="ml-1 hover:text-ink-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                openSnapshotEntry(p, "manual");
                              }}
                            >
                              {snapEntryLoading === `${p.publicationId}:manual`
                                ? "加载中…"
                                : "编辑"}
                            </span>
                            {snapEntryError?.key === `${p.publicationId}:manual` && (
                              <span className="ml-1 text-danger">
                                {snapEntryError.message}
                                <span
                                  className="ml-1 underline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openSnapshotEntry(p, "manual");
                                  }}
                                >
                                  重试
                                </span>
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Detail — M7: checkpoint Index Tabs + evidence sections */}
            {selected && (
              <div className="mt-7">
                {/* Checkpoint Index Tabs */}
                <div
                  className="flex items-center gap-6 whitespace-nowrap"
                  style={{ borderBottom: RULE }}
                >
                  {(["24h", "72h", "manual"] as Checkpoint[]).map((c) => {
                    const on = selected.checkpoint === c;
                    return (
                      <button
                        key={c}
                        onClick={() => select(selected.publicationId, c)}
                        className="relative pb-2 text-[13px]"
                        style={{
                          color: on ? "var(--cl-ink-strong)" : "var(--cl-neutral)",
                          fontWeight: on ? 600 : 400,
                        }}
                      >
                        {checkpointLabel(c)} 数据
                        {on && (
                          <span
                            className="absolute inset-x-0 -bottom-px h-[2px]"
                            style={{ background: "var(--cl-primary)" }}
                          />
                        )}
                      </button>
                    );
                  })}
                  <span
                    className="ml-auto min-w-0 truncate pb-2 text-xs"
                    style={{ color: "var(--ink-muted)" }}
                  >
                    {selectedPub?.finalTitle}
                  </span>
                </div>

                <div className="pt-4">
                  {detailLoading ? (
                    /* M7: ribbon pill — data reading (not AI reasoning) */
                    <div className="flex justify-center py-10">
                      <RibbonPillLoader label="正在加载指标数据…" />
                    </div>
                  ) : detailError ? (
                    <div className="flex items-center gap-3">
                      <p className="text-sm text-danger">{detailError}</p>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => select(selected.publicationId, selected.checkpoint)}
                      >
                        <RefreshCw className="mr-1 h-3 w-3" />
                        重试
                      </Button>
                    </div>
                  ) : detail ? (
                    <>
                      {/* 本期概览 (M7 方案 C): title + headline numbers pull
                          density upward; values are existing metrics only. */}
                      {detail.fact.hasSnapshot ? (
                        <div
                          className="flex flex-wrap items-end gap-x-8 gap-y-3 pb-4"
                          style={{ borderBottom: RULE }}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 text-[15px] font-semibold text-ink-primary">
                              {detail.fact.finalTitle}
                              <DemoBadge isDemo={detail.fact.isDemo} />
                            </div>
                            <div
                              className="mt-1 text-[11px]"
                              style={{ color: "var(--cl-neutral)" }}
                            >
                              {platformLabel(detail.fact.platform)} ·{" "}
                              {detail.fact.pillarName ?? "无内容方向"} · 发布于{" "}
                              {new Date(detail.fact.publishedAt).toLocaleDateString()} ·{" "}
                              {checkpointLabel(selected.checkpoint)}
                            </div>
                          </div>
                          {[...raws, ...deriveds].slice(0, 4).map((m) => {
                            const account = baselineFor(detail.accountBaseline, m.key);
                            return (
                              <div key={m.key} className="shrink-0 text-right">
                                <div
                                  className="text-ink-primary"
                                  style={{
                                    fontFamily: "var(--font-cormorant), serif",
                                    fontSize: 24,
                                    fontWeight: 600,
                                    lineHeight: 1,
                                  }}
                                >
                                  {formatMetricValue(m.format, m.value)}
                                </div>
                                <div
                                  className="mt-1 text-[10.5px]"
                                  style={{ color: "var(--cl-neutral)" }}
                                >
                                  {m.label}
                                  {account && account.median !== null && (
                                    <>
                                      {" · 中位 "}
                                      {formatMetricValue(m.format, account.median)}
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-xs" style={{ color: "var(--cl-neutral)" }}>
                          <span className="text-sm font-medium text-ink-primary">
                            {detail.fact.finalTitle}
                          </span>
                          <DemoBadge isDemo={detail.fact.isDemo} />
                          <span className="ml-2">
                            {platformLabel(detail.fact.platform)} ·{" "}
                            {detail.fact.pillarName ?? "无内容方向"} · 发布于{" "}
                            {new Date(detail.fact.publishedAt).toLocaleString()}
                          </span>
                        </div>
                      )}
                      {detail.fact.isDemo && (
                        <p className="mt-2 rounded-[8px] border border-border bg-canvas px-3 py-2 text-xs text-ink-secondary">
                          {DEMO_NOTICE}
                        </p>
                      )}

                      {!detail.fact.hasSnapshot ? (
                        /* M7: dashed pending panel — 留空=尚未录入≠0,
                           未到时间不隐藏 */
                        <div
                          className="mt-4 rounded-[5px] px-6 py-8 text-center"
                          style={{
                            background: "var(--cl-surface)",
                            border: "1px dashed var(--cl-silver)",
                          }}
                        >
                          {selected.checkpoint === "manual" ? (
                            <>
                              <p className="text-[13.5px] font-semibold text-ink-primary">
                                还没有手动观察数据
                              </p>
                              <p
                                className="mt-2 text-xs leading-[1.7]"
                                style={{ color: "var(--cl-neutral)" }}
                              >
                                手动观察点没有目标时间——发布后任何时候查看平台数据都可以补录。
                                <br />
                                基线对照与诊断将在有当前值后出现。
                              </p>
                              <div className="mt-4 flex justify-center">
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() =>
                                    selectedPub &&
                                    openSnapshotEntry(selectedPub, "manual")
                                  }
                                >
                                  录入手动数据
                                </Button>
                              </div>
                            </>
                          ) : selectedPub?.checkpoints.find(
                            (c) => c.checkpoint === selected.checkpoint
                          )?.status === "due" ? (
                            <>
                              <p className="text-[13.5px] font-semibold text-ink-primary">
                                还没有该数据点的指标数据
                              </p>
                              <p
                                className="mt-2 text-xs leading-[1.7]"
                                style={{ color: "var(--cl-neutral)" }}
                              >
                                这里显示的是「待录入」，不是 0。基线对照与诊断将在有当前值后出现。
                              </p>
                              <div className="mt-4 flex justify-center">
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() =>
                                    openSnapshotEntry(selectedPub, selected.checkpoint)
                                  }
                                >
                                  录入 {selected.checkpoint} 数据
                                </Button>
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="text-[13.5px] font-semibold text-ink-primary">
                                尚未到 {selected.checkpoint} 数据录入时间
                              </p>
                              <p
                                className="mt-2 text-xs leading-[1.7]"
                                style={{ color: "var(--cl-neutral)" }}
                              >
                                这里显示的是「待录入」，不是 0——指标会在到期后可录入。
                                <br />
                                基线对照与诊断将在有当前值后出现。
                              </p>
                              <div className="mt-4 flex justify-center">
                                <button
                                  disabled
                                  className="inline-flex h-[30px] items-center rounded-[5px] px-[11px] text-xs font-medium text-ink-primary opacity-50"
                                  style={{ border: "1px solid var(--cl-silver)" }}
                                >
                                  录入 {selected.checkpoint} 数据（未到时间）
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <>
                          {/* 关键观察 — deterministic value-vs-account-median
                              rules (lib/metrics/observations), never AI. */}
                          <div className="mt-5">
                            <Sec title="关键观察" note="确定性规则 · 非 AI" />
                            {detail.observations.length > 0 ? (
                              <div style={{ borderTop: RULE }}>
                                {detail.observations.map((o) => {
                                  const fmt = formatByKey.get(o.key) ?? "count";
                                  const n =
                                    detail.accountBaseline?.metrics[o.key]
                                      ?.sampleCount;
                                  return (
                                    <div
                                      key={o.key}
                                      className="flex items-baseline gap-2.5 px-1 py-[9px]"
                                      style={{ borderBottom: HAIRLINE }}
                                    >
                                      <StatusDot gold={o.kind === "below"} />
                                      <span className="text-[13px] text-ink-primary">
                                        {o.label} {formatMetricValue(fmt, o.value)}，
                                        {o.ratio === null
                                          ? `高于账号基线 ${formatMetricValue(fmt, o.baselineMedian)}`
                                          : o.kind === "above"
                                            ? `为账号基线 ${formatMetricValue(fmt, o.baselineMedian)} 的 ${o.ratio.toFixed(1)}×`
                                            : `仅为账号基线 ${formatMetricValue(fmt, o.baselineMedian)} 的 ${o.ratio.toFixed(1)}×`}
                                      </span>
                                      {n !== undefined && (
                                        <span
                                          className="ml-auto text-[11px]"
                                          style={{ color: "var(--cl-neutral)" }}
                                        >
                                          n={n}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p
                                className="px-1 py-2 text-xs"
                                style={{ color: "var(--cl-neutral)" }}
                              >
                                {detail.accountBaseline &&
                                detail.accountBaseline.candidateCount > 0
                                  ? "全部指标与基线相当"
                                  : "还没有可对比的历史数据"}
                              </p>
                            )}
                          </div>

                          {/* 表现事实 */}
                          <div className="mt-5">
                            <Sec
                              title={`表现事实 · ${checkpointLabel(selected.checkpoint)}`}
                              note={
                                detail.fact.targetAt
                                  ? `目标 ${new Date(detail.fact.targetAt).toLocaleString()} · 采集 ${new Date(detail.fact.capturedAt!).toLocaleString()} ${formatCaptureDelta(detail.fact.captureDeltaMinutes)}`
                                  : `采集 ${new Date(detail.fact.capturedAt!).toLocaleString()}（发布后 ${formatCaptureDelta(detail.fact.captureDeltaMinutes).replace("（相对目标）", "")}）`
                              }
                            />
                            <div style={{ borderTop: RULE }}>
                              <div
                                className="px-1 pb-1.5 pt-3 text-[11px] font-semibold tracking-[0.14em]"
                                style={{ color: "var(--cl-neutral)" }}
                              >
                                原始指标
                              </div>
                              {raws.map(renderFactRow)}
                              {deriveds.length > 0 && (
                                <div
                                  className="px-1 pb-1.5 pt-3.5 text-[11px] font-semibold tracking-[0.14em]"
                                  style={{ color: "var(--cl-neutral)" }}
                                >
                                  派生指标
                                </div>
                              )}
                              {deriveds.map(renderFactRow)}
                            </div>
                          </div>

                          {/* 基线对照 */}
                          <div className="mt-6">
                            <Sec
                              title="基线对照"
                              note={
                                detail.baselineError
                                  ? undefined
                                  : detail.accountBaseline
                                    ? `${detail.accountBaseline.candidateCount} 条可比发布 · 中位数${
                                        detail.accountBaseline.medianCaptureDeltaMinutes !== null
                                          ? ` · 中位采集 ${formatCaptureDelta(detail.accountBaseline.medianCaptureDeltaMinutes)}`
                                          : ""
                                      }`
                                    : `还没有历史 ${checkpointLabel(selected.checkpoint)} 数据`
                              }
                            />
                            {detail.baselineError ? (
                              <p className="flex items-center gap-2 px-1 py-2 text-xs text-danger">
                                基线加载失败。
                                <button className="underline" onClick={retryBaseline}>
                                  重试
                                </button>
                              </p>
                            ) : (
                              <div style={{ borderTop: RULE }}>
                                <div
                                  className="grid gap-2.5 px-1 py-2 text-[11.5px]"
                                  style={{
                                    gridTemplateColumns: "1.2fr 1fr 1fr 1fr",
                                    color: "var(--cl-neutral)",
                                    borderBottom: RULE,
                                  }}
                                >
                                  <span>指标</span>
                                  <span className="text-right">当前值</span>
                                  <span className="text-right">账号中位数</span>
                                  <span className="text-right">方向中位数</span>
                                </div>
                                {[...raws, ...deriveds].map(renderBaselineRow)}
                              </div>
                            )}
                            <p
                              className="mt-2 px-1 text-xs"
                              style={{ color: "var(--cl-neutral)" }}
                            >
                              {BASELINE_COHORT_HELPER}
                            </p>
                          </div>
                        </>
                      )}
                    </>
                  ) : null}
                </div>
              </div>
            )}
          </>
        )}

        {/* Tests — M3.1 */}
        <TestsSection
          publications={index.map((p) => ({
            publicationId: p.publicationId,
            finalTitle: p.finalTitle,
            platform: p.platform,
          }))}
          createRequest={testCreateRequest}
          onCreateRequestHandled={() => setTestCreateRequest(null)}
        />

        {/* Learnings — M3.3 */}
        <LearningsSection />
      </div>

      {/* Loop AI inspector — M7: 320px document surface;
          M9: collapses to an overlay rail below 1200px */}
      <CollapsibleRail
        label="Loop AI"
        className="w-[320px] shrink-0 overflow-y-auto p-5"
        style={{ borderLeft: RULE, background: "var(--cl-surface)" }}
      >
        {detail && selected ? (
          <LoopAnalysis
            key={`${selected.publicationId}:${selected.checkpoint}`}
            publicationId={selected.publicationId}
            checkpoint={selected.checkpoint}
            hasSnapshot={detail.fact.hasSnapshot}
            diagnosis={detail.diagnosis}
            diagnosisStale={detail.diagnosisStale}
            onSaved={(d, stale) =>
              setDetail((prev) =>
                prev ? { ...prev, diagnosis: d, diagnosisStale: stale } : prev
              )
            }
            onCreateTest={() =>
              setTestCreateRequest({
                platform: detail.fact.platform,
                checkpoint: selected.checkpoint,
                contextLabel: `${detail.fact.finalTitle} · ${checkpointLabel(selected.checkpoint)}`,
              })
            }
          />
        ) : (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Loop 分析
            </p>
            <p className="mt-3 text-xs text-ink-faint">
              选择一条发布记录以查看结构化诊断。
            </p>
          </div>
        )}
      </CollapsibleRail>

      <ImportMetricsModal
        open={importOpen}
        onOpenChange={setImportOpen}
        publications={index.map((p) => ({
          publicationId: p.publicationId,
          finalTitle: p.finalTitle,
          platform: p.platform,
        }))}
        onDone={() => {
          setImportOpen(false);
          loadIndex();
          if (selected) loadDetail(selected.publicationId, selected.checkpoint);
        }}
      />

      {snapModal && (
        <MetricSnapshotModal
          key={`${snapModal.publication.publicationId}:${snapModal.checkpoint}`}
          open
          onOpenChange={(o) => !o && setSnapModal(null)}
          publication={{
            id: snapModal.publication.publicationId,
            platform: snapModal.publication.platform,
            finalTitle: snapModal.publication.finalTitle,
            publishedAt: snapModal.publication.publishedAt,
          }}
          checkpoint={snapModal.checkpoint}
          mode={snapModal.mode}
          existing={snapModal.existing}
          onDone={() => {
            const sel = selected;
            setSnapModal(null);
            loadIndex();
            if (sel) loadDetail(sel.publicationId, sel.checkpoint);
          }}
        />
      )}
    </div>
  );
}
