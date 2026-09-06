"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload, RefreshCw, FileUp, X } from "lucide-react";
import type { ColumnMapping } from "@/lib/import/mapping";
import { validateImportFile, buildCsvTemplate } from "@/lib/import/template";
import type { PreviewRow, ImportConfig } from "@/lib/import/service";
import { EMPTY_MAPPING } from "@/lib/import/mapping";
import type { Platform } from "@/lib/validation/platform-version";
import { platformLabel, METRIC_NA_HELPER } from "@/lib/labels";

/**
 * Import Metrics modal — M2.7. Upload → Map → Preview → Confirm.
 *
 * The browser keeps the original File across all steps; the server
 * re-parses it at preview AND at confirm. Client rows are display-only;
 * human fixes travel as explicit rowOverrides. Confirm only fires when
 * the preview fingerprint matches the current configuration.
 */

interface MetricDefLite {
  key: string;
  label: string;
  alias: string | null;
  displayName: string;
}

interface PublicationLite {
  publicationId: string;
  finalTitle: string;
  platform: string;
}

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publications: PublicationLite[];
  onDone: () => void;
}

const PLATFORM_KEYS: Platform[] = ["xiaohongshu", "bilibili", "douyin"];

const STATUS_LABEL: Record<string, string> = {
  ready_create: "Create",
  ready_update: "Update",
  no_change: "No change",
  needs_mapping: "Needs mapping",
  needs_resolution: "Needs resolution",
  invalid: "Invalid",
  duplicate: "Duplicate",
  unmatched: "Unmatched",
  ambiguous: "Ambiguous",
  conflict: "Conflict",
};

const IDENTITY_FIELDS: { key: keyof typeof EMPTY_MAPPING; label: string }[] = [
  { key: "publicationUrl", label: "Publication URL" },
  { key: "publicationId", label: "Publication ID (optional)" },
  { key: "checkpoint", label: "Checkpoint" },
  { key: "capturedAt", label: "Captured At (optional)" },
  { key: "platform", label: "Platform column (optional validation)" },
];

