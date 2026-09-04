/**
 * M4.2 — Home read model (pure, deterministic, zero AI).
 *
 * Composes the three existing authoritative read models
 * (contents / analytics index / tests) into work-intent sections:
 *   Needs Attention → Continue Working → Monitoring.
 *
 * No domain logic is re-implemented here: checkpoint status and dueAt
 * come from the analytics index (checkpointStatus/checkpointDueAt at
 * the read layer); Home only filters, sorts and limits. No "overdue"
 * concept (M2: no arbitrary overdue threshold). Demo exclusion uses
 * Content.isDemo only — never title heuristics. Tests have no demo
 * authority, so running tests are shown as-is.
 */

export interface HomeContentRow {
  id: string;
  title: string;
  status: string;
  isDemo: boolean;
  updatedAt: string;
}

export interface HomePublicationRow {
  contentId: string;
  contentTitle: string;
  publicationId: string;
  finalTitle: string;
  platform: string;
  isDemo: boolean;
  checkpoints: { checkpoint: string; status: string; dueAt: string }[];
}

export interface HomeTestRow {
  id: string;
  title: string;
  status: string;
  createdAt: string;
}

export interface DueMetricItem {
  publicationId: string;
  finalTitle: string;
  platform: string;
  checkpoint: string;
  dueAt: string;
}

export interface HomeModel {
  dueMetrics: DueMetricItem[];
  reviewContents: HomeContentRow[];
  continueWorking: HomeContentRow[];
  scheduledContents: HomeContentRow[];
  runningTests: HomeTestRow[];
  /** No operational rows at all (regardless of demo filtering). */
  isEmpty: boolean;
}

const CONTINUE_LIMIT = 5;
const SCHEDULED_LIMIT = 5;
const TEST_LIMIT = 3;

function byUpdatedAtDesc(a: HomeContentRow, b: HomeContentRow) {
  const d = b.updatedAt.localeCompare(a.updatedAt);
  return d !== 0 ? d : a.id.localeCompare(b.id);
}

export function buildHomeModel(input: {
  contents: HomeContentRow[];
  publications: HomePublicationRow[];
  tests: HomeTestRow[];
}): HomeModel {
  const { contents, publications, tests } = input;

  const dueMetrics: DueMetricItem[] = publications
    .filter((p) => !p.isDemo)
    .flatMap((p) =>
      p.checkpoints
        .filter((c) => c.status === "due")
        .map((c) => ({
          publicationId: p.publicationId,
          finalTitle: p.finalTitle,
          platform: p.platform,
          checkpoint: c.checkpoint,
          dueAt: c.dueAt,
        }))
    )
    .sort(
      (a, b) =>
        a.dueAt.localeCompare(b.dueAt) ||
        a.publicationId.localeCompare(b.publicationId)
    );

  const active = contents.filter((c) => !c.isDemo);

  const reviewContents = active
    .filter((c) => c.status === "review")
    .sort(byUpdatedAtDesc);

  const continueWorking = active
    .filter((c) => c.status === "planning" || c.status === "in_progress")
    .sort(byUpdatedAtDesc)
    .slice(0, CONTINUE_LIMIT);

  const scheduledContents = active
    .filter((c) => c.status === "scheduled")
    .sort(byUpdatedAtDesc)
    .slice(0, SCHEDULED_LIMIT);

  const runningTests = tests
    .filter((t) => t.status === "running")
    .sort(
      (a, b) =>
        b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id)
    )
    .slice(0, TEST_LIMIT);

  return {
    dueMetrics,
    reviewContents,
    continueWorking,
    scheduledContents,
    runningTests,
    isEmpty:
      contents.length === 0 &&
      publications.length === 0 &&
      tests.length === 0,
  };
}
