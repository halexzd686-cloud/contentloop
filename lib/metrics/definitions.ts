import { eq, and } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  contents,
  metricDefinitions,
  metricSnapshots,
  publications,
} from "@/lib/db/schema";
import { requireSingleBrand } from "@/lib/brand";
import { ReviewError } from "@/lib/review";
import { buildCanonicalFormula } from "@/lib/metrics/engine";
import {
  generateCustomKey,
  type MetricEditInput,
  type DerivedCreateInput,
} from "@/lib/validation/metric";

/**
 * MetricDefinition domain service — M2.2.
 *
 * Frozen rules:
 * - Immutable after creation: key / platform / type / displayName.
 * - Dependency graph is ONE level: derived → raw only (same brand,
 *   same platform). No derived→derived, no cycle detection needed.
 * - Active derived requires active raw dependencies.
 * - A raw metric referenced by an ACTIVE derived metric cannot be
 *   disabled (no cascade — disable the derived first).
 * - The formula text column is regenerated server-side from the
 *   structured config; it is never user-editable, never executed.
 * - Custom derived allowed; custom raw NOT allowed. No DELETE.
 */

type MetricDef = typeof metricDefinitions.$inferSelect;

async function loadAll(brandId: string): Promise<MetricDef[]> {
  return db
    .select()
    .from(metricDefinitions)
    .where(eq(metricDefinitions.brandId, brandId));
}

export async function listMetrics() {
  const brand = await requireSingleBrand();
  const defs = await loadAll(brand.id);
  return { brandId: brand.id, definitions: defs };
}

function findDef(defs: MetricDef[], platform: string, key: string) {
  return defs.find((d) => d.platform === platform && d.key === key);
}

/** Derived deps must reference same-platform RAW definitions. */
function assertValidDeps(
  defs: MetricDef[],
  platform: string,
  numeratorKey: string,
  denominatorKey: string,
  { requireActive }: { requireActive: boolean }
) {
  for (const [label, key] of [
    ["numerator", numeratorKey],
    ["denominator", denominatorKey],
  ] as const) {
    const dep = findDef(defs, platform, key);
    if (!dep) {
      throw new ReviewError(
        `The ${label} "${key}" does not exist for platform ${platform}.`,
        400
      );
    }
    if (dep.type !== "raw") {
      throw new ReviewError(
        `Derived metrics may only reference raw metrics ("${key}" is derived).`,
        400
      );
    }
    if (requireActive && !dep.isActive) {
      throw new ReviewError(
        `The ${label} "${key}" is disabled. Enable it before using it in an active derived metric.`,
        409
      );
    }
  }
}

