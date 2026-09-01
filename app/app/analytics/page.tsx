"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import {
  formatMetricValue,
  type MetricFormat,
} from "@/lib/metrics/engine";
import {
  calculateComparison,
  formatDelta,
  selectDefaultTarget,
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
  has24h: boolean;
  has72h: boolean;
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

interface Detail {
  fact: {
    publicationId: string;
    contentId: string;
    contentTitle: string;
    finalTitle: string;
    platform: string;
    pillarName: string | null;
    checkpoint: string;
    publishedAt: string;
    url: string;
    targetAt: string;
    capturedAt: string | null;
    captureDeltaMinutes: number | null;
    hasSnapshot: boolean;
    snapshot: SnapshotSummary | null;
    metrics: MetricValue[];
  };
  accountBaseline: BaselineScope | null;
  pillarBaseline: (BaselineScope & { pillarId: string | null }) | { unavailable: string } | null;
  baselineError: string | null;
  diagnosis: DiagnosisRecord | null;
  diagnosisStale: boolean;
}

const PLATFORM_LABEL: Record<string, string> = {
  xiaohongshu: "XHS",
  bilibili: "Bili",
  douyin: "Douyin",
};

function formatCaptureDelta(minutes: number | null): string {
  if (minutes === null) return "";
  if (Math.abs(minutes) < 90) return `+${Math.round(minutes)} min from target`;
  const hours = minutes / 60;
  if (Math.abs(hours) < 48) return `+${hours.toFixed(1)}h from target`;
  return `+${(hours / 24).toFixed(1)}d from target`;
}

export default function AnalyticsPage() {
  const [index, setIndex] = useState<IndexPublication[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selected, setSelected] = useState<{ publicationId: string; checkpoint: Checkpoint } | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

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

  /**
   * Checkpoint-status-driven entry (M2.5 blocker fix):
   * - due → create mode immediately
   * - submitted → resolve the authoritative snapshot FIRST (loaded
   *   detail fast path, else GET detail), then open edit mode.
   *   A failed read shows a local error + Retry — never falls back
   *   to create mode, never risks a duplicate POST.
   */
  async function openSnapshotEntry(pub: IndexPublication, cp: Checkpoint) {
    const status = pub.checkpoints.find((c) => c.checkpoint === cp)?.status;
    const mode = snapshotEntryMode(status ?? "not_due");
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
      if (!res.ok) throw new Error(data.error || "Failed to load");
      if (!data.fact.snapshot) throw new Error("Snapshot not found");
      setSnapModal({
        publication: pub,
        checkpoint: cp,
        existing: data.fact.snapshot,
        mode,
      });
    } catch {
      setSnapEntryError({ key, message: "Couldn't load metric snapshot." });
    } finally {
      setSnapEntryLoading(null);
    }
  }

  const loadIndex = useCallback(async () => {
    try {
      const res = await fetch("/api/analytics");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setIndex(data.publications);
      setLoadError(null);
      return data.publications as IndexPublication[];
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load");
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
      if (!res.ok) throw new Error(data.error || "Failed to load detail");
      setDetail(data);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Failed to load detail");
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
      if (!res.ok) throw new Error(data.error || "Baseline failed");
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              accountBaseline: data.account,
              pillarBaseline: data.pillar,
              baselineError: null,
            }
          : prev
      );
    } catch (err) {
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              baselineError:
                err instanceof Error ? err.message : "Baseline failed",
            }
          : prev
      );
    }
  }, [selected, detail]);

  useEffect(() => {
    const t = setTimeout(async () => {
      const pubs = await loadIndex();
      const def = selectDefaultTarget(pubs);
      if (def) select(def.publicationId, def.checkpoint);
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

  function baselineFor(scope: BaselineScope | null | { unavailable: string }, key: string) {
    if (!scope || "unavailable" in scope) return null;
    return scope.metrics[key] ?? null;
  }

  function renderMetricRow(m: MetricValue) {
    const account = detail ? baselineFor(detail.accountBaseline, m.key) : null;
    const pillar = detail ? baselineFor(detail.pillarBaseline, m.key) : null;
    const accCmp = account ? calculateComparison(m.value, account.median) : null;
    const pilCmp = pillar ? calculateComparison(m.value, pillar.median) : null;
    return (
      <tr key={m.key} className="border-t border-border">
        <td className="px-3 py-2.5">
          <span className="text-sm text-ink-primary">{m.label}</span>
          {m.formulaPreview && (
            <p className="mt-0.5 text-[11px] text-ink-faint">{m.formulaPreview}</p>
          )}
        </td>
        <td className="px-3 py-2.5 text-sm font-medium text-ink-primary">
          {formatMetricValue(m.format, m.value)}
        </td>
        <td className="px-3 py-2.5">
          {account ? (
            <>
              <span className="text-sm text-ink-secondary">
                {formatMetricValue(m.format, account.median)}
              </span>
              <span className="ml-2 text-[11px] text-ink-faint">n={account.sampleCount}</span>
              <span className="ml-2 text-xs text-ink-secondary">
                {formatDelta(m.format, accCmp?.absoluteDelta ?? null)}
              </span>
            </>
          ) : (
            <span className="text-xs text-ink-faint">N/A</span>
          )}
        </td>
        <td className="px-3 py-2.5">
          {detail?.pillarBaseline && "unavailable" in detail.pillarBaseline ? (
            <span className="text-xs text-ink-faint">
              Pillar baseline unavailable — no pillar assigned
            </span>
          ) : pillar ? (
            <>
              <span className="text-sm text-ink-secondary">
                {formatMetricValue(m.format, pillar.median)}
              </span>
              <span className="ml-2 text-[11px] text-ink-faint">n={pillar.sampleCount}</span>
              <span className="ml-2 text-xs text-ink-secondary">
                {formatDelta(m.format, pilCmp?.absoluteDelta ?? null)}
              </span>
            </>
          ) : (
            <span className="text-xs text-ink-faint">N/A</span>
          )}
        </td>
      </tr>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-ink-muted">Loading analytics…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-sm text-danger">{loadError}</p>
        <Button variant="secondary" size="sm" onClick={() => { setLoading(true); loadIndex(); }}>
          <RefreshCw className="mr-1 h-3 w-3" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Main: index + fact/baseline/comparison */}
      <div className="flex-1 overflow-y-auto p-6">
        <h1 className="text-lg font-semibold text-ink-primary">Analytics</h1>

        {index.length === 0 ? (
          <div className="mt-12 flex flex-col items-center text-center">
            <p className="text-sm text-ink-secondary">No published content yet.</p>
            <p className="mt-1 text-xs text-ink-muted">
              Mark a platform version as published first.
            </p>
          </div>
        ) : (
          <>
            {/* Publication index */}
            <div className="mt-4 space-y-2">
              {index.map((p) => (
                <button
                  key={p.publicationId}
                  onClick={() => {
                    const cp: Checkpoint = p.has72h ? "72h" : "24h";
                    select(p.publicationId, cp);
                  }}
                  className={`w-full rounded-[8px] border p-3 text-left transition-colors ${
                    selected?.publicationId === p.publicationId
                      ? "border-mint-600 bg-mint-100/50"
                      : "border-border bg-workspace hover:border-ink-faint"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-ink-primary">
                      {p.finalTitle}
                    </span>
                    <Badge variant="default">{PLATFORM_LABEL[p.platform] ?? p.platform}</Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-ink-muted">
                    <span>{p.contentTitle}</span>
                    {p.pillarName && <span>· {p.pillarName}</span>}
                    <span>· Published {new Date(p.publishedAt).toLocaleDateString()}</span>
                    {p.checkpoints.map((c) => (
                      <span key={c.checkpoint}>
                        {c.checkpoint}:{" "}
                        {c.status === "submitted"
                          ? "Submitted"
                          : c.status === "due"
                            ? "Due"
                            : "Not due"}
                        {c.status === "due" && (
                          <span
                            className="ml-1 font-medium text-mint-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              openSnapshotEntry(p, c.checkpoint);
                            }}
                          >
                            {" "}· Enter
                          </span>
                        )}
                        {c.status === "submitted" && (
                          <span
                            className="ml-1 text-ink-muted hover:text-ink-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              openSnapshotEntry(p, c.checkpoint);
                            }}
                          >
                            {" "}·{" "}
                            {snapEntryLoading === `${p.publicationId}:${c.checkpoint}`
                              ? "Loading…"
                              : "Edit"}
                          </span>
                        )}
                        {snapEntryError?.key === `${p.publicationId}:${c.checkpoint}` && (
                          <span className="ml-1 text-danger">
                            {snapEntryError.message}
                            <span
                              className="ml-1 underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                openSnapshotEntry(p, c.checkpoint);
                              }}
                            >
                              Retry
                            </span>
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>

            {/* Detail */}
            {selected && (
              <div className="mt-6 rounded-[8px] border border-border bg-workspace">
                {/* Checkpoint tabs */}
                <div className="flex items-center gap-1 border-b border-border px-4 py-2">
                  {(["24h", "72h"] as Checkpoint[]).map((c) => (
                    <button
                      key={c}
                      onClick={() => select(selected.publicationId, c)}
                      className={`rounded-md px-3 py-1 text-sm ${
                        selected.checkpoint === c
                          ? "bg-mint-100 font-medium text-ink-primary"
                          : "text-ink-muted hover:text-ink-primary"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                  <span className="ml-auto text-xs text-ink-muted">
                    {selectedPub?.finalTitle}
                  </span>
                </div>

                <div className="p-4">
                  {detailLoading ? (
                    <p className="text-sm text-ink-muted">Loading snapshot…</p>
                  ) : detailError ? (
                    <div className="flex items-center gap-3">
                      <p className="text-sm text-danger">{detailError}</p>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => select(selected.publicationId, selected.checkpoint)}
                      >
                        <RefreshCw className="mr-1 h-3 w-3" />
                        Retry
                      </Button>
                    </div>
                  ) : detail ? (
                    <>
                      {/* Fact header */}
                      <div className="text-xs text-ink-muted">
                        <span className="text-sm font-medium text-ink-primary">
                          {detail.fact.finalTitle}
                        </span>
                        <span className="ml-2">
                          {PLATFORM_LABEL[detail.fact.platform]} ·{" "}
                          {detail.fact.pillarName ?? "No pillar"} · Published{" "}
                          {new Date(detail.fact.publishedAt).toLocaleString()}
                        </span>
                      </div>

                      {!detail.fact.hasSnapshot ? (
                        <div className="mt-6 flex flex-col items-center py-6 text-center">
                          <p className="text-sm text-ink-secondary">
                            No metric snapshot yet.
                          </p>
                          {selectedPub?.checkpoints.find(
                            (c) => c.checkpoint === selected.checkpoint
                          )?.status === "due" && (
                            <Button
                              variant="primary"
                              size="sm"
                              className="mt-3"
                              onClick={() =>
                                openSnapshotEntry(selectedPub, selected.checkpoint)
                              }
                            >
                              Enter {selected.checkpoint} Metrics
                            </Button>
                          )}
                        </div>
                      ) : (
                        <>
                          <p className="mt-1 text-xs text-ink-muted">
                            Target: {new Date(detail.fact.targetAt).toLocaleString()} ·
                            Captured: {new Date(detail.fact.capturedAt!).toLocaleString()}{" "}
                            ({formatCaptureDelta(detail.fact.captureDeltaMinutes)})
                          </p>

                          {/* Metrics table */}
                          <div className="mt-4 overflow-hidden rounded-[8px] border border-border">
                            <table className="w-full">
                              <thead>
                                <tr className="bg-canvas text-left text-[11px] uppercase tracking-wide text-ink-muted">
                                  <th className="px-3 py-2">Metric</th>
                                  <th className="px-3 py-2">Current</th>
                                  <th className="px-3 py-2">Account Median</th>
                                  <th className="px-3 py-2">Pillar Median</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td colSpan={4} className="bg-canvas px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                                    Raw Metrics
                                  </td>
                                </tr>
                                {raws.map(renderMetricRow)}
                                {deriveds.length > 0 && (
                                  <tr>
                                    <td colSpan={4} className="bg-canvas px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                                      Derived Metrics
                                    </td>
                                  </tr>
                                )}
                                {deriveds.map(renderMetricRow)}
                              </tbody>
                            </table>
                          </div>

                          {/* Baseline meta / failure */}
                          <div className="mt-3 text-xs text-ink-muted">
                            {detail.baselineError ? (
                              <span className="flex items-center gap-2 text-danger">
                                Couldn&apos;t load baseline.
                                <button
                                  className="underline"
                                  onClick={retryBaseline}
                                >
                                  Retry
                                </button>
                              </span>
                            ) : detail.accountBaseline ? (
                              <span>
                                {detail.accountBaseline.candidateCount} comparable publications
                                {detail.accountBaseline.medianCaptureDeltaMinutes !== null &&
                                  ` · median capture offset ${formatCaptureDelta(detail.accountBaseline.medianCaptureDeltaMinutes)}`}
                              </span>
                            ) : (
                              <span>No historical {selected.checkpoint} snapshots yet.</span>
                            )}
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
      </div>

      {/* Loop Analysis — M2.6 structured diagnosis */}
      <div className="w-[25%] shrink-0 overflow-y-auto border-l border-border bg-canvas p-4">
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
          />
        ) : (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Loop Analysis
            </p>
            <p className="mt-3 text-xs text-ink-faint">
              Select a publication to see structured diagnosis.
            </p>
          </div>
        )}
      </div>

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
