import { eq, and, isNull, desc, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  contents,
  metricDefinitions,
  metricSnapshots,
  publications,
  testPublications,
  tests,
} from "@/lib/db/schema";
import { requireSingleBrand } from "@/lib/brand";
import { ReviewError } from "@/lib/review";
import type {
  CreateTestInput,
  PatchTestInput,
} from "@/lib/validation/test";

/**
 * Test domain service — M3.1 Test Core.
 *
 * - Create = the modal IS the review gate; INSERT lands status=running
 *   (schema has no draft; client never submits status).
 * - Core definition (platform / checkpoint / method / hypothesis /
 *   change / primaryMetricKey) is locked at create — you never edit the
 *   question after seeing answers.
 * - Running: title / keepConsistent / compareWith editable; attach and
 *   detach publications. Concluded: everything locked.
 * - Eligibility: same Brand + same Platform + real Publication. A
 *   publication WITHOUT the checkpoint snapshot may attach ("Awaiting
 *   data" is legitimate membership).
 * - Metric resolution: active definition at create; existing tests keep
 *   resolving even if the definition is later disabled.
 */

export async function listTests() {
  const brand = await requireSingleBrand();
  const rows = await db
    .select()
    .from(tests)
    .where(eq(tests.brandId, brand.id))
    .orderBy(desc(tests.createdAt));

  if (rows.length === 0) return { tests: [] };

  const links = await db
    .select()
    .from(testPublications)
    .where(
      inArraySafe(rows.map((t) => t.id))
    );

  const byTest = new Map<string, typeof links>();
  for (const l of links) {
    byTest.set(l.testId, [...(byTest.get(l.testId) ?? []), l]);
  }

  return {
    tests: rows.map((t) => ({
      ...t,
      publicationCount: (byTest.get(t.id) ?? []).length,
    })),
  };
}

function inArraySafe(ids: string[]) {
  return ids.length === 0
    ? eq(testPublications.testId, "00000000-0000-0000-0000-000000000000")
    : inArray(testPublications.testId, ids);
}

export async function getTest(id: string) {
  const brand = await requireSingleBrand();
  const [test] = await db
    .select()
    .from(tests)
    .where(and(eq(tests.id, id), eq(tests.brandId, brand.id)));
  if (!test) throw new ReviewError("Test not found", 404);

  const links = await db
    .select({
      id: testPublications.id,
      publicationId: testPublications.publicationId,
      role: testPublications.role,
      finalTitle: publications.finalTitle,
      publishedAt: publications.publishedAt,
    })
    .from(testPublications)
    .innerJoin(
      publications,
      eq(testPublications.publicationId, publications.id)
    )
    .where(eq(testPublications.testId, test.id));

  // Checkpoint data availability per attached publication (display only —
  // missing snapshot never blocks membership).
  const withData = await Promise.all(
    links.map(async (l) => {
      const [snap] = await db
        .select({ id: metricSnapshots.id })
        .from(metricSnapshots)
        .where(
          and(
            eq(metricSnapshots.publicationId, l.publicationId),
            eq(metricSnapshots.checkpoint, test.checkpoint)
          )
        );
      return { ...l, hasCheckpointData: !!snap };
    })
  );

  return { test, publications: withData };
}

async function loadTest(id: string, brandId: string) {
  const [test] = await db
    .select()
    .from(tests)
    .where(and(eq(tests.id, id), eq(tests.brandId, brandId)));
  if (!test) throw new ReviewError("Test not found", 404);
  return test;
}

