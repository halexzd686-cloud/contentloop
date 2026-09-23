import { describe, it, expect } from "vitest";

import { buildAttentionModel } from "@/lib/attention";
import type {
  HomeContentRow,
  HomePublicationRow,
  HomeTestRow,
} from "@/lib/home";

/**
 * M9 小环 — attention read model tests.
 *
 * buildAttentionModel derives from buildHomeModel: these tests pin the
 * projection contract — demo exclusion (isDemo only), due-status
 * passthrough (never recomputed here), panel limits, and a total that
 * counts the UNCAPPED queues so the badge never hides overflow.
 */

function content(over: Partial<HomeContentRow>): HomeContentRow {
  return {
    id: over.id ?? Math.random().toString(36).slice(2),
    title: "c",
    status: "planning",
    isDemo: false,
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...over,
  };
}

function pub(over: Partial<HomePublicationRow>): HomePublicationRow {
  return {
    contentId: "c1",
    contentTitle: "c",
    publicationId: over.publicationId ?? Math.random().toString(36).slice(2),
    finalTitle: "p",
    platform: "xiaohongshu",
    isDemo: false,
    checkpoints: [],
    ...over,
  };
}

function test(over: Partial<HomeTestRow>): HomeTestRow {
  return {
    id: over.id ?? Math.random().toString(36).slice(2),
    title: "t",
    status: "running",
    createdAt: "2026-09-01T00:00:00.000Z",
    ...over,
  };
}

const DUE_24 = {
  checkpoint: "24h",
  status: "due",
  dueAt: "2026-09-01T08:00:00.000Z",
};
const DONE_72 = {
  checkpoint: "72h",
  status: "submitted",
  dueAt: "2026-09-03T08:00:00.000Z",
};

describe("buildAttentionModel", () => {
  it("empty database → total 0, all groups empty", () => {
    const m = buildAttentionModel({ contents: [], publications: [], tests: [] });
    expect(m).toEqual({
      dueMetrics: [],
      reviewContents: [],
      runningTests: [],
      total: 0,
    });
  });

  it("demo work is excluded everywhere (isDemo only)", () => {
    const m = buildAttentionModel({
      contents: [
        content({ status: "review", isDemo: true }),
        content({ id: "real-1", status: "review" }),
      ],
      publications: [
        pub({ isDemo: true, checkpoints: [DUE_24] }),
        pub({ publicationId: "real-pub", checkpoints: [DUE_24] }),
      ],
      tests: [],
    });
    expect(m.reviewContents).toEqual([{ id: "real-1", title: "c" }]);
    expect(m.dueMetrics.map((d) => d.publicationId)).toEqual(["real-pub"]);
    expect(m.total).toBe(2);
  });

  it("only status=due becomes a due metric; payload fields pass through", () => {
    const m = buildAttentionModel({
      contents: [],
      publications: [
        pub({
          publicationId: "p1",
          finalTitle: "真实标题",
          platform: "bilibili",
          checkpoints: [DUE_24, DONE_72],
        }),
      ],
      tests: [],
    });
    expect(m.dueMetrics).toEqual([
      {
        publicationId: "p1",
        finalTitle: "真实标题",
        platform: "bilibili",
        checkpoint: "24h",
        dueAt: "2026-09-01T08:00:00.000Z",
      },
    ]);
    expect(m.total).toBe(1);
  });

  it("concluded (non-running) tests never appear", () => {
    const m = buildAttentionModel({
      contents: [],
      publications: [],
      tests: [test({ id: "t1", status: "concluded" }), test({ id: "t2" })],
    });
    expect(m.runningTests).toEqual([{ id: "t2", title: "t" }]);
    expect(m.total).toBe(1);
  });

  it("panel limits cap the lists but total counts the full queues", () => {
    const m = buildAttentionModel({
      contents: Array.from({ length: 7 }, (_, i) =>
        content({
          id: `c${i}`,
          status: "review",
          updatedAt: `2026-09-0${(i % 9) + 1}T00:00:00.000Z`,
        })
      ),
      publications: Array.from({ length: 6 }, (_, i) =>
        pub({ publicationId: `p${i}`, checkpoints: [DUE_24] })
      ),
      tests: Array.from({ length: 5 }, (_, i) =>
        test({ id: `t${i}`, createdAt: `2026-09-0${(i % 9) + 1}T00:00:00.000Z` })
      ),
    });
    expect(m.dueMetrics).toHaveLength(5);
    expect(m.reviewContents).toHaveLength(5);
    expect(m.runningTests).toHaveLength(3);
    // badge counts the uncapped queues (running tests are capped at the
    // Home read model's own limit of 3 — same source, no drift)
    expect(m.total).toBe(6 + 7 + 3);
  });

  it("panel rows project to {id, title} only", () => {
    const m = buildAttentionModel({
      contents: [content({ id: "c9", status: "review", title: "审核我" })],
      publications: [],
      tests: [test({ id: "t9", title: "测试我" })],
    });
    expect(m.reviewContents[0]).toEqual({ id: "c9", title: "审核我" });
    expect(m.runningTests[0]).toEqual({ id: "t9", title: "测试我" });
    expect(Object.keys(m.reviewContents[0]).sort()).toEqual(["id", "title"]);
    expect(Object.keys(m.runningTests[0]).sort()).toEqual(["id", "title"]);
  });
});
