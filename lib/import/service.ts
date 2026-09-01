import { eq, and, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  contents,
  metricDefinitions,
  metricSnapshots,
  publications,
} from "@/lib/db/schema";
import { requireSingleBrand } from "@/lib/brand";
import { ReviewError } from "@/lib/review";
import { parseFile, parseSheet } from "@/lib/import/parse";
import {
  normalizePublicationUrl,
  parseCheckpointValue,
  parseMetricCell,
  parseCapturedAtCell,
  parsePlatformValue,
} from "@/lib/import/normalize";
import {
  validateMapping,
  type ColumnMapping,
} from "@/lib/import/mapping";
import {
  createSnapshotIn,
  editSnapshotIn,
} from "@/lib/metrics/snapshots";
import {
  isCaptureOnTime,
  CAPTURED_AT_FUTURE_SKEW_MS,
  type Checkpoint,
} from "@/lib/validation/snapshot";
import type { Platform } from "@/lib/validation/platform-version";
import { fingerprintOf } from "@/lib/metrics/fingerprint";

/**
 * Import service — M2.7.
 *
 * Authority model: the original FILE is the source of truth. Preview
 * and Confirm both re-parse the file server-side; client-submitted
 * parsed values are never trusted. Human edits travel as explicit
 * rowOverrides. Confirm re-runs ALL validation and writes inside ONE
 * transaction (atomic batch, no partial success).
 */

export interface RowOverride {
  metrics?: Record<string, number | null>;
  capturedAt?: string;
  publicationId?: string;
}

export interface ImportConfig {
  platform: Platform;
  sheet: string | null;
  mapping: ColumnMapping;
  timezone: string;
  fallbackCapturedAt: string | null;
  rowOverrides: Record<number, RowOverride>;
}

export type RowStatus =
  | "ready_create"
  | "ready_update"
  | "no_change"
  | "needs_mapping"
  | "needs_resolution"
  | "invalid"
  | "duplicate"
  | "unmatched"
  | "ambiguous"
  | "conflict";

export interface PreviewRow {
  rowIndex: number;
  status: RowStatus;
  reason: string | null;
  publicationId: string | null;
  publication: { id: string; finalTitle: string } | null;
  checkpoint: Checkpoint | null;
  capturedAt: string | null;
  metrics: Record<string, number | null> | null;
  diff: { key: string; from: number | null | string; to: number | null | string }[];
  action: "create" | "update" | "skip" | null;
  existingSnapshotId: string | null;
  /** Content fingerprint of the existing snapshot at preview time. */
  existingFingerprint?: string | null;
}

type EffectiveRow = PreviewRow;

function cellText(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString();
  return String(v).trim();
}

function getCol(headers: string[], row: unknown[], name: string | null): unknown {
  if (!name) return null;
  const idx = headers.indexOf(name);
  return idx === -1 ? null : row[idx];
}

async function loadPlatformScope(brandId: string, platform: Platform) {
  const [defs, pubs] = await Promise.all([
    db
      .select()
      .from(metricDefinitions)
      .where(
        and(
          eq(metricDefinitions.brandId, brandId),
          eq(metricDefinitions.platform, platform),
          eq(metricDefinitions.type, "raw"),
          eq(metricDefinitions.isActive, true)
        )
      ),
    db
      .select()
      .from(publications)
      .where(
        and(eq(publications.platform, platform), isNull(publications.deletedAt))
      ),
  ]);
  // Brand scope: publications lack brandId; resolve via contents.
  const contentRows = await db
    .select({ id: contents.id })
    .from(contents)
    .where(and(eq(contents.brandId, brandId), isNull(contents.deletedAt)));
  const brandContentIds = new Set(contentRows.map((c) => c.id));
  const scopedPubs = pubs.filter((p) => brandContentIds.has(p.contentId));
  return { defs, pubs: scopedPubs };
}

