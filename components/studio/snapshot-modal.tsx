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
  type Checkpoint,
} from "@/lib/validation/snapshot";

/**
 * MetricSnapshotModal — M2.3 shared Quick Update form.
 *
 * ONE modal, ONE validation path, ONE API client — used by Studio
 * Review Publication card (primary) and Pipeline Drawer (secondary).
 *
 * Semantics (frozen):
 * - Opening the form NEVER creates a row. No auto-save. Explicit
 *   "Save Snapshot" (create) / "Save Changes" (edit) only.
 * - Every active raw metric must resolve to a number OR explicit N/A
 *   before submit. Blank is neither.
 * - Derived preview is computed locally by the frozen engine — no
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
        if (!cancelled) setError("Failed to load metric definitions");
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
        const next: Record<string, RawInput> = {};
        for (const k of rawKeys) {
          const stored = existing?.metrics[k];
          next[k] =
            stored === null
              ? { value: "", isNA: true }
              : stored !== undefined
                ? { value: String(stored), isNA: false }
                : { value: "", isNA: false };
        }
        return next;
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
      out[k] = i.isNA ? null : i.value.trim() === "" ? null : Number(i.value);
    }
    return out;
  }, [inputs]);

  /** Every active raw must be resolved: number (valid integer ≥0) or N/A. */
  const formComplete = useMemo(() => {
    if (rawKeys.length === 0) return false;
    if (capturedAt.trim() === "") return false;
    for (const k of rawKeys) {
      const i = inputs[k];
      if (!i) return false;
      if (i.isNA) continue;
      const v = i.value.trim();
      if (v === "" || !/^\d+$/.test(v)) return false;
    }
    return true;
  }, [rawKeys, inputs, capturedAt]);

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
          data.details ? `${data.error}: ${data.details}` : data.error || "Save failed"
        );
      }
      onDone(data.snapshot);
      onOpenChange(false);
    } catch (err) {
      // Keep all user input on failure.
      setError(err instanceof Error ? err.message : "Save failed");
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

  const dueAt = checkpointDueAt(publication.publishedAt, checkpoint);

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
            {isEdit ? "Edit" : "Enter"} {checkpoint} Metrics
          </DialogTitle>
          <DialogDescription>
            {publication.finalTitle} · {publication.platform} · Published{" "}
            {new Date(publication.publishedAt).toLocaleString()} · {checkpoint}{" "}
            target {dueAt.toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        {editMissing ? (
          <div className="rounded-[8px] border border-danger/20 bg-danger/5 p-3 text-xs text-danger">
            Couldn&apos;t load metric snapshot. Close and retry.
          </div>
        ) : !defs ? (
          <p className="text-sm text-ink-muted">Loading metric definitions…</p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-secondary">
                Captured At * (when you actually read the platform data)
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
                      <input
                        inputMode="numeric"
                        className="flex-1 rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm text-ink-primary outline-none focus:border-mint-600"
                        placeholder="0"
                        value={input.value}
                        onChange={(e) =>
                          setInputs((prev) => ({
                            ...prev,
                            [k]: { ...input, value: e.target.value },
                          }))
                        }
                      />
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
                      {input.isNA ? "Restore input" : "Mark N/A"}
                    </button>
                  </div>
                );
              })}
            </div>

            {derivedDefs.length > 0 && (
              <div className="rounded-[8px] border border-border bg-canvas p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Derived Preview
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
                Discard unsaved metric input?
                <button
                  className="ml-2 font-medium text-danger hover:underline"
                  onClick={() => {
                    setDiscardConfirm(false);
                    onOpenChange(false);
                  }}
                >
                  Discard
                </button>
                <button
                  className="ml-2 font-medium text-ink-primary hover:underline"
                  onClick={() => setDiscardConfirm(false)}
                >
                  Keep editing
                </button>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={requestClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={submit}
            disabled={!formComplete || submitting || !defs}
          >
            {submitting ? "Saving…" : isEdit ? "Save Changes" : "Save Snapshot"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
