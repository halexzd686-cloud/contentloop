import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";

import { parseFile, parseSheet, ImportError, IMPORT_LIMITS } from "@/lib/import/parse";
import {
  parsePlatformValue,
  parseCheckpointValue,
  parseMetricCell,
  parseCapturedAtCell,
  normalizePublicationUrl,
  wallToIso,
  isoToLocalInput,
  localInputToIso,
  capturedAtOverrideVisible,
} from "@/lib/import/normalize";
import { validateImportFile, buildCsvTemplate } from "@/lib/import/template";
import {
  suggestIdentityMapping,
  suggestMetricMapping,
  validateMapping,
  EMPTY_MAPPING,
} from "@/lib/import/mapping";

/**
 * M2.7 import pipeline — parser / normalizer / mapping tests.
 * Preview/confirm DB behavior is covered by the Supabase smoke test.
 */

function csvBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

describe("parseFile / parseSheet", () => {
  it("parses CSV: headers + rows, quoted commas", () => {
    const bytes = csvBytes('url,views,notes\nhttps://a.com/x,1000,"hello, world"\n');
    const p = parseFile(bytes, "a.csv");
    expect(p.fileType).toBe("csv");
    expect(p.fileHash).toMatch(/^[a-f0-9]{64}$/);
    const s = parseSheet(bytes, "a.csv");
    expect(s.headers).toEqual(["url", "views", "notes"]);
    // CSV raw-text mode: values stay strings; normalizers handle them.
    expect(s.rows[0][1]).toBe("1000");
  });

  it("CSV ISO datetime strings are never date-mangled", () => {
    const bytes = csvBytes("captured_at\n2026-08-31T11:00:00Z\n");
    const s = parseSheet(bytes, "a.csv");
    expect(String(s.rows[0][0])).toBe("2026-08-31T11:00:00Z");
  });

  it("UTF-8 BOM is handled", () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...csvBytes("url,views\nhttps://a.com,5\n")]);
    const s = parseSheet(bytes, "a.csv");
    expect(s.headers[0]).toBe("url");
  });

  it("first non-empty row is the header", () => {
    const bytes = csvBytes("\n\nurl,views\nhttps://a.com,5\n");
    const s = parseSheet(bytes, "a.csv");
    expect(s.headers).toEqual(["url", "views"]);
    expect(s.rows).toHaveLength(1);
  });

  it("duplicate headers rejected", () => {
    const bytes = csvBytes("url,url\nhttps://a.com,1\n");
    expect(() => parseSheet(bytes, "a.csv")).toThrow(ImportError);
  });

  it("xlsx: multiple sheets listed, one selectable", () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["url", "views"], ["https://a.com", 10]]), "Data");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["x"], [1]]), "Other");
    const bytes = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    const u8 = new Uint8Array(bytes);
    const p = parseFile(u8, "a.xlsx");
    expect(p.fileType).toBe("xlsx");
    expect(p.sheets.map((s) => s.name)).toEqual(["Data", "Other"]);
    const s = parseSheet(u8, "a.xlsx", "Data");
    expect(s.headers).toEqual(["url", "views"]);
    expect(s.rows[0][1]).toBe(10);
  });

  it("xlsx formula cells read cached values, never evaluated", () => {
    const ws = XLSX.utils.aoa_to_sheet([["views"], [1000]]);
    // simulate a formula with cached value
    ws["A2"] = { t: "n", f: "1+1", v: 2 };
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "S");
    const bytes = new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer);
    const s = parseSheet(bytes, "a.xlsx", "S");
    expect(s.rows[0][0]).toBe(2); // cached value, not the formula
  });

  it("limits enforced", () => {
    const tooManyRows = csvBytes("url\n" + "https://a.com\n".repeat(IMPORT_LIMITS.maxRows + 1));
    expect(() => parseSheet(tooManyRows, "a.csv")).toThrow(ImportError);
    const tooManyCols = csvBytes(Array(IMPORT_LIMITS.maxColumns + 1).fill("c").join(",") + "\n");
    expect(() => parseSheet(tooManyCols, "a.csv")).toThrow(ImportError);
  });

  it("unsupported extension rejected", () => {
    expect(() => parseFile(csvBytes("a\n"), "a.xls")).toThrow(ImportError);
    expect(() => parseFile(csvBytes("a\n"), "a.txt")).toThrow(ImportError);
  });
});