function resolveIdentity(
  row: unknown[],
  headers: string[],
  mapping: ColumnMapping,
  override: RowOverride | undefined,
  pubs: (typeof publications.$inferSelect)[],
  platform: Platform
): { publication: (typeof publications.$inferSelect) | null; status: RowStatus | null; reason: string | null } {
  // Row-level platform validation column.
  const platformCell = getCol(headers, row, mapping.platform);
  if (mapping.platform && cellText(platformCell) !== "") {
    const p = parsePlatformValue(platformCell);
    if (p !== platform) {
      return { publication: null, status: "invalid", reason: `Row platform "${cellText(platformCell)}" does not match the selected platform.` };
    }
  }

  // Manual human resolution wins (server re-verifies it below).
  if (override?.publicationId) {
    const pub = pubs.find((p) => p.id === override.publicationId);
    if (!pub) {
      return { publication: null, status: "invalid", reason: "Manually selected publication is not on this platform/brand." };
    }
    return { publication: pub, status: null, reason: null };
  }

  const idCell = cellText(getCol(headers, row, mapping.publicationId));
  const urlCell = cellText(getCol(headers, row, mapping.publicationUrl));
  const normUrl = urlCell ? normalizePublicationUrl(urlCell) : null;
  if (urlCell && !normUrl) {
    return { publication: null, status: "invalid", reason: "Publication URL is not a valid http(s) URL." };
  }

  const byId = idCell ? pubs.filter((p) => p.id === idCell) : [];
  const byUrl = normUrl
    ? pubs.filter((p) => normalizePublicationUrl(p.url) === normUrl)
    : [];

  if (idCell && byId.length === 0) {
    return { publication: null, status: "unmatched", reason: "No publication with this ID." };
  }
  if (normUrl && byUrl.length === 0) {
    return { publication: null, status: "unmatched", reason: "No publication matches this URL." };
  }
  if (normUrl && byUrl.length > 1) {
    return { publication: null, status: "ambiguous", reason: "URL matches multiple publications." };
  }
  if (idCell && normUrl && byId[0] && byUrl[0] && byId[0].id !== byUrl[0].id) {
    return { publication: null, status: "invalid", reason: "publication_id and publication_url resolve to different publications." };
  }
  const pub = byId[0] ?? byUrl[0] ?? null;
  if (!pub) {
    return { publication: null, status: "unmatched", reason: "No publication identity could be resolved." };
  }
  return { publication: pub, status: null, reason: null };
}

