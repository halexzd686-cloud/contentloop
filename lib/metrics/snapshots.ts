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
import {
  isCaptureOnTime,
  CAPTURED_AT_FUTURE_SKEW_MS,
  type Checkpoint,
  type SnapshotUpsertInput,
} from "@/lib/validation/snapshot";

/**
 * MetricSnapshot domain service — M2.3.
 *
 * Snapshot existence = explicit human submission. No auto-save, no
 * pending rows, no upsert blur: POST creates (409 if exists), PUT
 * corrects (404 if missing). source is always server-derived
 * "manual". Identity (publication / checkpoint / platform) immutable.
 *
 * Shape rules (frozen):
 * - Create: payload keys = EXACTLY the platform's currently active
 *   raw definition keys (missing/unknown/inactive/derived → 400).
 * - Edit: payload keys = EXACTLY the stored key set — later Settings
 *   changes never reshape historical snapshots.
 */

interface SnapshotContext {
  publication: typeof publications.$inferSelect;
  snapshot: typeof metricSnapshots.$inferSelect | null;
}

async function loadContext(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  publicationId: string,
  checkpoint: Checkpoint,
  brandId: string
): Promise<SnapshotContext> {
  const [publication] = await tx
    .select()
    .from(publications)
    .where(eq(publications.id, publicationId));
  if (!publication || publication.deletedAt) {
    throw new ReviewError("发布记录不存在", 404);
  }

  // Brand scope check via content.
  const [content] = await tx
    .select({ id: contents.id, brandId: contents.brandId })
    .from(contents)
    .where(
      and(
        eq(contents.id, publication.contentId),
        eq(contents.brandId, brandId),
        isNull(contents.deletedAt)
      )
    );
  if (!content) throw new ReviewError("发布记录不存在", 404);

  const [snapshot] = await tx
    .select()
    .from(metricSnapshots)
    .where(
      and(
        eq(metricSnapshots.publicationId, publicationId),
        eq(metricSnapshots.checkpoint, checkpoint)
      )
    );

  return { publication, snapshot: snapshot ?? null };
}

function toSummary(s: typeof metricSnapshots.$inferSelect) {
  return {
    id: s.id,
    publicationId: s.publicationId,
    checkpoint: s.checkpoint,
    capturedAt: s.capturedAt.toISOString(),
    metrics: s.metrics,
    source: s.source,
    createdAt: s.createdAt.toISOString(),
  };
}

function assertCapturedAtValid(publishedAt: Date, checkpoint: Checkpoint, capturedAt: Date) {
  if (capturedAt.getTime() > Date.now() + CAPTURED_AT_FUTURE_SKEW_MS) {
    throw new ReviewError("采集时间不能在未来。", 400);
  }
  if (!isCaptureOnTime(publishedAt, checkpoint, capturedAt)) {
    throw new ReviewError(
      `采集时间早于 ${checkpoint} 数据点。请在该时间之后再录入数据。`,
      409
    );
  }
}

export async function createSnapshot(
  publicationId: string,
  checkpoint: Checkpoint,
  input: SnapshotUpsertInput
) {
  const brand = await requireSingleBrand();
  return db.transaction(async (tx) =>
    createSnapshotIn(tx, brand.id, publicationId, checkpoint, input, "manual")
  );
}

/**
 * Transaction-aware core (M2.7 batch imports share one transaction).
 * Same rules as M2.3: exact current active raw keys, timing gate,
 * server-derived source.
 */
export async function createSnapshotIn(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  brandId: string,
  publicationId: string,
  checkpoint: Checkpoint,
  input: SnapshotUpsertInput,
  source: "manual" | "csv" | "xlsx"
) {
  const ctx = await loadContext(tx, publicationId, checkpoint, brandId);

  if (ctx.snapshot) {
    throw new ReviewError(
      `${checkpoint} 的指标数据已存在。请使用编辑。`,
      409
    );
  }

  // Create shape = exactly the platform's CURRENT active raw keys.
  const activeRaws = await tx
    .select({ key: metricDefinitions.key })
    .from(metricDefinitions)
    .where(
      and(
        eq(metricDefinitions.brandId, brandId),
        eq(metricDefinitions.platform, ctx.publication.platform),
        eq(metricDefinitions.type, "raw"),
        eq(metricDefinitions.isActive, true)
      )
    );
  assertExactKeySet(
    Object.keys(input.metrics),
    activeRaws.map((d) => d.key),
    "该平台当前可用的指标"
  );

  const capturedAt = new Date(input.capturedAt);
  assertCapturedAtValid(ctx.publication.publishedAt, checkpoint, capturedAt);

  const [created] = await tx
    .insert(metricSnapshots)
    .values({
      publicationId,
      checkpoint,
      capturedAt,
      metrics: input.metrics,
      source,
    })
    .returning();

  return { snapshot: toSummary(created) };
}

export async function editSnapshot(
  publicationId: string,
  checkpoint: Checkpoint,
  input: SnapshotUpsertInput
) {
  const brand = await requireSingleBrand();
  return db.transaction(async (tx) =>
    editSnapshotIn(tx, brand.id, publicationId, checkpoint, input)
  );
}

/**
 * Transaction-aware core. source: when provided (csv/xlsx import), a
 * real update also records the latest authoritative input source.
 */
export async function editSnapshotIn(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  brandId: string,
  publicationId: string,
  checkpoint: Checkpoint,
  input: SnapshotUpsertInput,
  source?: "csv" | "xlsx"
) {
  const ctx = await loadContext(tx, publicationId, checkpoint, brandId);

  if (!ctx.snapshot) {
    throw new ReviewError(
      `还没有 ${checkpoint} 的指标数据。请先录入。`,
      404
    );
  }

  // Edit shape = exactly the STORED key set (history never reshaped
  // by later Settings changes).
  const storedKeys = Object.keys(
    ctx.snapshot.metrics as Record<string, number | null>
  );
  assertExactKeySet(
    Object.keys(input.metrics),
    storedKeys,
    "之前保存的指标"
  );

  const capturedAt = new Date(input.capturedAt);
  assertCapturedAtValid(ctx.publication.publishedAt, checkpoint, capturedAt);

  const [updated] = await tx
    .update(metricSnapshots)
    .set({
      metrics: input.metrics,
      capturedAt,
      ...(source ? { source } : {}),
    })
    .where(eq(metricSnapshots.id, ctx.snapshot.id))
    .returning();

  return { snapshot: toSummary(updated) };
}

function assertExactKeySet(actual: string[], expected: string[], label: string) {
  const missing = expected.filter((k) => !actual.includes(k));
  const extra = actual.filter((k) => !expected.includes(k));
  if (missing.length > 0 || extra.length > 0) {
    const parts: string[] = [];
    if (missing.length > 0) parts.push(`缺少：${missing.join(", ")}`);
    if (extra.length > 0) parts.push(`多余：${extra.join(", ")}`);
    throw new ReviewError(
      `提交的指标必须与${label}完全一致——${parts.join("；")}。`,
      400
    );
  }
}
