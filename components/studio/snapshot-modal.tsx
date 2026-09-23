"use client";

import { useEffect, useMemo, useState } from "react";
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
  calculateMetric,
  formatMetricValue,
  buildFormulaPreview,
  type MetricDefLike,
} from "@/lib/metrics/engine";
import {
  checkpointDueAt,
  parseCountText,
  type Checkpoint,
} from "@/lib/validation/snapshot";
import { initSnapshotInputs } from "@/lib/snapshot-entry";
import {
  platformLabel,
  METRIC_NA_HELPER,
  METRIC_BLANK_HELPER,
} from "@/lib/labels";

/**
 * MetricSnapshotModal — M2.3 shared Quick Update form.
 *
 * ONE modal, ONE validation path, ONE API client — used by Studio
 * Review Publication card (primary) and Pipeline Drawer (secondary).
 *
 * Semantics (frozen):
 * - Opening the form NEVER creates a row. No auto-save. Explicit
 *   "Save Metrics" (create) / "Save Changes" (edit) only.
 * - Every active raw metric must resolve to a number OR explicit N/A
 *   before submit. Blank is neither.
 * - Calculated preview is computed locally by the frozen engine — no
 *   server/AI call for ratios.
 */

export interface SnapshotSummary {
  id: string;
  publicationId: string;
  checkpoint: string;
  capturedAt: string;
  metrics: Record<string, number | null>;
  source: string;
  createdAt: string;
}

interface MetricDef extends MetricDefLike {
  id: string;
  platform: string;
  displayName: string;
  alias: string | null;
  isActive: boolean;
  format: "count" | "percentage" | "ratio";
}

interface SnapshotModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publication: {
    id: string;
    platform: string;
    finalTitle: string;
    publishedAt: string;
  };
  checkpoint: Checkpoint;
  /**
   * Explicit mode — callers decide from checkpoint status, never from
   * whether snapshot data happened to be loaded:
   *   due → "create" | submitted → "edit" (existing required).
   */
  mode: "create" | "edit";
  /** Authoritative snapshot for edit mode. */
  existing: SnapshotSummary | null;
  onDone: (snapshot: SnapshotSummary) => void;
}

