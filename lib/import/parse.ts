import * as XLSX from "xlsx";
import { createHash } from "crypto";

/**
 * Import parsing — M2.7. SheetJS CE 0.20.3 (locked tarball).
 * One parser handles CSV + XLSX. Cells are DATA only: formulas are
 * never evaluated (cached values only), macros/links/scripts ignored.
 */

export const IMPORT_LIMITS = {
  maxFileBytes: 2 * 1024 * 1024,
  maxRows: 200,
  maxColumns: 30,
} as const;

export class ImportError extends Error {
  constructor(
    message: string,
    readonly code:
      | "unsupported_file"
      | "too_large"
      | "too_many_rows"
      | "too_many_columns"
      | "parse_failed"
  ) {
    super(message);
    this.name = "ImportError";
  }
}

export interface ParsedSheet {
  name: string;
  headers: string[];
  /** Raw cell values per row (strings as-is, numbers as numbers, dates as ISO when converted). */
  rows: unknown[][];
  rowCount: number;
}

export interface ParsedFile {
  fileHash: string;
  fileType: "csv" | "xlsx";
  sheets: { name: string; rowCount: number }[];
}

export function detectFileType(fileName: string): "csv" | "xlsx" {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  if (ext === "csv") return "csv";
  if (ext === "xlsx") return "xlsx";
  throw new ImportError(
    "Unsupported file type. Upload .csv or .xlsx.",
    "unsupported_file"
  );
}

function guardLimits(fileBytes: number, rowCount: number, colCount: number) {
  if (fileBytes > IMPORT_LIMITS.maxFileBytes) {
    throw new ImportError("File too large (max 2MB).", "too_large");
  }
  if (rowCount > IMPORT_LIMITS.maxRows) {
    throw new ImportError("Too many rows (max 200).", "too_many_rows");
  }
  if (colCount > IMPORT_LIMITS.maxColumns) {
    throw new ImportError("Too many columns (max 30).", "too_many_columns");
  }
}

/** First non-empty row = header. Duplicate or empty headers → error. */
function splitHeader(rows: unknown[][]): { headers: string[]; data: unknown[][] } {
  const headerIdx = rows.findIndex((r) => r.some((c) => c !== null && c !== undefined && String(c).trim() !== ""));
  if (headerIdx === -1) {
    throw new ImportError("No header row found.", "parse_failed");
  }
  const headers = rows[headerIdx].map((c) =>
    c === null || c === undefined ? "" : String(c).trim()
  );
  if (headers.some((h) => h === "")) {
    throw new ImportError("Header row contains empty column names.", "parse_failed");
  }
  const dupes = headers.filter((h, i) => headers.indexOf(h) !== i);
  if (dupes.length > 0) {
    throw new ImportError(
      `Duplicate column names: ${[...new Set(dupes)].join(", ")}.`,
      "parse_failed"
    );
  }
  return { headers, data: rows.slice(headerIdx + 1) };
}

export function parseFile(bytes: Uint8Array, fileName: string): ParsedFile {
  const fileType = detectFileType(fileName);
  const fileHash = createHash("sha256").update(bytes).digest("hex");

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(bytes, {
      type: "array",
      cellDates: true, // Date cells → JS Date (never evaluate formulas)
      raw: true,
    });
  } catch {
    throw new ImportError("Could not parse the file.", "parse_failed");
  }

  guardLimits(bytes.length, 0, 0);

  const sheets = workbook.SheetNames.map((name) => {
    const ws = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      defval: null,
      raw: true,
      dateNF: "yyyy-mm-dd'T'HH:MM:ss",
    });
    const nonEmpty = rows.filter((r) =>
      r.some((c) => c !== null && c !== undefined && String(c).trim() !== "")
    );
    return { name, rowCount: Math.max(0, nonEmpty.length - 1) };
  });

  return { fileHash, fileType, sheets };
}

export function parseSheet(
  bytes: Uint8Array,
  fileName: string,
  sheetName?: string
): ParsedSheet {
  const fileType = detectFileType(fileName);
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(bytes, {
      type: "array",
      cellDates: fileType === "xlsx",
      raw: fileType === "csv",
    });
  } catch {
    throw new ImportError("Could not parse the file.", "parse_failed");
  }

  const name = sheetName ?? workbook.SheetNames[0];
  if (!workbook.SheetNames.includes(name)) {
    throw new ImportError(`Sheet "${name}" not found.`, "parse_failed");
  }
  const ws = workbook.Sheets[name];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    defval: null,
    raw: true,
    dateNF: "yyyy-mm-dd'T'HH:MM:ss",
  });
  const nonEmpty = rows.filter((r) =>
    r.some((c) => c !== null && c !== undefined && String(c).trim() !== "")
  );
  const { headers, data } = splitHeader(nonEmpty);
  guardLimits(bytes.length, data.length, headers.length);
  void fileType;
  return { name, headers, rows: data, rowCount: data.length };
}