export async function buildImportPreview(
  bytes: Uint8Array,
  fileName: string,
  config: ImportConfig
): Promise<{ rows: PreviewRow[]; previewFingerprint: string; fileHash: string }> {
  const brand = await requireSingleBrand();

  // Authoritative re-parse of the original file.
  const parsed = parseFile(bytes, fileName);
  const sheet = parseSheet(bytes, fileName, config.sheet ?? undefined);
  const { defs, pubs } = await loadPlatformScope(brand.id, config.platform);

  const mappingErrors = validateMapping(config.mapping, sheet.headers);
  const metricKeys = defs.map((d) => d.key);

  const rows: EffectiveRow[] = [];
  const seenTargets = new Map<string, number>();

  for (let i = 0; i < sheet.rows.length; i++) {
    const raw = sheet.rows[i];
    const override = config.rowOverrides[i];

    const base: EffectiveRow = {
      rowIndex: i,
      status: "invalid",
      reason: null,
      publication: null,
      checkpoint: null,
      capturedAt: null,
      metrics: null,
      diff: [],
      action: null,
      existingSnapshotId: null,
      publicationId: null,
    };

    if (mappingErrors.length > 0) {
      rows.push({ ...base, status: "needs_mapping", reason: mappingErrors.join(" ") });
      continue;
    }

    // Identity
    const idRes = resolveIdentity(raw, sheet.headers, config.mapping, override, pubs, config.platform);
    if (idRes.status) {
      rows.push({ ...base, status: idRes.status, reason: idRes.reason });
      continue;
    }
    const publication = idRes.publication!;
    base.publication = { id: publication.id, finalTitle: publication.finalTitle };
    base.publicationId = publication.id;

    // Checkpoint
    const cpCell = getCol(sheet.headers, raw, config.mapping.checkpoint);
    const checkpoint = parseCheckpointValue(cpCell);
    if (!checkpoint) {
      rows.push({ ...base, status: "invalid", reason: `Invalid checkpoint "${cellText(cpCell)}" (allowed: 24h / 72h).` });
      continue;
    }
    base.checkpoint = checkpoint;

    // CapturedAt: row cell > override > global fallback (explicit human input only)
    const capCell = getCol(sheet.headers, raw, config.mapping.capturedAt);
    let capturedAtIso: string | null = null;
    let capError: string | null = null;
    if (cellText(capCell) !== "") {
      const r = parseCapturedAtCell(capCell, config.timezone);
      if ("error" in r) capError = r.error;
      else capturedAtIso = r.iso;
    }
    if (override?.capturedAt) capturedAtIso = override.capturedAt;
    if (!capturedAtIso && !capError && config.fallbackCapturedAt) {
      capturedAtIso = config.fallbackCapturedAt;
    }
    if (capError) {
      rows.push({ ...base, status: "invalid", reason: `Invalid captured_at: ${capError}.` });
      continue;
    }
    if (!capturedAtIso) {
      rows.push({ ...base, status: "needs_resolution", reason: "Missing captured_at (map a column or set the batch fallback)." });
      continue;
    }
    const capturedAt = new Date(capturedAtIso);
    if (capturedAt.getTime() > Date.now() + CAPTURED_AT_FUTURE_SKEW_MS) {
      rows.push({ ...base, status: "invalid", reason: "captured_at cannot be in the future." });
      continue;
    }
    if (!isCaptureOnTime(publication.publishedAt, checkpoint, capturedAt)) {
      rows.push({ ...base, status: "invalid", reason: `captured_at is before the ${checkpoint} checkpoint target.` });
      continue;
    }
    base.capturedAt = capturedAt.toISOString();

    // Duplicate target inside file (identity+checkpoint known — flag
    // regardless of metric resolution state).
    const targetKey = `${publication.id}:${checkpoint}`;
    const firstSeen = seenTargets.get(targetKey);
    if (firstSeen !== undefined) {
      rows.push({ ...base, status: "duplicate", reason: `Duplicate target (same publication + checkpoint as row ${firstSeen + 1}).` });
      continue;
    }
    seenTargets.set(targetKey, i);

    // Metrics: overrides > mapped cells > N/A-all > unresolved
    const metrics: Record<string, number | null> = {};
    const needsResolution: string[] = [];
    let invalidMetric: string | null = null;
    for (const key of metricKeys) {
      const o = override?.metrics?.[key];
      if (o !== undefined) {
        metrics[key] = o;
        continue;
      }
      const source = config.mapping.metrics[key];
      if (source) {
        const cell = parseMetricCell(getCol(sheet.headers, raw, source));
        if (cell.kind === "number") metrics[key] = cell.value;
        else if (cell.kind === "na") metrics[key] = null;
        else if (cell.kind === "blank") needsResolution.push(key);
        else {
          invalidMetric = `${key}: ${cell.reason}`;
          break;
        }
        continue;
      }
      if (config.mapping.metricNAAll.includes(key)) {
        metrics[key] = null;
        continue;
      }
      needsResolution.push(key);
    }
    if (invalidMetric) {
      rows.push({ ...base, metrics, status: "invalid", reason: `Invalid metric value (${invalidMetric}).` });
      continue;
    }
    if (needsResolution.length > 0) {
      rows.push({ ...base, metrics, status: "needs_resolution", reason: `Unresolved metrics: ${needsResolution.join(", ")} — set a value or mark N/A.` });
      continue;
    }
    base.metrics = metrics;

    // Existing snapshot → update diff / no_change / shape conflict
    const [existing] = await db
      .select()
      .from(metricSnapshots)
      .where(
        and(
          eq(metricSnapshots.publicationId, publication.id),
          eq(metricSnapshots.checkpoint, checkpoint)
        )
      );

    if (!existing) {
      rows.push({ ...base, status: "ready_create", action: "create" });
      continue;
    }

    base.existingSnapshotId = existing.id;
    // Content fingerprint: confirm must detect if the snapshot changed
    // between preview and confirm (freshness guard).
    base.existingFingerprint = fingerprintOf({
      metrics: existing.metrics,
      capturedAt: existing.capturedAt.toISOString(),
    });
    const stored = existing.metrics as Record<string, number | null>;
    const storedKeys = Object.keys(stored).sort();
    const newKeys = Object.keys(metrics).sort();
    if (storedKeys.join(",") !== newKeys.join(",")) {
      rows.push({
        ...base,
        status: "conflict",
        reason: "Historical metric shape differs from current import schema. Use manual Edit for this snapshot.",
      });
      continue;
    }

    const diff: PreviewRow["diff"] = newKeys
      .filter((k) => stored[k] !== metrics[k])
      .map((k) => ({ key: k, from: stored[k], to: metrics[k] }));
    const capChanged =
      new Date(existing.capturedAt).getTime() !== capturedAt.getTime();
    if (capChanged) {
      diff.push({
        key: "capturedAt",
        from: new Date(existing.capturedAt).toISOString(),
        to: capturedAt.toISOString(),
      });
    }

    if (diff.length === 0) {
      rows.push({ ...base, status: "no_change", action: "skip", reason: "Identical to the stored snapshot." });
      continue;
    }
    rows.push({ ...base, status: "ready_update", action: "update", diff });
  }

  const previewFingerprint = fingerprintOf({
    fileHash: parsed.fileHash,
    sheet: sheet.name,
    platform: config.platform,
    mapping: config.mapping,
    fallbackCapturedAt: config.fallbackCapturedAt,
    rowOverrides: config.rowOverrides,
    targets: rows.map((r) => ({
      p: r.publicationId,
      c: r.checkpoint,
      e: r.existingSnapshotId,
      f: r.existingFingerprint ?? null,
    })),
  });

  return { rows, previewFingerprint, fileHash: parsed.fileHash };
}

