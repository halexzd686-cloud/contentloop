"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { isoToLocalInput, localInputToIso, capturedAtOverrideVisible } from "@/lib/import/normalize";
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
  ready_create: "新增",
  ready_update: "更新",
  no_change: "无变化",
  needs_mapping: "待映射",
  needs_resolution: "待处理",
  invalid: "无效",
  duplicate: "重复",
  unmatched: "未匹配",
  ambiguous: "多匹配",
  conflict: "冲突",
};

const IDENTITY_FIELDS: { key: keyof typeof EMPTY_MAPPING; label: string }[] = [
  { key: "publicationUrl", label: "发布链接" },
  { key: "publicationId", label: "发布 ID（可选）" },
  { key: "checkpoint", label: "数据点" },
  { key: "capturedAt", label: "采集时间（可选）" },
  { key: "platform", label: "平台列（可选校验）" },
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
  // M5.2 (G-54): explicit definitions state — a load failure must never
  // look like "this platform has no metrics".
  const [defsStatus, setDefsStatus] = useState<"loading" | "loaded" | "error">("loading");

  // Load the selected platform's active raw definitions as soon as the
  // modal opens / platform changes — the CSV template and mapping both
  // depend on them (fixes the empty-template blocker).
  const loadDefs = useCallback(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/settings/metrics")
      .then((r) => {
        if (!r.ok) throw new Error("load failed");
        return r.json();
      })
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
        setDefsStatus("loaded");
      })
      .catch(() => {
        if (!cancelled) setDefsStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [open, platform]);

  useEffect(() => loadDefs(), [loadDefs]);

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
    setDefsStatus("loading");
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
      if (!res.ok) throw new Error(data.error || "解析失败");
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
      setError(err instanceof Error ? err.message : "解析失败");
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
      if (!res.ok) throw new Error(data.error || "预览失败");
      setPreview(data);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "预览失败");
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
      if (!res.ok) throw new Error(data.error || "导入失败");
      setConfirmResult(`已导入 ${data.imported} 条指标数据。`);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "导入失败");
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
          <DialogTitle>导入数据</DialogTitle>
          <DialogDescription>
            每次导入一个平台。先预览再写入——确认前不会保存任何内容。
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
              <label className="mb-1 block text-xs font-medium text-ink-secondary">平台</label>
              <select
                className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600"
                value={platform}
                onChange={(e) => {
                  setPlatform(e.target.value as Platform);
                  setDefsStatus("loading");
                }}
              >
                {PLATFORM_KEYS.map((k) => (
                  <option key={k} value={k}>{platformLabel(k)}</option>
                ))}
              </select>
            </div>
            <div>
              <span className="mb-1 block text-xs font-medium text-ink-secondary">文件</span>
              <input
                id="import-file-input"
                type="file"
                accept=".csv,.xlsx"
                className="sr-only"
                aria-label="选择 CSV 或 XLSX 指标文件"
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
                    拖拽文件到这里，或点击选择
                  </span>
                  <span className="text-xs text-ink-muted">
                    .csv / .xlsx · 最大 2MB · 最多 200 行
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
                      更换
                    </label>
                    <button
                      className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-danger"
                      onClick={() => acceptFile(null)}
                    >
                      <X className="h-3 w-3" />
                      移除
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
              <label className="mb-1 block text-xs font-medium text-ink-secondary">导入时区（用于没有时区偏移量的时间）</label>
              <input
                className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              />
              <p className="mt-1 text-[11px] text-ink-faint">时区，例如 Asia/Shanghai。预览中会再次显示。</p>
            </div>
            <p className="text-[11px] text-ink-faint">
              示例行值：publication_url https://… · checkpoint 24h ·
              captured_at 2026-08-29T16:30:00+08:00。模板只包含表头——每条发布记录对应一行数据。
            </p>
            {/* G-54: definitions failure is an explicit error state with
                Retry — never an empty template/mapping. File/mapping
                state is untouched by a retry. */}
            {defsStatus === "error" && (
              <div className="mt-2 rounded-[8px] border border-danger/20 bg-danger/5 p-3 text-xs text-danger">
                指标定义加载失败。映射和 CSV 模板都需要它们。
                <button
                  className="ml-2 font-medium underline"
                  onClick={loadDefs}
                >
                  重试
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={downloadTemplate}
                disabled={defsStatus !== "loaded"}
              >
                下载 CSV 模板
              </Button>
              <Button variant="primary" size="sm" onClick={upload} disabled={!file || busy || defsStatus !== "loaded"}>
                <Upload className="mr-1 h-3 w-3" />
                {busy ? "解析中…" : "上传并继续"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Map */}
        {step === 2 && mapping && fileMeta && (
          <div className="space-y-4">
            {defsStatus === "error" && (
              <div className="rounded-[8px] border border-danger/20 bg-danger/5 p-3 text-xs text-danger">
                指标定义加载失败——指标映射需要它们。你的文件和映射选择都已保留。
                <button className="ml-2 font-medium underline" onClick={loadDefs}>
                  重试
                </button>
              </div>
            )}
            {fileMeta.sheets.length > 1 && (
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-secondary">工作表</label>
                <select
                  className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600"
                  value={sheet ?? ""}
                  onChange={(e) => setSheet(e.target.value)}
                >
                  {fileMeta.sheets.map((s) => (
                    <option key={s.name} value={s.name}>{s.name}（{s.rowCount} 行）</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <p className="mb-2 text-xs font-semibold text-ink-secondary">发布匹配</p>
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
                      <option value="">— 未映射 —</option>
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
                指标（{platformLabel(platform)}）
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
                        <option value="">— 未解析 —</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                        <option value="__NA__">全部行标记 N/A</option>
                      </select>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-ink-secondary">{METRIC_NA_HELPER}</p>
              {!mapping.capturedAt && (
                <div className="mt-3">
                  <label className="mb-1 block text-xs font-medium text-ink-secondary">
                    统一采集时间（没有 captured_at 列时必填）
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
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>上一步</Button>
              <Button variant="primary" size="sm" onClick={runPreview} disabled={busy}>
                {busy ? "校验中…" : "预览导入"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 3 && preview && (
          <div className="space-y-3">
            <p className="text-xs text-ink-muted">
              共 {preview.rows.length} 行 · 时区 {timezone}。确认前请处理完所有问题；更新会在服务端重新校验。
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
              <Button variant="ghost" size="sm" onClick={() => setStep(2)}>上一步</Button>
              <Button variant="secondary" size="sm" onClick={runPreview} disabled={busy}>
                <RefreshCw className="mr-1 h-3 w-3" />
                更新预览
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={confirm}
                disabled={busy || readyCount === 0 || hasBlockers || defsStatus !== "loaded"}
                title={
                  defsStatus !== "loaded"
                    ? "指标定义不可用——请先重试加载"
                    : hasBlockers
                      ? "请先处理所有行"
                      : undefined
                }
              >
                {busy ? "导入中…" : `确认导入（${readyCount}）`}
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
    ? (row.reason.match(/未解析指标：(.+?) ——/)?.[1].split("、") ?? [])
    : [];
  // G-53: the capture-time override is available on every row,
  // including ready rows — the control itself never invalidates a row;
  // the server re-validates any override on preview/confirm.
  const showCapturedAtOverride = capturedAtOverrideVisible();

  return (
    <div className="rounded-[8px] border border-border bg-workspace p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-ink-primary">
          #{row.rowIndex + 1} {row.publication?.finalTitle ?? "（未匹配的发布记录）"}
        </span>
        <Badge variant={row.status === "ready_create" || row.status === "ready_update" ? "mint" : row.status === "no_change" ? "default" : "warning"}>
          {STATUS_LABEL[row.status] ?? row.status}
        </Badge>
      </div>
      {row.reason && <p className="mt-1 text-xs text-ink-muted">{row.reason}</p>}
      {row.checkpoint && (
        <p className="mt-0.5 text-[11px] text-ink-faint">
          {row.checkpoint} · 采集时间 {row.capturedAt ? new Date(row.capturedAt).toLocaleString() : "—"}
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

      {/* Human resolution: unmatched OR ambiguous publication (M5.2
          G-52). True identity conflicts (id and URL resolving to
          different publications) stay blocked — no picker. */}
      {(row.status === "unmatched" || row.status === "ambiguous") && (
        <div className="mt-2">
          {row.status === "ambiguous" && (
            <p className="mb-1 text-[11px] text-ink-secondary">
              多个发布记录匹配这个链接——请选择正确的一条：
            </p>
          )}
          <select
            className="w-full rounded-[8px] border border-border bg-canvas px-2 py-1.5 text-xs outline-none focus:border-mint-600"
            value={override?.publicationId ?? ""}
            onChange={(e) =>
              onOverride({ ...override, publicationId: e.target.value || undefined })
            }
          >
            <option value="">选择发布记录…</option>
            {publications.map((p) => (
              <option key={p.publicationId} value={p.publicationId}>{p.finalTitle}</option>
            ))}
          </select>
        </div>
      )}

      {/* M5.2 G-53: row-level capture-time override. Default stays the
          parsed file value; an override is visibly marked and clearable.
          Server re-validates it (future / checkpoint timing) on preview
          and confirm; the override participates in the preview
          fingerprint, so an old preview cannot be confirmed. */}
      {showCapturedAtOverride && (
        <div className="mt-2 rounded-[8px] border border-border bg-canvas p-2">
          <p className="text-[11px] text-ink-secondary">
            采集时间覆盖
            {override?.capturedAt && (
              <span className="ml-1 font-medium text-mint-600">——已覆盖</span>
            )}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="datetime-local"
              className="flex-1 rounded border border-border bg-workspace px-2 py-1 text-xs outline-none focus:border-mint-600"
              value={override?.capturedAt ? isoToLocalInput(override.capturedAt) : ""}
              onChange={(e) => {
                const iso = localInputToIso(e.target.value);
                onOverride({ ...override, capturedAt: iso ?? undefined });
              }}
            />
            {override?.capturedAt && (
              <button
                className="text-[11px] text-ink-muted hover:text-ink-primary"
                onClick={() => onOverride({ ...override, capturedAt: undefined })}
              >
                清除
              </button>
            )}
          </div>
          <p className="mt-1 text-[11px] text-ink-muted">
            文件解析值：{row.capturedAt ? new Date(row.capturedAt).toLocaleString() : "无"}
          </p>
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
                  {isNA ? "恢复" : "N/A"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {needsResolution && (
        <p className="mt-1 text-[11px] text-ink-faint">
          填好数值后，点“更新预览”重新校验。
        </p>
      )}
    </div>
  );
}