export async function createTest(input: CreateTestInput) {
  const brand = await requireSingleBrand();

  // Primary metric must resolve to an ACTIVE definition on this
  // brand+platform (raw or derived both allowed).
  const [def] = await db
    .select()
    .from(metricDefinitions)
    .where(
      and(
        eq(metricDefinitions.brandId, brand.id),
        eq(metricDefinitions.platform, input.platform),
        eq(metricDefinitions.key, input.primaryMetricKey)
      )
    );
  if (!def) {
    throw new ReviewError(
      `Metric "${input.primaryMetricKey}" does not exist for ${input.platform}.`,
      400
    );
  }
  if (!def.isActive) {
    throw new ReviewError(
      `Metric "${input.primaryMetricKey}" is disabled for ${input.platform}.`,
      400
    );
  }

  const [created] = await db
    .insert(tests)
    .values({
      brandId: brand.id,
      title: input.title,
      hypothesis: input.hypothesis,
      change: input.change,
      primaryMetricKey: input.primaryMetricKey,
      keepConsistent: input.keepConsistent || null,
      compareWith: input.compareWith || null,
      method: input.method,
      platform: input.platform,
      checkpoint: input.checkpoint,
      status: "running",
    })
    .returning();

  return { test: created };
}

export async function patchTest(id: string, input: PatchTestInput) {
  const brand = await requireSingleBrand();
  const test = await loadTest(id, brand.id);
  if (test.status !== "running") {
    throw new ReviewError("Concluded tests cannot be edited.", 409);
  }

  const [updated] = await db
    .update(tests)
    .set({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.keepConsistent !== undefined
        ? { keepConsistent: input.keepConsistent || null }
        : {}),
      ...(input.compareWith !== undefined
        ? { compareWith: input.compareWith || null }
        : {}),
    })
    .where(eq(tests.id, test.id))
    .returning();

  return { test: updated };
}

export async function attachPublication(
  testId: string,
  publicationId: string,
  role: "control" | "variant" | "comparison"
) {
  const brand = await requireSingleBrand();

  return db.transaction(async (tx) => {
    const [test] = await tx
      .select()
      .from(tests)
      .where(and(eq(tests.id, testId), eq(tests.brandId, brand.id)));
    if (!test) throw new ReviewError("Test not found", 404);
    if (test.status !== "running") {
      throw new ReviewError("Concluded tests cannot change membership.", 409);
    }

    const [pub] = await tx
      .select({
        id: publications.id,
        platform: publications.platform,
        contentId: publications.contentId,
      })
      .from(publications)
      .where(
        and(eq(publications.id, publicationId), isNull(publications.deletedAt))
      );
    if (!pub) throw new ReviewError("Publication not found", 404);
    if (pub.platform !== test.platform) {
      throw new ReviewError(
        `Publication platform (${pub.platform}) does not match the test platform (${test.platform}).`,
        409
      );
    }

    const [content] = await tx
      .select({ id: contents.id })
      .from(contents)
      .where(
        and(
          eq(contents.id, pub.contentId),
          eq(contents.brandId, brand.id),
          isNull(contents.deletedAt)
        )
      );
    if (!content) throw new ReviewError("Publication not found", 404);

    try {
      const [link] = await tx
        .insert(testPublications)
        .values({ testId, publicationId, role })
        .returning();
      return { link };
    } catch (error) {
      // Drizzle wraps driver errors — the pg error lives in .cause.
      const pgErr = (error as { cause?: { code?: string; constraint_name?: string } })
        .cause ?? (error as { code?: string; constraint_name?: string });
      if (
        pgErr.code === "23505" ||
        pgErr.constraint_name === "test_publications_test_id_publication_id_unique"
      ) {
        throw new ReviewError(
          "This publication is already attached to the test.",
          409
        );
      }
      throw error;
    }
  });
}

export async function detachPublication(testId: string, publicationId: string) {
  const brand = await requireSingleBrand();

  return db.transaction(async (tx) => {
    const [test] = await tx
      .select()
      .from(tests)
      .where(and(eq(tests.id, testId), eq(tests.brandId, brand.id)));
    if (!test) throw new ReviewError("Test not found", 404);
    if (test.status !== "running") {
      throw new ReviewError("Concluded tests cannot change membership.", 409);
    }

    await tx
      .delete(testPublications)
      .where(
        and(
          eq(testPublications.testId, testId),
          eq(testPublications.publicationId, publicationId)
        )
      );
    return { ok: true };
  });
}
