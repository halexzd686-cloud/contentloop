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
 * platform's CURRENT active raw metric keys. HEADER ONLY — every data
 * row in a CSV is a real import row, so the template must never ship
 * an example row. Example values live in the modal's help text.
 */
export function buildCsvTemplate(
  platform: string,
  rawMetricKeys: string[]
): string {
  const cols = ["publication_url", "checkpoint", "captured_at", ...rawMetricKeys];
  return `${cols.join(",")}\n`;
}