interface RawInput {
  value: string;
  isNA: boolean;
}

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function MetricSnapshotModal({
  open,
  onOpenChange,
  publication,
  checkpoint,
  mode,
  existing,
  onDone,
}: SnapshotModalProps) {
  const isEdit = mode === "edit";
  const [defs, setDefs] = useState<MetricDef[] | null>(null);
  const [inputs, setInputs] = useState<Record<string, RawInput>>({});
  const [capturedAt, setCapturedAt] = useState(() =>
    existing
      ? toLocalInputValue(new Date(existing.capturedAt))
      : toLocalInputValue(new Date())
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discardConfirm, setDiscardConfirm] = useState(false);

  // Load metric definitions once per mount.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings/metrics")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setDefs(d.definitions);
      })
      .catch(() => {
        if (!cancelled) setError("指标定义加载失败");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Active raw inputs: create = current active raw keys; edit = stored keys.
  // Edit mode without an authoritative snapshot is a caller bug — render
  // a local error instead of silently falling back to create mode.
  const editMissing = isEdit && !existing;
  const rawKeys = useMemo(() => {
    if (!defs) return [];
    if (isEdit) return existing ? Object.keys(existing.metrics) : [];
    return defs
      .filter(
        (d) =>
          d.platform === publication.platform && d.type === "raw" && d.isActive
      )
      .map((d) => d.key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defs, isEdit, publication.platform]);

  const derivedDefs = useMemo(
    () =>
      (defs ?? []).filter(
        (d) =>
          d.platform === publication.platform &&
          d.type === "derived" &&
          d.isActive
      ),
    [defs, publication.platform]
  );

  const defFor = (key: string) =>
    (defs ?? []).find(
      (d) => d.platform === publication.platform && d.key === key
    );

  const labelOf = (key: string) => {
    const d = defFor(key);
    return d ? (d.alias ?? d.displayName) : key;
  };

  // Initialize inputs when rawKeys resolve.
  useEffect(() => {
    if (rawKeys.length === 0) return;
    const t = setTimeout(() => {
      setInputs((prev) => {
        if (Object.keys(prev).length > 0) return prev;
        return initSnapshotInputs(rawKeys, existing?.metrics ?? null);
      });
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawKeys]);

  const dirty = useMemo(
    () =>
      Object.values(inputs).some((i) => i.value !== "" || i.isNA) ||
      (existing
        ? capturedAt !== toLocalInputValue(new Date(existing.capturedAt))
        : false),
    [inputs, capturedAt, existing]
  );

  const parsedValues = useMemo(() => {
    const out: Record<string, number | null> = {};
    for (const [k, i] of Object.entries(inputs)) {
      if (i.isNA || i.value.trim() === "") {
        out[k] = null;
      } else {
        // D01: thousands separators normalized before parse ("18,600").
        const p = parseCountText(i.value);
        out[k] = p.kind === "number" ? p.value : null;
      }
    }
    return out;
  }, [inputs]);

  /** Every active raw must be resolved: number (valid integer ≥0, commas OK) or N/A. */
  const formComplete = useMemo(() => {
    if (rawKeys.length === 0) return false;
    if (capturedAt.trim() === "") return false;
    for (const k of rawKeys) {
      const i = inputs[k];
      if (!i) return false;
      if (i.isNA) continue;
      if (parseCountText(i.value).kind !== "number") return false;
    }
    return true;
  }, [rawKeys, inputs, capturedAt]);

  /** D01: fields with malformed (non-blank, non-N/A) numeric input —
   *  drives a field-level hint so the user knows WHICH field blocks Save. */
  const invalidKeys = useMemo(
    () =>
      rawKeys.filter((k) => {
        const i = inputs[k];
        return !!i && !i.isNA && parseCountText(i.value).kind === "invalid";
      }),
    [rawKeys, inputs]
  );

  /** Blank (unresolved, not N/A) inputs — drives helper copy only. */
  const hasBlankInputs = useMemo(
    () =>
      rawKeys.some((k) => {
        const i = inputs[k];
        return !!i && !i.isNA && i.value.trim() === "";
      }),
    [rawKeys, inputs]
  );

  async function submit() {
    if (!formComplete || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/publications/${publication.id}/metric-snapshots/${checkpoint}`,
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            metrics: parsedValues,
            capturedAt: new Date(capturedAt).toISOString(),
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.details ? `${data.error}: ${data.details}` : data.error || "保存失败"
        );
      }
      onDone(data.snapshot);
      onOpenChange(false);
    } catch (err) {
      // Keep all user input on failure.
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSubmitting(false);
    }
  }

  function requestClose() {
    if (dirty && !submitting) {
      setDiscardConfirm(true);
    } else {
      onOpenChange(false);
    }
  }

  // manual observations have no target time (data-model §19.3).
  const isManual = checkpoint === "manual";
  const dueAt = isManual
    ? null
    : checkpointDueAt(publication.publishedAt, checkpoint);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) requestClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? `编辑${isManual ? "手动" : ` ${checkpoint} `}数据`
              : `录入${isManual ? "手动" : ` ${checkpoint} `}数据`}
          </DialogTitle>
          <DialogDescription>
            {publication.finalTitle} · {platformLabel(publication.platform)} · 发布于{" "}
            {new Date(publication.publishedAt).toLocaleString()}
            {dueAt && (
              <>
                {" "}
                · {checkpoint} 目标时间 {dueAt.toLocaleString()}
              </>
            )}
          </DialogDescription>
          <p className="text-xs text-ink-faint">
            {isManual
              ? "手动观察点——任何发布后时间补录的数据，无目标时间。"
              : `发布后约 ${checkpoint === "24h" ? "24" : "72"} 小时读取的数据。`}
          </p>
        </DialogHeader>

        {editMissing ? (
          <div className="rounded-[8px] border border-danger/20 bg-danger/5 p-3 text-xs text-danger">
            指标数据加载失败。请关闭后重试。
          </div>
        ) : !defs ? (
          <p className="text-sm text-ink-muted">正在加载指标定义…</p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-secondary">
                采集时间 *（你实际查看平台数据的时间）
              </label>
              <input
                type="datetime-local"
                className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm text-ink-primary outline-none focus:border-mint-600"
                value={capturedAt}
                onChange={(e) => setCapturedAt(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              {rawKeys.map((k) => {
                const input = inputs[k] ?? { value: "", isNA: false };
                return (
                  <div key={k} className="flex items-center gap-2">
                    <span className="w-28 shrink-0 text-xs font-medium text-ink-secondary">
                      {labelOf(k)}
                    </span>
                    {input.isNA ? (
                      <span className="flex-1 rounded-[8px] border border-border bg-surface-subtle px-3 py-2 text-sm text-ink-muted">
                        N/A
                      </span>
                    ) : (
                      <span className="flex-1">
                        <input
                          inputMode="numeric"
                          className={`w-full rounded-[8px] border bg-workspace px-3 py-2 text-sm text-ink-primary outline-none focus:border-mint-600 ${
                            invalidKeys.includes(k)
                              ? "border-danger"
                              : "border-border"
                          }`}
                          value={input.value}
                          onChange={(e) =>
                            setInputs((prev) => ({
                              ...prev,
                              [k]: { ...input, value: e.target.value },
                            }))
                          }
                        />
                        {invalidKeys.includes(k) && (
                          <span className="mt-1 block text-[11px] text-danger">
                            请输入整数——千位逗号可以（如 18,600）。
                          </span>
                        )}
                      </span>
                    )}
                    <button
                      className="shrink-0 text-xs text-ink-muted hover:text-ink-primary"
                      onClick={() =>
                        setInputs((prev) => ({
                          ...prev,
                          [k]: { value: input.value, isNA: !input.isNA },
                        }))
                      }
                    >
                      {input.isNA ? "恢复输入" : "标记 N/A"}
                    </button>
                  </div>
                );
              })}
              <p className="text-xs text-ink-secondary">{METRIC_NA_HELPER}</p>
            </div>

            {derivedDefs.length > 0 && (
              <div className="rounded-[8px] border border-border bg-canvas p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  派生预览
                </p>
                <div className="mt-2 space-y-1.5">
                  {derivedDefs.map((d) => {
                    const value = calculateMetric(d, parsedValues);
                    return (
                      <div key={d.key} className="flex items-baseline justify-between">
                        <span className="text-xs text-ink-secondary">
                          {labelOf(d.key)}
                        </span>
                        <span className="text-sm font-medium text-ink-primary">
                          {formatMetricValue(d.format, value)}
                          <span className="ml-2 text-[11px] font-normal text-ink-faint">
                            {buildFormulaPreview(d, (k) => labelOf(k))}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-[8px] border border-danger/20 bg-danger/5 p-3 text-xs text-danger">
                {error}
              </div>
            )}

            {discardConfirm && (
              <div className="rounded-[8px] border border-warning/30 bg-warning/5 p-3 text-xs text-ink-secondary">
                放弃未保存的数据录入？
                <button
                  className="ml-2 font-medium text-danger hover:underline"
                  onClick={() => {
                    setDiscardConfirm(false);
                    onOpenChange(false);
                  }}
                >
                  放弃
                </button>
                <button
                  className="ml-2 font-medium text-ink-primary hover:underline"
                  onClick={() => setDiscardConfirm(false)}
                >
                  继续编辑
                </button>
              </div>
            )}
          </div>
        )}

        {hasBlankInputs && (
          <p className="text-xs text-ink-secondary">{METRIC_BLANK_HELPER}</p>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={requestClose}>
            取消
          </Button>
          <Button
            variant="primary"
            onClick={submit}
            disabled={!formComplete || submitting || !defs}
          >
            {submitting ? "保存中…" : isEdit ? "保存修改" : "保存数据"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