export function ImportMetricsModal({
  open,
  onOpenChange,
  publications,
  onDone,
}: ImportModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [platform, setPlatform] = useState<Platform>("xiaohongshu");
  const [file, setFile] = useState<File | null>(null);
  const [fileMeta, setFileMeta] = useState<{
    fileHash: string;
    fileType: string;
    sheets: { name: string; rowCount: number; headers: string[]; sampleRows: unknown[][] }[];
  } | null>(null);
  const [sheet, setSheet] = useState<string | null>(null);
  const [timezone, setTimezone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [metricDefs, setMetricDefs] = useState<MetricDefLite[]>([]);
  const [fallbackCapturedAt, setFallbackCapturedAt] = useState("");
  const [preview, setPreview] = useState<{
    rows: PreviewRow[];
    previewFingerprint: string;
  } | null>(null);
  const [overrides, setOverrides] = useState<Record<number, { metrics?: Record<string, number | null>; capturedAt?: string; publicationId?: string }>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [confirmResult, setConfirmResult] = useState<string | null>(null);

  // Load the selected platform's active raw definitions as soon as the
  // modal opens / platform changes — the CSV template and mapping both
  // depend on them (fixes the empty-template blocker).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/settings/metrics")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const raws = (data.definitions as { platform: string; type: string; isActive: boolean; key: string; alias: string | null; displayName: string }[])
          .filter((d) => d.platform === platform && d.type === "raw" && d.isActive);
        setMetricDefs(
          raws.map((d) => ({
            key: d.key,
            label: d.alias ?? d.displayName,
            alias: d.alias,
            displayName: d.displayName,
          }))
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, platform]);

  const headers = useMemo(() => {
    if (!fileMeta) return [];
    const s = fileMeta.sheets.find((x) => x.name === (sheet ?? fileMeta.sheets[0]?.name));
    return s?.headers ?? [];
  }, [fileMeta, sheet]);

  const platformPubs = useMemo(
    () => publications.filter((p) => p.platform === platform),
    [publications, platform]
  );

  function reset() {
    setStep(1);
    setFile(null);
    setFileMeta(null);
    setSheet(null);
    setMapping(null);
    setPreview(null);
    setOverrides({});
    setError(null);
    setConfirmResult(null);
    setFallbackCapturedAt("");
  }

  function acceptFile(f: File | null) {
    setFileError(null);
    if (!f) {
      setFile(null);
      return;
    }
    const check = validateImportFile({ name: f.name, size: f.size });
    if (!check.ok) {
      setFile(null);
      setFileError(check.error);
      return;
    }
    setFile(f);
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  async function upload() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/analytics/import/parse", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Parse failed");
      setFileMeta(data);
      const firstSheet = data.sheets[0]?.name ?? null;
      setSheet(firstSheet);

      const raws = metricDefs;

      const { suggestIdentityMapping, suggestMetricMapping } = await import("@/lib/import/mapping");
      const sheetHeaders = data.sheets.find((s: { name: string }) => s.name === firstSheet)?.headers ?? [];
      const identity = suggestIdentityMapping(sheetHeaders);
      const metrics = suggestMetricMapping(sheetHeaders, raws);
      setMapping({ ...identity, metrics, metricNAAll: [] });
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Parse failed");
    } finally {
      setBusy(false);
    }
  }

  function buildConfig(): ImportConfig | null {
    if (!mapping) return null;
    return {
      platform,
      sheet,
      mapping,
      timezone,
      fallbackCapturedAt: fallbackCapturedAt
        ? new Date(fallbackCapturedAt).toISOString()
        : null,
      rowOverrides: overrides,
    };
  }

  async function runPreview() {
    const config = buildConfig();
    if (!file || !config) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("config", JSON.stringify(config));
      const res = await fetch("/api/analytics/import/preview", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Preview failed");
      setPreview(data);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    const config = buildConfig();
    if (!file || !config || !preview) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("config", JSON.stringify(config));
      form.append("previewFingerprint", preview.previewFingerprint);
      const res = await fetch("/api/analytics/import/confirm", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setConfirmResult(`Imported ${data.imported} snapshot${data.imported === 1 ? "" : "s"}.`);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  function downloadTemplate() {
    const csv = buildCsvTemplate(platform, metricDefs.map((d) => d.key));
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `contentloop-metrics-${platform}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const readyCount = preview?.rows.filter((r) => r.status === "ready_create" || r.status === "ready_update").length ?? 0;
  const hasBlockers = preview?.rows.some((r) =>
    ["needs_mapping", "needs_resolution", "invalid", "duplicate", "unmatched", "ambiguous", "conflict"].includes(r.status)
  ) ?? false;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onOpenChange(false); } }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import Metrics</DialogTitle>
          <DialogDescription>
            One platform per import. Preview before write — nothing is saved
            until you confirm.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-[8px] border border-danger/20 bg-danger/5 p-3 text-xs text-danger">
            {error}
          </div>
        )}
        {confirmResult && (
          <div className="rounded-[8px] border border-mint-600/30 bg-mint-100 p-3 text-xs text-ink-primary">
            {confirmResult}
          </div>
        )}

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-secondary">Platform</label>
              <select
                className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600"
                value={platform}
                onChange={(e) => setPlatform(e.target.value as Platform)}
              >
                {PLATFORM_KEYS.map((k) => (
                  <option key={k} value={k}>{platformLabel(k)}</option>
                ))}
              </select>
            </div>
            <div>
              <span className="mb-1 block text-xs font-medium text-ink-secondary">File</span>
              <input
                id="import-file-input"
                type="file"
                accept=".csv,.xlsx"
                className="sr-only"
                aria-label="Choose a CSV or XLSX metrics file"
                onChange={(e) => acceptFile(e.target.files?.[0] ?? null)}
              />
              {!file ? (
                <label
                  htmlFor="import-file-input"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    acceptFile(e.dataTransfer.files?.[0] ?? null);
                  }}
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[8px] border-2 border-dashed border-border bg-canvas px-6 py-8 text-center transition-colors duration-150 hover:border-mint-600 focus-within:border-mint-600"
                >
                  <FileUp className="h-6 w-6 text-ink-faint" />
                  <span className="text-sm font-medium text-ink-primary">
                    Drag a file here, or click to choose
                  </span>
                  <span className="text-xs text-ink-muted">
                    .csv / .xlsx · max 2MB · up to 200 rows
                  </span>
                </label>
              ) : (
                <div className="flex items-center justify-between rounded-[8px] border border-mint-600/40 bg-mint-100/40 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <FileUp className="h-4 w-4 text-mint-600" />
                    <div>
                      <p className="text-sm font-medium text-ink-primary">{file.name}</p>
                      <p className="text-xs text-ink-muted">
                        {file.name.toLowerCase().endsWith(".csv") ? "CSV" : "XLSX"} · {formatSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label
                      htmlFor="import-file-input"
                      className="cursor-pointer text-xs text-mint-600 hover:underline"
                    >
                      Change
                    </label>
                    <button
                      className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-danger"
                      onClick={() => acceptFile(null)}
                    >
                      <X className="h-3 w-3" />
                      Remove
                    </button>
                  </div>
                </div>
              )}
              {fileError && (
                <p className="mt-2 rounded-[8px] border border-danger/20 bg-danger/5 p-2 text-xs text-danger">
                  {fileError}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-secondary">Import timezone (for times without an explicit offset)</label>
              <input
                className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              />
              <p className="mt-1 text-[11px] text-ink-faint">Timezone, e.g. Asia/Shanghai. Shown again in the preview.</p>
            </div>
            <p className="text-[11px] text-ink-faint">
              Example row values: publication_url https://… · checkpoint 24h ·
              captured_at 2026-08-29T16:30:00+08:00. The template contains
              headers only — add one data row per publication.
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={downloadTemplate}>
                Download CSV Template
              </Button>
              <Button variant="primary" size="sm" onClick={upload} disabled={!file || busy}>
                <Upload className="mr-1 h-3 w-3" />
                {busy ? "Parsing…" : "Upload & Continue"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Map */}
        {step === 2 && mapping && fileMeta && (
          <div className="space-y-4">
            {fileMeta.sheets.length > 1 && (
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-secondary">Worksheet</label>
                <select
                  className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600"
                  value={sheet ?? ""}
                  onChange={(e) => setSheet(e.target.value)}
                >
                  {fileMeta.sheets.map((s) => (
                    <option key={s.name} value={s.name}>{s.name} ({s.rowCount} rows)</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <p className="mb-2 text-xs font-semibold text-ink-secondary">Publication matching</p>
              <div className="space-y-2">
                {IDENTITY_FIELDS.map((f) => (
                  <div key={f.key} className="flex items-center gap-2">
                    <span className="w-48 shrink-0 text-xs text-ink-secondary">{f.label}</span>
                    <select
                      className="flex-1 rounded-[8px] border border-border bg-workspace px-3 py-1.5 text-sm outline-none focus:border-mint-600"
                      value={mapping[f.key] ?? ""}
                      onChange={(e) =>
                        setMapping({ ...mapping, [f.key]: e.target.value || null })
                      }
                    >
                      <option value="">— not mapped —</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold text-ink-secondary">
                Metrics ({platformLabel(platform)})
              </p>
              <div className="space-y-2">
                {metricDefs.map((d) => {
                  const naAll = mapping.metricNAAll.includes(d.key);
                  return (
                    <div key={d.key} className="flex items-center gap-2">
                      <span className="w-48 shrink-0 text-xs text-ink-secondary">{d.label} <code className="text-ink-faint">({d.key})</code></span>
                      <select
                        className="flex-1 rounded-[8px] border border-border bg-workspace px-3 py-1.5 text-sm outline-none focus:border-mint-600"
                        value={naAll ? "__NA__" : (mapping.metrics[d.key] ?? "")}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "__NA__") {
                            setMapping({
                              ...mapping,
                              metrics: { ...mapping.metrics, [d.key]: null },
                              metricNAAll: [...mapping.metricNAAll, d.key],
                            });
                          } else {
                            setMapping({
                              ...mapping,
                              metrics: { ...mapping.metrics, [d.key]: v || null },
                              metricNAAll: mapping.metricNAAll.filter((k) => k !== d.key),
                            });
                          }
                        }}
                      >
                        <option value="">— unresolved —</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                        <option value="__NA__">N/A for all rows</option>
                      </select>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-ink-secondary">{METRIC_NA_HELPER}</p>
              {!mapping.capturedAt && (
                <div className="mt-3">
                  <label className="mb-1 block text-xs font-medium text-ink-secondary">
                    Batch fallback Captured At (required when no captured_at column)
                  </label>
                  <input
                    type="datetime-local"
                    className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600"
                    value={fallbackCapturedAt}
                    onChange={(e) => setFallbackCapturedAt(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>Back</Button>
              <Button variant="primary" size="sm" onClick={runPreview} disabled={busy}>
                {busy ? "Validating…" : "Preview Import"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 3 && preview && (
          <div className="space-y-3">
            <p className="text-xs text-ink-muted">
              {preview.rows.length} rows · timezone {timezone}. Resolve every
              blocker before confirming; updates re-validate on the server.
            </p>
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {preview.rows.map((r) => (
                <PreviewRowCard
                  key={r.rowIndex}
                  row={r}
                  metricDefs={metricDefs}
                  publications={platformPubs}
                  override={overrides[r.rowIndex]}
                  onOverride={(o) =>
                    setOverrides((prev) => ({ ...prev, [r.rowIndex]: o }))
                  }
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setStep(2)}>Back</Button>
              <Button variant="secondary" size="sm" onClick={runPreview} disabled={busy}>
                <RefreshCw className="mr-1 h-3 w-3" />
                Update Preview
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={confirm}
                disabled={busy || readyCount === 0 || hasBlockers}
                title={hasBlockers ? "Resolve all rows first" : undefined}
              >
                {busy ? "Importing…" : `Confirm Import (${readyCount})`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PreviewRowCard({
  row,
  metricDefs,
  publications,
  override,
  onOverride,
}: {
  row: PreviewRow;
  metricDefs: MetricDefLite[];
  publications: PublicationLite[];
  override: { metrics?: Record<string, number | null>; capturedAt?: string; publicationId?: string } | undefined;
  onOverride: (o: { metrics?: Record<string, number | null>; capturedAt?: string; publicationId?: string }) => void;
}) {
  const needsResolution = row.status === "needs_resolution";
  const unresolvedKeys = needsResolution && row.reason
    ? (row.reason.match(/Unresolved metrics: (.+?) —/)?.[1].split(", ") ?? [])
    : [];

  return (
    <div className="rounded-[8px] border border-border bg-workspace p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-ink-primary">
          #{row.rowIndex + 1} {row.publication?.finalTitle ?? "(unresolved publication)"}
        </span>
        <Badge variant={row.status === "ready_create" || row.status === "ready_update" ? "mint" : row.status === "no_change" ? "default" : "warning"}>
          {STATUS_LABEL[row.status] ?? row.status}
        </Badge>
      </div>
      {row.reason && <p className="mt-1 text-xs text-ink-muted">{row.reason}</p>}
      {row.checkpoint && (
        <p className="mt-0.5 text-[11px] text-ink-faint">
          {row.checkpoint} · captured {row.capturedAt ? new Date(row.capturedAt).toLocaleString() : "—"}
        </p>
      )}
      {row.metrics && (
        <p className="mt-1 text-[11px] text-ink-secondary">
          {Object.entries(row.metrics)
            .map(([k, v]) => `${k}: ${v === null ? "N/A" : v}`)
            .join(" · ")}
        </p>
      )}
      {row.diff.length > 0 && (
        <p className="mt-1 text-[11px] text-ink-secondary">
          {row.diff.map((d) => `${d.key}: ${d.from ?? "N/A"} → ${d.to ?? "N/A"}`).join(" · ")}
        </p>
      )}

      {/* Human resolution: unmatched publication */}
      {row.status === "unmatched" && (
        <div className="mt-2">
          <select
            className="w-full rounded-[8px] border border-border bg-canvas px-2 py-1.5 text-xs outline-none focus:border-mint-600"
            value={override?.publicationId ?? ""}
            onChange={(e) =>
              onOverride({ ...override, publicationId: e.target.value || undefined })
            }
          >
            <option value="">Select publication…</option>
            {publications.map((p) => (
              <option key={p.publicationId} value={p.publicationId}>{p.finalTitle}</option>
            ))}
          </select>
        </div>
      )}

      {/* Human resolution: unresolved metrics */}
      {needsResolution && (
        <div className="mt-2 space-y-1">
          {unresolvedKeys.map((k) => {
            const cur = override?.metrics?.[k];
            const isNA = cur === null && override?.metrics && k in override.metrics;
            return (
              <div key={k} className="flex items-center gap-2">
                <span className="w-28 shrink-0 text-[11px] text-ink-secondary">
                  {metricDefs.find((d) => d.key === k)?.label ?? k}
                </span>
                {isNA ? (
                  <span className="flex-1 rounded border border-border bg-canvas px-2 py-1 text-xs text-ink-muted">N/A</span>
                ) : (
                  <input
                    className="flex-1 rounded border border-border bg-canvas px-2 py-1 text-xs outline-none focus:border-mint-600"
                    value={cur === null || cur === undefined ? "" : String(cur)}
                    onChange={(e) => {
                      const v = e.target.value.trim();
                      onOverride({
                        ...override,
                        metrics: {
                          ...(override?.metrics ?? {}),
                          [k]: v === "" ? undefined : Number(v),
                        } as Record<string, number | null>,
                      });
                    }}
                  />
                )}
                <button
                  className="text-[11px] text-ink-muted hover:text-ink-primary"
                  onClick={() =>
                    onOverride({
                      ...override,
                      metrics: { ...(override?.metrics ?? {}), [k]: isNA ? ("" as unknown as null) : null },
                    })
                  }
                >
                  {isNA ? "Restore" : "N/A"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {needsResolution && (
        <p className="mt-1 text-[11px] text-ink-faint">
          Set values, then click Update Preview to re-validate.
        </p>
      )}
    </div>
  );
}
