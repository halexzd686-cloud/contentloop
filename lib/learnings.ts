import { eq, and, desc } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  contentPillars,
  learnings,
  tests,
} from "@/lib/db/schema";
import { requireSingleBrand } from "@/lib/brand";
import { ReviewError } from "@/lib/review";
import { computeTestResultStale } from "@/lib/tests-result";
import { getAppliedCounts } from "@/lib/learning-applications";
import { formatMetricValue } from "@/lib/metrics/engine";
import type {
  LearningSaveInput,
  LearningPatchInput,
} from "@/lib/validation/learning";

/**
 * Learning domain — M3.3.
 *
 * - evidenceSummary: deterministic SERVER-built canonical text from the
 *   concluded Test's frozen resultEvidence + outcome + conclusion.
 *   The client never submits it; AI never writes it.
 * - platform / sourceTestId / brandId are server-derived from the Test.
 * - Language: fixed English canonical template (no per-title language
 *   guessing); title and conclusion stay verbatim.
 * - sourceStale is derived at read time from the source Test's
 *   resultStale — never persisted.
 */

type TestRow = typeof tests.$inferSelect;

interface FrozenEvidence {
  primaryMetric?: { key: string; format: "count" | "percentage" | "ratio"; label: string };
  publications?: {
    role: string;
    finalTitle: string;
    pillarId: string | null;
    availability: string;
    value: number | null;
    accountBaseline?: { available: boolean; median: number | null; sampleCount: number } | null;
    pillarBaseline?: { available: boolean; median: number | null; sampleCount: number } | null;
  }[];
}

const OUTCOME_LABEL: Record<string, string> = {
  win: "Win",
  loss: "Loss",
  trade_off: "Trade-off",
  no_clear_result: "No Clear Result",
};

function fmtBaseline(
  cell: { available: boolean; median: number | null; sampleCount: number } | null | undefined,
  format: "count" | "percentage" | "ratio"
): string {
  if (!cell || !cell.available || cell.median === null) return "unavailable";
  return `${formatMetricValue(format, cell.median)} (n=${cell.sampleCount})`;
}

/** Canonical server-built evidence summary. Deterministic, test-covered. */
export function buildLearningEvidenceSummary(test: TestRow): string {
  const ev = (test.resultEvidence ?? {}) as FrozenEvidence;
  const pm = ev.primaryMetric;
  const format = pm?.format ?? "count";
  const metricLabel = pm?.label ?? test.primaryMetricKey;

  const lines: string[] = [
    `Test: ${test.title}`,
    `Platform: ${test.platform}`,
    `Checkpoint: ${test.checkpoint}`,
    `Primary metric: ${metricLabel}`,
    "",
    "Observed at conclusion:",
  ];

  for (const p of ev.publications ?? []) {
    const valueText =
      p.availability === "available"
        ? formatMetricValue(format, p.value)
        : p.availability === "awaiting"
          ? `Awaiting ${test.checkpoint} data`
          : "Metric unavailable";
    lines.push(
      `- ${p.finalTitle} (${p.role}): ${valueText}`,
      `  Account context: ${fmtBaseline(p.accountBaseline, format)}`,
      `  Pillar context: ${fmtBaseline(p.pillarBaseline, format)}`
    );
  }
  if ((ev.publications ?? []).length === 0) {
    lines.push("- (no publications recorded)");
  }

  lines.push(
    "",
    `Human outcome: ${OUTCOME_LABEL[test.outcome ?? ""] ?? test.outcome ?? "unknown"}`,
    "",
    "Human conclusion:",
    test.conclusion ?? ""
  );

  return lines.join("\n");
}

function assertConcluded(test: TestRow) {
  if (test.status !== "concluded") {
    throw new ReviewError("只能从已完成的测试创建运营经验。", 409);
  }
  if (
    !test.resultEvidence ||
    !test.resultFingerprint ||
    !test.outcome ||
    !test.conclusion ||
    !test.concludedAt
  ) {
    throw new ReviewError(
      "这个测试的结论数据不完整——缺少已保存的证据。",
      409
    );
  }
}

/** Default pillar: only when every frozen publication shares one non-null pillar. */
export function defaultPillarId(test: TestRow): string | null {
  const ev = (test.resultEvidence ?? {}) as FrozenEvidence;
  const pillars = (ev.publications ?? []).map((p) => p.pillarId ?? null);
  if (pillars.length === 0) return null;
  if (pillars.some((p) => p === null)) return null;
  const first = pillars[0];
  return pillars.every((p) => p === first) ? first : null;
}