export async function editMetric(id: string, input: MetricEditInput) {
  const brand = await requireSingleBrand();

  const [def] = await db
    .select()
    .from(metricDefinitions)
    .where(
      and(
        eq(metricDefinitions.id, id),
        eq(metricDefinitions.brandId, brand.id)
      )
    );
  if (!def) throw new ReviewError("Metric definition not found", 404);

  const defs = await loadAll(brand.id);

  const updates: Partial<MetricDef> = { updatedAt: new Date() };
  if (input.alias !== undefined) updates.alias = input.alias || null;
  if (input.meaning !== undefined) updates.meaning = input.meaning || null;
  if (input.caution !== undefined) updates.caution = input.caution || null;

  if (def.type === "raw") {
    // Raw: format fixed to count; no formula fields.
    if (input.format !== undefined && input.format !== "count") {
      throw new ReviewError("Raw metrics always use count format.", 400);
    }
    if (input.numeratorKey !== undefined || input.denominatorKey !== undefined) {
      throw new ReviewError("Raw metrics have no formula fields.", 400);
    }
    if (input.isActive === false && def.isActive) {
      // A raw metric required by an ACTIVE derived metric cannot be disabled.
      const dependents = defs.filter(
        (d) =>
          d.type === "derived" &&
          d.isActive &&
          d.platform === def.platform &&
          (d.numeratorKey === def.key || d.denominatorKey === def.key)
      );
      if (dependents.length > 0) {
        throw new ReviewError(
          `${def.key} is required by active derived metric${
            dependents.length > 1 ? "s" : ""
          }: ${dependents
            .map((d) => d.alias ?? d.displayName)
            .join(", ")}. Disable those first.`,
          409
        );
      }
    }
    if (input.isActive !== undefined) updates.isActive = input.isActive;
  } else {
    // M2.3 post-Snapshot lock: once any real snapshot exists for this
    // brand+platform, derived semantic fields are frozen so historical
    // analytics can never be reinterpreted.
    const semanticChange =
      (input.numeratorKey !== undefined && input.numeratorKey !== def.numeratorKey) ||
      (input.denominatorKey !== undefined && input.denominatorKey !== def.denominatorKey) ||
      (input.format !== undefined && input.format !== def.format);
    if (semanticChange) {
      const [existing] = await db
        .select({ id: metricSnapshots.id })
        .from(metricSnapshots)
        .innerJoin(
          publications,
          eq(metricSnapshots.publicationId, publications.id)
        )
        .innerJoin(contents, eq(publications.contentId, contents.id))
        .where(
          and(
            eq(contents.brandId, brand.id),
            eq(publications.platform, def.platform)
          )
        )
        .limit(1);
      if (existing) {
        throw new ReviewError(
          "Historical metric data exists for this platform. Formula fields (numerator / denominator / format) are locked; alias, meaning, caution and active state remain editable.",
          409
        );
      }
    }

    // Derived: formula fields editable pre-Snapshot.
    const numeratorKey = input.numeratorKey ?? def.numeratorKey;
    const denominatorKey = input.denominatorKey ?? def.denominatorKey;
    const format = input.format ?? def.format;
    const nextActive = input.isActive ?? def.isActive;

    if (!numeratorKey || !denominatorKey) {
      throw new ReviewError(
        "Derived metrics require numerator and denominator.",
        400
      );
    }
    assertValidDeps(defs, def.platform, numeratorKey, denominatorKey, {
      requireActive: nextActive,
    });

    updates.numeratorKey = numeratorKey;
    updates.denominatorKey = denominatorKey;
    updates.format = format;
    updates.isActive = nextActive;
    // Server regenerates canonical formula text — no drift possible.
    updates.formula = buildCanonicalFormula({
      key: def.key,
      type: "derived",
      numeratorKey,
      denominatorKey,
      format,
    });
  }

  const [updated] = await db
    .update(metricDefinitions)
    .set(updates)
    .where(eq(metricDefinitions.id, def.id))
    .returning();

  return { definition: updated };
}

export async function createDerivedMetric(input: DerivedCreateInput) {
  const brand = await requireSingleBrand();
  const defs = await loadAll(brand.id);

  assertValidDeps(defs, input.platform, input.numeratorKey, input.denominatorKey, {
    requireActive: true,
  });

  const formula = buildCanonicalFormula({
    key: "",
    type: "derived",
    numeratorKey: input.numeratorKey,
    denominatorKey: input.denominatorKey,
    format: input.format,
  });

  // Server-generated stable key; one collision retry, then DB unique is
  // the final guard.
  for (let attempt = 0; attempt < 2; attempt++) {
    const key = generateCustomKey(input.displayName);
    if (findDef(defs, input.platform, key)) continue;
    try {
      const [created] = await db
        .insert(metricDefinitions)
        .values({
          brandId: brand.id,
          platform: input.platform,
          key,
          displayName: input.displayName,
          alias: input.alias || null,
          type: "derived",
          numeratorKey: input.numeratorKey,
          denominatorKey: input.denominatorKey,
          formula,
          format: input.format,
          meaning: input.meaning || null,
          caution: input.caution || null,
          isActive: true,
        })
        .returning();
      return { definition: created };
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("metric_definitions_brand_id_platform_key_unique")
      ) {
        continue;
      }
      throw error;
    }
  }
  throw new ReviewError("Could not allocate a unique metric key. Retry.", 500);
}
