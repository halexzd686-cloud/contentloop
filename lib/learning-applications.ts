import { eq, and, isNull, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  contents,
  contentPillars,
  learningApplications,
  learnings,
  tests,
} from "@/lib/db/schema";
import { requireSingleBrand } from "@/lib/brand";
import { ReviewError } from "@/lib/review";
import { computeTestResultStale } from "@/lib/tests-result";
import {
  isScopeEligible,
  candidateRank,
  type LearningAction,
} from "@/lib/validation/learning-application";

/**
 * LearningApplication domain — M3.4.
 *
 * Apply/Dismiss writes ONLY learning_applications. Never mutates
 * Content / Brief / Master / Versions / Tests / Learnings / Playbooks.
 *
 * - Eligibility gates NEW relations and dismissed→applied reactivation
 * - Existing relations are provenance: they survive later scope
 *   changes / publish (derived scopeMismatch, never deleted)
 * - published: read-only; no new application, no transition
 * - applied_at physical column = decisionAt (legacy name)
 */

interface ContentScope {
  id: string;
  status: string;
  platform: string | null;
  pillarId: string | null;
}

interface LearningScope {
  id: string;
  platform: string | null;
  pillarId: string | null;
}

async function loadContentScope(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  contentId: string,
  brandId: string
): Promise<ContentScope> {
  const [content] = await tx
    .select()
    .from(contents)
    .where(
      and(
        eq(contents.id, contentId),
        eq(contents.brandId, brandId),
        isNull(contents.deletedAt)
      )
    );
  if (!content) throw new ReviewError("Content not found", 404);

  // M4.1: Content.primaryPlatform is the authority. Signal's value is
  // only create-time provenance, never re-read.
  return {
    id: content.id,
    status: content.status,
    platform: content.primaryPlatform,
    pillarId: content.pillarId,
  };
}

async function loadLearningScope(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  learningId: string,
  brandId: string
): Promise<LearningScope> {
  const [learning] = await tx
    .select()
    .from(learnings)
    .where(and(eq(learnings.id, learningId), eq(learnings.brandId, brandId)));
  if (!learning) throw new ReviewError("Learning not found", 404);
  return {
    id: learning.id,
    platform: learning.platform,
    pillarId: learning.pillarId,
  };
}

export async function applyAction(
  contentId: string,
  learningId: string,
  action: LearningAction
) {
  const brand = await requireSingleBrand();

  return db.transaction(async (tx) => {
    const content = await loadContentScope(tx, contentId, brand.id);
    const learning = await loadLearningScope(tx, learningId, brand.id);

    if (!isScopeEligible(learning, content)) {
      throw new ReviewError(
        "This learning does not match the content's current scope.",
        409
      );
    }

    const [existing] = await tx
      .select()
      .from(learningApplications)
      .where(
        and(
          eq(learningApplications.learningId, learningId),
          eq(learningApplications.contentId, contentId)
        )
      );
    if (existing) {
      throw new ReviewError(
        "A relation already exists for this learning and content — update its action instead.",
        409
      );
    }

    const [row] = await tx
      .insert(learningApplications)
      .values({
        learningId,
        contentId,
        action,
        appliedAt: new Date(), // physical column; domain semantics = decisionAt
      })
      .returning();

    return { application: row };
  });
}

export async function transitionAction(
  applicationId: string,
  action: LearningAction
) {
  const brand = await requireSingleBrand();

  return db.transaction(async (tx) => {
    const [app] = await tx
      .select()
      .from(learningApplications)
      .where(eq(learningApplications.id, applicationId));
    if (!app) throw new ReviewError("Application not found", 404);

    const content = await loadContentScope(tx, app.contentId, brand.id);
    if (app.action === action) {
      throw new ReviewError(
        `Application is already ${action}.`,
        409
      );
    }
    if (content.status === "published") {
      throw new ReviewError(
        "Published content applications are read-only.",
        409
      );
    }

    if (action === "applied") {
      // Reactivation must re-pass CURRENT eligibility.
      const learning = await loadLearningScope(tx, app.learningId, brand.id);
      if (!isScopeEligible(learning, content)) {
        throw new ReviewError(
          "This learning no longer matches the content's current scope.",
          409
        );
      }
    }
    // applied → dismissed is always allowed on non-published content,
    // even with a scope mismatch (humans must be able to stop applying).

    const [row] = await tx
      .update(learningApplications)
      .set({ action, appliedAt: new Date() })
      .where(eq(learningApplications.id, app.id))
      .returning();

    return { application: row };
  });
}

// ─── Read model ────────────────────────────────────────

export interface ApplicationItem {
  applicationId: string | null;
  learningId: string;
  action: LearningAction | null;
  text: string;
  platform: string | null;
  pillarId: string | null;
  pillarName: string | null;
  evidenceSummary: string | null;
  sourceTestTitle: string | null;
  sourceTestOutcome: string | null;
  sourceStale: boolean;
  scopeMismatch: boolean;
  createdAt: string;
  decisionAt: string | null;
}

