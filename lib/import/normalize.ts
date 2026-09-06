/**
 * Import normalization — M2.7. All deterministic; no fuzzy matching.
 */

import type { Platform } from "@/lib/validation/platform-version";
import type { Checkpoint } from "@/lib/validation/snapshot";

// ─── Platform values ───────────────────────────────────

const PLATFORM_ALIASES: Record<string, Platform> = {
  xiaohongshu: "xiaohongshu",
  xhs: "xiaohongshu",
  小红书: "xiaohongshu",
  bilibili: "bilibili",
  bili: "bilibili",
  b站: "bilibili",
  douyin: "douyin",
  抖音: "douyin",
};

export function parsePlatformValue(value: unknown): Platform | null {
  if (value === null || value === undefined) return null;
  const key = String(value).trim().toLowerCase();
  return PLATFORM_ALIASES[key] ?? null;
}

// ─── Checkpoint ────────────────────────────────────────

const CHECKPOINT_ALIASES: Record<string, Checkpoint> = {
  "24": "24h",
  "24h": "24h",
  "72": "72h",
  "72h": "72h",
};

export function parseCheckpointValue(value: unknown): Checkpoint | null {
  if (value === null || value === undefined) return null;
  const key = String(value).trim().toLowerCase();
  return CHECKPOINT_ALIASES[key] ?? null;
}

// ─── Raw metric values ─────────────────────────────────

export type MetricCell =
  | { kind: "number"; value: number }
  | { kind: "na" } // explicit N/A → null
  | { kind: "blank" } // unresolved — human must resolve
  | { kind: "invalid"; reason: string };

export function parseMetricCell(value: unknown): MetricCell {
  if (value === null || value === undefined || String(value).trim() === "") {
    return { kind: "blank" };
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return { kind: "invalid", reason: "non-finite" };
    if (!Number.isInteger(value)) return { kind: "invalid", reason: "not an integer" };
    if (value < 0) return { kind: "invalid", reason: "negative" };
    return { kind: "number", value };
  }
  if (value instanceof Date) {
    return { kind: "invalid", reason: "date is not a metric value" };
  }
  const text = String(value).trim();
  if (/^n\/?a$/i.test(text)) return { kind: "na" };
  // Deterministic thousands separator: 1,234 → 1234
  const normalized = /^-?\d{1,3}(,\d{3})+$/.test(text)
    ? text.replace(/,/g, "")
    : text;
  if (!/^-?\d+$/.test(normalized)) {
    return { kind: "invalid", reason: "not a number" };
  }
  const n = Number(normalized);
  if (n < 0) return { kind: "invalid", reason: "negative" };
  return { kind: "number", value: n };
}

// ─── Captured At ───────────────────────────────────────

/**
 * Parse a capturedAt cell.
 * - ISO with explicit offset → used as-is.
 * - ISO-like without offset → interpreted in importTimezone (IANA).
 * - Date (Excel date cell) → wall-clock interpreted in importTimezone.
 * Never uses server-local timezone silently.
 */
export function parseCapturedAtCell(
  value: unknown,
  importTimezone: string
): { iso: string } | { error: string } {
  if (value === null || value === undefined || String(value).trim?.() === "") {
    return { error: "missing captured_at" };
  }

  if (value instanceof Date) {
    // Excel date cell: wall-clock time, no embedded zone.
    const wall = `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}T${String(value.getUTCHours()).padStart(2, "0")}:${String(value.getUTCMinutes()).padStart(2, "0")}:00`;
    return wallToIso(wall, importTimezone);
  }

  const text = String(value).trim();
  // Explicit offset (Z or ±hh:mm) wins.
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(text)) {
    const d = new Date(text);
    if (Number.isNaN(d.getTime())) return { error: "invalid datetime" };
    return { iso: d.toISOString() };
  }
  // ISO-like without offset → import timezone.
  if (/^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?$/.test(text)) {
    const wall = text.includes("T") || text.includes(" ")
      ? text.replace(" ", "T")
      : `${text}T00:00:00`;
    return wallToIso(
      wall.length === 10 ? `${wall}T00:00:00` : wall.length === 16 ? `${wall}:00` : wall,
      importTimezone
    );
  }
  return { error: "invalid datetime format" };
}

/** Wall-clock "YYYY-MM-DDTHH:mm:ss" interpreted in an IANA timezone → ISO UTC. */
export function wallToIso(
  wall: string,
  timeZone: string
): { iso: string } | { error: string } {
  try {
    // Pretend the wall time is UTC, then measure the zone's offset at
    // that instant via Intl — never the server's local timezone.
    const guess = new Date(`${wall}Z`);
    if (Number.isNaN(guess.getTime())) return { error: "invalid datetime" };
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    const parts = Object.fromEntries(
      dtf.formatToParts(guess).map((p) => [p.type, p.value])
    );
    const wallInZoneAsUtc = Date.parse(
      `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`
    );
    if (Number.isNaN(wallInZoneAsUtc)) return { error: "invalid datetime" };
    const offsetMs = wallInZoneAsUtc - guess.getTime();
    return { iso: new Date(guess.getTime() - offsetMs).toISOString() };
  } catch {
    return { error: `unknown timezone: ${timeZone}` };
  }
}

// ─── Publication URL normalization ─────────────────────

/**
 * Minimal safe normalization: trim, lowercase scheme+host, strip
 * fragment, strip trailing slash, drop utm_* params. Everything else
 * (including share_/spm params) is PRESERVED — better unmatched than
 * wrongly matched.
 */
export function normalizePublicationUrl(raw: string): string | null {
  const text = raw.trim();
  if (!/^https?:\/\//i.test(text)) return null;
  try {
    const url = new URL(text);
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (key.toLowerCase().startsWith("utm_")) url.searchParams.delete(key);
    }
    let out = url.toString();
    if (out.endsWith("/")) out = out.slice(0, -1);
    return out;
  } catch {
    return null;
  }
}

/**
 * M5.2 (G-53) — row-level capturedAt override input conversions.
 * datetime-local inputs carry wall time in the operator's local zone
 * (same semantics as the batch fallback input); conversion is exact
 * both ways. Server confirm re-parses the file and re-validates the
 * override against all snapshot rules — these helpers are UI-only.
 */
export function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function localInputToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * M5.2 G-53 fix — the capturedAt override control is available on EVERY
 * import row, including ready_create / ready_update. Capture time is
 * authoritative per snapshot, so a Human must be able to correct it
 * before Confirm even when the parsed file value is already valid.
 * (First M5.2 pass wrongly gated it to blocker rows only.)
 */
export function capturedAtOverrideVisible(): boolean {
  return true;
}
