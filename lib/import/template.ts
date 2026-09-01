import { IMPORT_LIMITS } from "@/lib/import/parse";

/**
 * Import file validation + CSV template — M2.7.
 * Pure helpers; the dropzone UI calls these before any upload.
 */

export interface FileCheckOk {
  ok: true;
}
export interface FileCheckError {
  ok: false;
  error: string;
}

/** Client-side precheck (extension + size). Server re-validates anyway. */
export function validateImportFile(file: {
  name: string;
  size: number;
}): FileCheckOk | FileCheckError {
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  if (ext !== "csv" && ext !== "xlsx") {
    return {
      ok: false,
      error: "Unsupported file type. Choose a .csv or .xlsx file.",
    };
  }
  if (file.size > IMPORT_LIMITS.maxFileBytes) {
    return { ok: false, error: "File too large (max 2MB)." };
  }
  return { ok: true };
}

/**
 * CSV template for the selected platform: identity columns + the
 * platform's CURRENT active raw metric keys. No universal
 * mixed-platform template.
 */
export function buildCsvTemplate(
  platform: string,
  rawMetricKeys: string[]
): string {
  const cols = ["publication_url", "checkpoint", "captured_at", ...rawMetricKeys];
  const sample = [
    "https://example.com/your-published-post",
    "24h",
    "2026-01-01T10:05:00+08:00",
    ...rawMetricKeys.map(() => ""),
  ];
  return `${cols.join(",")}\n${sample.join(",")}\n`;
}