describe("normalize", () => {
  it("platform aliases are deterministic", () => {
    expect(parsePlatformValue("小红书")).toBe("xiaohongshu");
    expect(parsePlatformValue("XHS")).toBe("xiaohongshu");
    expect(parsePlatformValue("B站")).toBe("bilibili");
    expect(parsePlatformValue("抖音")).toBe("douyin");
    expect(parsePlatformValue("tiktok")).toBeNull();
  });

  it("checkpoint: canonical + aliases only", () => {
    expect(parseCheckpointValue("24")).toBe("24h");
    expect(parseCheckpointValue("24H")).toBe("24h");
    expect(parseCheckpointValue("72h")).toBe("72h");
    expect(parseCheckpointValue("manual")).toBeNull();
    expect(parseCheckpointValue("1h")).toBeNull();
  });

  it("metric cells: blank unresolved / N-A explicit / zero real / invalid rejected", () => {
    expect(parseMetricCell("")).toEqual({ kind: "blank" });
    expect(parseMetricCell(null)).toEqual({ kind: "blank" });
    expect(parseMetricCell("N/A")).toEqual({ kind: "na" });
    expect(parseMetricCell("n/a")).toEqual({ kind: "na" });
    expect(parseMetricCell(0)).toEqual({ kind: "number", value: 0 });
    expect(parseMetricCell("0")).toEqual({ kind: "number", value: 0 });
    expect(parseMetricCell("1,234")).toEqual({ kind: "number", value: 1234 });
    expect(parseMetricCell(-1).kind).toBe("invalid");
    expect(parseMetricCell(1.5).kind).toBe("invalid");
    expect(parseMetricCell("abc").kind).toBe("invalid");
    expect(parseMetricCell(Number.NaN).kind).toBe("invalid");
  });

  it("capturedAt: offset ISO wins; no-offset uses import timezone; date cells wall-clock", () => {
    const withOffset = parseCapturedAtCell("2026-08-21T10:05:00+08:00", "Asia/Shanghai");
    expect(withOffset).toEqual({ iso: "2026-08-21T02:05:00.000Z" });

    const noOffset = parseCapturedAtCell("2026-08-21T10:05", "Asia/Shanghai");
    expect(noOffset).toEqual({ iso: "2026-08-21T02:05:00.000Z" });

    const utc = parseCapturedAtCell("2026-08-21T10:05", "UTC");
    expect(utc).toEqual({ iso: "2026-08-21T10:05:00.000Z" });

    expect("error" in parseCapturedAtCell("yesterday", "UTC")).toBe(true);
    expect("error" in parseCapturedAtCell("", "UTC")).toBe(true);
  });

  it("wallToIso never uses server-local timezone", () => {
    const a = wallToIso("2026-08-21T10:05:00", "Asia/Shanghai");
    const b = wallToIso("2026-08-21T10:05:00", "UTC");
    expect(a).not.toEqual(b);
    expect(a).toEqual({ iso: "2026-08-21T02:05:00.000Z" });
    expect(wallToIso("bad", "UTC")).toHaveProperty("error");
  });

  it("URL normalization: case/fragment/trailing slash/utm removed; unknown params kept", () => {
    expect(
      normalizePublicationUrl("HTTPS://WWW.Xiaohongshu.COM/explore/abc?utm_source=x&spm=keep#frag")
    ).toBe("https://www.xiaohongshu.com/explore/abc?spm=keep");
    expect(normalizePublicationUrl("https://a.com/x/")).toBe("https://a.com/x");
    expect(normalizePublicationUrl("not a url")).toBeNull();
  });
});

