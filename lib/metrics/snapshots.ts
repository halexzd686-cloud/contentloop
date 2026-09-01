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
    throw new ReviewError("Publication not found", 404);
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
  if (!content) throw new ReviewError("Publication not found", 404);

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
    throw new ReviewError("capturedAt cannot be in the future.", 400);
  }
  if (!isCaptureOnTime(publishedAt, checkpoint, capturedAt)) {
    throw new ReviewError(
      `capturedAt is before the ${checkpoint} checkpoint target. The observation must happen at or after the checkpoint time.`,
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

  return db.transaction(async (tx) => {
    const ctx = await loadContext(tx, publicationId, checkpoint, brand.id);

    if (ctx.snapshot) {
      throw new ReviewError(
        `A ${checkpoint} snapshot already exists. Edit it instead.`,
        409
      );
    }

    // Create shape = exactly the platform's CURRENT active raw keys.
    const activeRaws = await tx
      .select({ key: metricDefinitions.key })
      .from(metricDefinitions)
      .where(
        and(
          eq(metricDefinitions.brandId, brand.id),
          eq(metricDefinitions.platform, ctx.publication.platform),
          eq(metricDefinitions.type, "raw"),
          eq(metricDefinitions.isActive, true)
        )
      );
    assertExactKeySet(
      Object.keys(input.metrics),
      activeRaws.map((d) => d.key),
      "current active raw metrics"
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
        source: "manual",
      })
      .returning();

    return { snapshot: toSummary(created) };
  });
}

export async function editSnapshot(
  publicationId: string,
  checkpoint: Checkpoint,
  input: SnapshotUpsertInput
) {
  const brand = await requireSingleBrand();

  return db.transaction(async (tx) => {
    const ctx = await loadContext(tx, publicationId, checkpoint, brand.id);

    if (!ctx.snapshot) {
      throw new ReviewError(
        `No ${checkpoint} snapshot exists yet. Create it first.`,
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
      "the stored snapshot metrics"
    );

    const capturedAt = new Date(input.capturedAt);
    assertCapturedAtValid(ctx.publication.publishedAt, checkpoint, capturedAt);

    const [updated] = await tx
      .update(metricSnapshots)
      .set({ metrics: input.metrics, capturedAt })
      .where(eq(metricSnapshots.id, ctx.snapshot.id))
      .returning();

    return { snapshot: toSummary(updated) };
  });
}

function assertExactKeySet(actual: string[], expected: string[], label: string) {
  const missing = expected.filter((k) => !actual.includes(k));
  const extra = actual.filter((k) => !expected.includes(k));
  if (missing.length > 0 || extra.length > 0) {
    const parts: string[] = [];
    if (missing.length > 0) parts.push(`missing: ${missing.join(", ")}`);
    if (extra.length > 0) parts.push(`unexpected: ${extra.join(", ")}`);
    throw new ReviewError(
      `Metrics must exactly cover ${label} (${parts.join("; ")}).`,
      400
    );
  }
}