/**
 * Confirm: re-parse the same file, rebuild the preview, verify the
 * fingerprint, then write all selected rows in ONE transaction.
 * Any drift or failure → full rollback.
 */
export async function confirmImport(
  bytes: Uint8Array,
  fileName: string,
  config: ImportConfig,
  previewFingerprint: string
) {
  const brand = await requireSingleBrand();

  const preview = await buildImportPreview(bytes, fileName, config);
  if (preview.previewFingerprint !== previewFingerprint) {
    throw new ReviewError(
      "Import preview is stale. Re-preview before confirming.",
      409
    );
  }

  const selected = preview.rows.filter(
    (r) => r.status === "ready_create" || r.status === "ready_update"
  );
  if (preview.rows.some((r) =>
    ["needs_mapping", "needs_resolution", "invalid", "duplicate", "unmatched", "ambiguous", "conflict"].includes(r.status)
  )) {
    throw new ReviewError(
      "Some rows are not ready. Resolve all rows before confirming.",
      400
    );
  }
  if (selected.length === 0) {
    throw new ReviewError("Nothing to import (all rows unchanged).", 400);
  }

  const source = parseFile(bytes, fileName).fileType;

  return db.transaction(async (tx) => {
    const results = [];
    for (const row of selected) {
      const input = {
        metrics: row.metrics!,
        capturedAt: row.capturedAt!,
      };
      if (row.action === "create") {
        results.push(
          await createSnapshotIn(
            tx,
            brand.id,
            row.publicationId!,
            row.checkpoint!,
            input,
            source
          )
        );
      } else if (row.action === "update") {
        results.push(
          await editSnapshotIn(
            tx,
            brand.id,
            row.publicationId!,
            row.checkpoint!,
            input,
            source
          )
        );
      }
    }
    return { imported: results.length, snapshots: results.map((r) => r.snapshot) };
  });
}