export async function getApplicationsForContent(contentId: string) {
  const brand = await requireSingleBrand();

  const content = await db
    .select()
    .from(contents)
    .where(
      and(
        eq(contents.id, contentId),
        eq(contents.brandId, brand.id),
        isNull(contents.deletedAt)
      )
    )
    .then((r) => r[0]);
  if (!content) throw new ReviewError("Content not found", 404);

  const scope: ContentScope = {
    id: content.id,
    status: content.status,
    platform: content.primaryPlatform,
    pillarId: content.pillarId,
  };

  const relations = await db
    .select()
    .from(learningApplications)
    .where(eq(learningApplications.contentId, contentId));

  const allLearnings = await db
    .select()
    .from(learnings)
    .where(eq(learnings.brandId, brand.id));

  const testIds = allLearnings
    .map((l) => l.sourceTestId)
    .filter((x): x is string => !!x);
  const sourceTests = testIds.length
    ? await db
        .select({ id: tests.id, title: tests.title, outcome: tests.outcome })
        .from(tests)
        .where(inArray(tests.id, testIds))
    : [];
  const testById = new Map(sourceTests.map((t) => [t.id, t]));

  const pillarIds = allLearnings
    .map((l) => l.pillarId)
    .filter((x): x is string => !!x);
  const pillarRows = pillarIds.length
    ? await db
        .select({ id: contentPillars.id, name: contentPillars.name })
        .from(contentPillars)
        .where(inArray(contentPillars.id, pillarIds))
    : [];
  const pillarById = new Map(pillarRows.map((p) => [p.id, p.name]));

  const relByLearning = new Map(relations.map((r) => [r.learningId, r]));

  // Derived staleness per distinct source test (cached per call).
  const staleCache = new Map<string, boolean>();
  async function sourceStale(sourceTestId: string | null): Promise<boolean> {
    if (!sourceTestId) return false;
    if (!staleCache.has(sourceTestId)) {
      staleCache.set(sourceTestId, await computeTestResultStale(sourceTestId));
    }
    return staleCache.get(sourceTestId)!;
  }

  async function toItem(
    l: typeof allLearnings[number],
    rel: typeof relations[number] | null,
    scopeMismatch: boolean
  ): Promise<ApplicationItem> {
    const st = await sourceStale(l.sourceTestId);
    const sourceTest = l.sourceTestId ? testById.get(l.sourceTestId) : undefined;
    return {
      applicationId: rel?.id ?? null,
      learningId: l.id,
      action: (rel?.action as LearningAction | undefined) ?? null,
      text: l.text,
      platform: l.platform,
      pillarId: l.pillarId,
      pillarName: l.pillarId ? (pillarById.get(l.pillarId) ?? null) : null,
      evidenceSummary: l.evidenceSummary,
      sourceTestTitle: sourceTest?.title ?? null,
      sourceTestOutcome: sourceTest?.outcome ?? null,
      sourceStale: st,
      scopeMismatch,
      createdAt: l.createdAt.toISOString(),
      decisionAt: rel ? rel.appliedAt.toISOString() : null,
    };
  }

  const applied: ApplicationItem[] = [];
  const dismissed: ApplicationItem[] = [];
  const available: ApplicationItem[] = [];

  const eligibleNew = scope.status !== "published";
  const learningsByRank = [...allLearnings].sort((a, b) => {
    const ra = candidateRank(a.platform, a.pillarId);
    const rb = candidateRank(b.platform, b.pillarId);
    if (ra !== rb) return ra - rb;
    const t = b.createdAt.getTime() - a.createdAt.getTime();
    if (t !== 0) return t;
    return a.id.localeCompare(b.id);
  });

  for (const l of learningsByRank) {
    const rel = relByLearning.get(l.id) ?? null;
    if (rel) {
      const mismatch = !isScopeEligible(
        { platform: l.platform, pillarId: l.pillarId },
        scope
      );
      const item = await toItem(l, rel, mismatch);
      if (rel.action === "applied") applied.push(item);
      else dismissed.push(item);
    } else if (
      eligibleNew &&
      isScopeEligible({ platform: l.platform, pillarId: l.pillarId }, scope)
    ) {
      available.push(await toItem(l, null, false));
    }
  }

  return { applied, dismissed, available };
}

/** Applied-only relation count for Analytics cards (dismissed excluded). */
export async function getAppliedCounts(): Promise<Map<string, number>> {
  const rows = await db
    .select({ learningId: learningApplications.learningId })
    .from(learningApplications)
    .where(eq(learningApplications.action, "applied"));
  const counts = new Map<string, number>();
  for (const r of rows) {
    counts.set(r.learningId, (counts.get(r.learningId) ?? 0) + 1);
  }
  return counts;
}