/** Create-context: preview + saved state + derived staleness. */
export async function getLearningContext(testId: string) {
  const brand = await requireSingleBrand();
  const [test] = await db
    .select()
    .from(tests)
    .where(and(eq(tests.id, testId), eq(tests.brandId, brand.id)));
  if (!test) throw new ReviewError("测试不存在", 404);

  const [learning] = await db
    .select()
    .from(learnings)
    .where(eq(learnings.sourceTestId, test.id));

  const pillarRows = await db
    .select({ id: contentPillars.id, name: contentPillars.name })
    .from(contentPillars)
    .where(
      and(eq(contentPillars.brandId, brand.id), eq(contentPillars.isActive, true))
    );

  if (test.status !== "concluded" && !learning) {
    throw new ReviewError(
      "只能从已完成的测试创建运营经验。",
      409
    );
  }

  return {
    learning: learning ?? null,
    pillars: pillarRows,
    evidenceSummaryPreview: test.status === "concluded" ? buildLearningEvidenceSummary(test) : null,
    defaultPillarId: test.status === "concluded" ? defaultPillarId(test) : null,
    outcome: test.outcome,
    sourceStale:
      test.status === "concluded" ? await computeTestResultStale(test.id) : false,
  };
}

export async function createLearning(testId: string, input: LearningSaveInput) {
  const brand = await requireSingleBrand();

  return db.transaction(async (tx) => {
    const [test] = await tx
      .select()
      .from(tests)
      .where(and(eq(tests.id, testId), eq(tests.brandId, brand.id)));
    if (!test) throw new ReviewError("测试不存在", 404);
    assertConcluded(test);

    const [existing] = await tx
      .select({ id: learnings.id })
      .from(learnings)
      .where(eq(learnings.sourceTestId, test.id));
    if (existing) {
      throw new ReviewError("这个测试已有保存的运营经验。", 409);
    }

    let pillarId: string | null = null;
    if (input.pillarId) {
      const [pillar] = await tx
        .select()
        .from(contentPillars)
        .where(
          and(
            eq(contentPillars.id, input.pillarId),
            eq(contentPillars.brandId, brand.id)
          )
        );
      if (!pillar)
        throw new ReviewError("这个内容方向在你的工作区不存在。", 400);
      pillarId = pillar.id;
    }

    const [created] = await tx
      .insert(learnings)
      .values({
        brandId: brand.id,
        text: input.text,
        platform: test.platform,
        pillarId,
        sourceTestId: test.id,
        evidenceSummary: buildLearningEvidenceSummary(test),
      })
      .returning();

    return { learning: created };
  });
}

export async function patchLearning(id: string, input: LearningPatchInput) {
  const brand = await requireSingleBrand();
  const [learning] = await db
    .select()
    .from(learnings)
    .where(and(eq(learnings.id, id), eq(learnings.brandId, brand.id)));
  if (!learning) throw new ReviewError("经验不存在", 404);

  if (input.pillarId) {
    const [pillar] = await db
      .select()
      .from(contentPillars)
      .where(
        and(
          eq(contentPillars.id, input.pillarId),
          eq(contentPillars.brandId, brand.id)
        )
      );
    if (!pillar)
      throw new ReviewError("这个内容方向在你的工作区不存在。", 400);
  }

  const [updated] = await db
    .update(learnings)
    .set({
      ...(input.text !== undefined ? { text: input.text } : {}),
      ...(input.pillarId !== undefined ? { pillarId: input.pillarId } : {}),
      updatedAt: new Date(),
    })
    .where(eq(learnings.id, learning.id))
    .returning();

  return { learning: updated };
}

export async function listLearnings() {
  const brand = await requireSingleBrand();
  const rows = await db
    .select()
    .from(learnings)
    .where(eq(learnings.brandId, brand.id))
    .orderBy(desc(learnings.createdAt));

  if (rows.length === 0) return { learnings: [] };

  const testIds = rows.map((l) => l.sourceTestId).filter((x): x is string => !!x);
  const sourceTests = testIds.length
    ? await db
        .select({ id: tests.id, title: tests.title, outcome: tests.outcome })
        .from(tests)
    : [];
  const byId = new Map(sourceTests.map((t) => [t.id, t]));

  const pillarIds = rows.map((l) => l.pillarId).filter((x): x is string => !!x);
  const pillars = pillarIds.length
    ? await db.select({ id: contentPillars.id, name: contentPillars.name }).from(contentPillars)
    : [];
  const pillarById = new Map(pillars.map((p) => [p.id, p.name]));

  const appliedCounts = await getAppliedCounts();

  // Derived staleness per learning (never persisted).
  const staleById = new Map<string, boolean>();
  for (const l of rows) {
    if (l.sourceTestId) {
      staleById.set(l.id, await computeTestResultStale(l.sourceTestId));
    }
  }

  return {
    learnings: rows.map((l) => ({
      id: l.id,
      text: l.text,
      platform: l.platform,
      pillarId: l.pillarId,
      pillarName: l.pillarId ? (pillarById.get(l.pillarId) ?? null) : null,
      sourceTestId: l.sourceTestId,
      sourceTestTitle: l.sourceTestId ? (byId.get(l.sourceTestId)?.title ?? null) : null,
      sourceTestOutcome: l.sourceTestId ? (byId.get(l.sourceTestId)?.outcome ?? null) : null,
      sourceStale: staleById.get(l.id) ?? false,
      appliedCount: appliedCounts.get(l.id) ?? 0,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
    })),
  };
}
