import {
  buildHomeModel,
  type DueMetricItem,
  type HomeContentRow,
  type HomePublicationRow,
  type HomeTestRow,
} from "./home";

/**
 * M9 小环 — Attention read model (pure, deterministic).
 *
 * Derives entirely from buildHomeModel: same demo exclusion (isDemo
 * only), same checkpointStatus-derived due semantics, same ordering.
 * This module only projects fields and applies the panel limits;
 * total counts the uncapped queues so the badge never hides overflow.
 */

export interface AttentionModel {
  dueMetrics: DueMetricItem[];
  reviewContents: { id: string; title: string }[];
  runningTests: { id: string; title: string }[];
  total: number;
}

const DUE_LIMIT = 5;
const REVIEW_LIMIT = 5;
const TEST_LIMIT = 3;

export function buildAttentionModel(input: {
  contents: HomeContentRow[];
  publications: HomePublicationRow[];
  tests: HomeTestRow[];
}): AttentionModel {
  const home = buildHomeModel(input);
  return {
    dueMetrics: home.dueMetrics.slice(0, DUE_LIMIT),
    reviewContents: home.reviewContents
      .slice(0, REVIEW_LIMIT)
      .map((c) => ({ id: c.id, title: c.title })),
    runningTests: home.runningTests
      .slice(0, TEST_LIMIT)
      .map((t) => ({ id: t.id, title: t.title })),
    total:
      home.dueMetrics.length +
      home.reviewContents.length +
      home.runningTests.length,
  };
}