describe("mapping", () => {
  const defs = [
    { key: "views", displayName: "Views", alias: "播放/阅读" },
    { key: "likes", displayName: "Likes", alias: "点赞" },
    { key: "saves", displayName: "Saves", alias: null },
  ];

  it("suggests exact key / displayName / alias only", () => {
    const m = suggestMetricMapping(["views", "点赞", "收藏量"], defs);
    expect(m.views).toBe("views");
    expect(m.likes).toBe("点赞");
    expect(m.saves).toBeNull(); // 收藏量 is not an exact alias → unmapped
  });

  it("identity suggestions hit known aliases", () => {
    const m = suggestIdentityMapping(["笔记链接", "checkpoint", "views"]);
    expect(m.publicationUrl).toBe("笔记链接");
    expect(m.checkpoint).toBe("checkpoint");
  });

  it("validateMapping: identity required, duplicate targets rejected", () => {
    const headers = ["a", "b"];
    const ok = validateMapping(
      { ...EMPTY_MAPPING, publicationUrl: "a", checkpoint: "b", metrics: { views: null }, metricNAAll: [] },
      headers
    );
    expect(ok).toEqual([]);

    const dup = validateMapping(
      { ...EMPTY_MAPPING, publicationUrl: "a", checkpoint: "a", metrics: {}, metricNAAll: [] },
      headers
    );
    expect(dup.length).toBeGreaterThan(0);

    const missing = validateMapping(
      { ...EMPTY_MAPPING, metrics: {}, metricNAAll: [] },
      headers
    );
    expect(missing.some((e) => e.includes("publication_url"))).toBe(true);
    expect(missing.some((e) => e.includes("数据点"))).toBe(true);
  });

  it("rejects derived / inactive metric mappings explicitly", () => {
    const errs = validateMapping(
      {
        ...EMPTY_MAPPING,
        publicationUrl: "a",
        checkpoint: "b",
        metrics: { like_rate: "c" },
        metricNAAll: [],
      },
      ["a", "b", "c"],
      ["views", "likes"]
    );
    expect(errs.some((e) => e.includes("like_rate") && e.includes("cannot be imported"))).toBe(true);

    const ok = validateMapping(
      { ...EMPTY_MAPPING, publicationUrl: "a", checkpoint: "b", metrics: { views: "c" }, metricNAAll: [] },
      ["a", "b", "c"],
      ["views", "likes"]
    );
    expect(ok).toEqual([]);
  });
});

describe("validateImportFile", () => {
  const f = (name: string, size = 1000) => ({ name, size });

  it("accepts csv and xlsx", () => {
    expect(validateImportFile(f("a.csv")).ok).toBe(true);
    expect(validateImportFile(f("a.xlsx")).ok).toBe(true);
  });

  it("rejects wrong extension", () => {
    const r = validateImportFile(f("a.xls"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain(".csv or .xlsx");
    expect(validateImportFile(f("a.txt")).ok).toBe(false);
  });

  it("rejects files over 2MB", () => {
    const r = validateImportFile(f("a.csv", 3 * 1024 * 1024));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("2MB");
  });
});

describe("buildCsvTemplate", () => {
  it("includes identity columns + the platform's active raw keys", () => {
    const csv = buildCsvTemplate("xiaohongshu", ["views", "likes", "saves", "comments"]);
    const [header] = csv.split("\n");
    expect(header).toBe("publication_url,checkpoint,captured_at,views,likes,saves,comments");
  });

  it("omits inactive metrics (only given keys are included)", () => {
    const csv = buildCsvTemplate("douyin", ["views", "likes"]);
    expect(csv).toContain("views,likes");
    expect(csv).not.toContain("impressions");
  });
});

// ─── M5.2 G-53: row-level capturedAt override conversions ──

describe("capturedAt override input conversions (M5.2)", () => {
  it("round-trips ISO → datetime-local → ISO", () => {
    const iso = "2026-08-29T16:30:00+08:00";
    const local = isoToLocalInput(iso);
    expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(localInputToIso(local)).toBe(new Date(iso).toISOString());
  });

  it("invalid/empty values are safe", () => {
    expect(isoToLocalInput("not-a-date")).toBe("");
    expect(localInputToIso("")).toBeNull();
    expect(localInputToIso("garbage")).toBeNull();
  });

  it("clearing an override means undefined (parsed value wins again)", () => {
    // UI contract: Clear → capturedAt: undefined → server falls back to
    // the parsed file value / batch fallback, and the preview fingerprint
    // changes because rowOverrides changed.
    expect(localInputToIso("") ?? undefined).toBeUndefined();
  });
});

// ─── M5.2 G-53 fix: override control available on ready rows ──

describe("capturedAtOverrideVisible (M5.2 fix)", () => {
  it("every import row exposes the override — ready and blocker rows alike", () => {
    // Contract: ready_create / ready_update / no_change / needs_resolution /
    // invalid / duplicate / unmatched / ambiguous / conflict all show the
    // control. The predicate is intentionally unconditional.
    expect(capturedAtOverrideVisible()).toBe(true);
  });
});
