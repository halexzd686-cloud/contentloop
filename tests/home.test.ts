import { describe, it, expect } from "vitest";

import {
  buildHomeModel,
  type HomeContentRow,
  type HomePublicationRow,
  type HomeTestRow,
} from "@/lib/home";

/**
 * M4.2 — Home read model tests.
 *
 * Home only filters/sorts/limits the three existing authoritative
 * read models. Checkpoint status + dueAt are computed at the
 * analytics read layer (checkpointStatus/checkpointDueAt) — these
 * tests assert Home never recomputes or reinterprets them, never
 * introduces "overdue", and excludes demo work via isDemo only.
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

const DUE_24 = { checkpoint: "24h", status: "due", dueAt: "2026-09-01T08:00:00.000Z" };
const NOT_DUE_72 = { checkpoint: "72h", status: "not_due", dueAt: "2026-09-03T08:00:00.000Z" };

describe("buildHomeModel", () => {
  it("empty database → isEmpty, all sections empty", () => {
    const m = buildHomeModel({ contents: [], publications: [], tests: [] });
    expect(m.isEmpty).toBe(true);
    expect(m.dueMetrics).toEqual([]);
    expect(m.continueWorking).toEqual([]);
    expect(m.runningTests).toEqual([]);
  });

  it("not empty when only demo content exists", () => {
    const m = buildHomeModel({
      contents: [content({ isDemo: true })],
      publications: [],
      tests: [],
    });
    expect(m.isEmpty).toBe(false); // rows exist; sections just filter them
    expect(m.continueWorking).toEqual([]);
  });

  it("due checkpoints become due metrics; submitted/not_due do not", () => {
    const m = buildHomeModel({
      contents: [],
      publications: [
        pub({
          checkpoints: [
            DUE_24,
            NOT_DUE_72,
            { checkpoint: "24h", status: "submitted", dueAt: DUE_24.dueAt },
          ],
        }),
      ],
      tests: [],
    });
    expect(m.dueMetrics).toHaveLength(1);
    expect(m.dueMetrics[0].checkpoint).toBe("24h");
    // no "overdue" reinterpretation — Home passes status/dueAt through
    expect(m.dueMetrics[0].dueAt).toBe(DUE_24.dueAt);
  });

  it("due metrics sort by dueAt ASC (oldest due first), id tie-break", () => {
    const older = pub({ publicationId: "b", checkpoints: [{ ...DUE_24, dueAt: "2026-08-30T08:00:00.000Z" }] });
    const newer = pub({ publicationId: "a", checkpoints: [DUE_24] });
    const m = buildHomeModel({ contents: [], publications: [newer, older], tests: [] });
    expect(m.dueMetrics.map((d) => d.dueAt)).toEqual([
      "2026-08-30T08:00:00.000Z",
      DUE_24.dueAt,
    ]);
  });

  it("demo publications never become operational work", () => {
    const m = buildHomeModel({
      contents: [],
      publications: [pub({ isDemo: true, checkpoints: [DUE_24] })],
      tests: [],
    });
    expect(m.dueMetrics).toEqual([]);
  });

  it("review content lands in Needs Attention; planning/in_progress in Continue Working", () => {
    const m = buildHomeModel({
      contents: [
        content({ id: "r1", status: "review" }),
        content({ id: "p1", status: "planning" }),
        content({ id: "w1", status: "in_progress" }),
      ],
      publications: [],
      tests: [],
    });
    expect(m.reviewContents.map((c) => c.id)).toEqual(["r1"]);
    expect(m.continueWorking.map((c) => c.id).sort()).toEqual(["p1", "w1"]);
  });

  it("scheduled content is Monitoring, never Continue Working", () => {
    const m = buildHomeModel({
      contents: [content({ id: "s1", status: "scheduled" })],
      publications: [],
      tests: [],
    });
    expect(m.continueWorking).toEqual([]);
    expect(m.scheduledContents.map((c) => c.id)).toEqual(["s1"]);
  });

  it("demo content is excluded from every content section", () => {
    const m = buildHomeModel({
      contents: [
        content({ id: "d1", status: "review", isDemo: true }),
        content({ id: "d2", status: "planning", isDemo: true }),
        content({ id: "d3", status: "scheduled", isDemo: true }),
      ],
      publications: [],
      tests: [],
    });
    expect(m.reviewContents).toEqual([]);
    expect(m.continueWorking).toEqual([]);
    expect(m.scheduledContents).toEqual([]);
  });

  it("continueWorking: updatedAt DESC, max 5", () => {
    const contents = Array.from({ length: 7 }, (_, i) =>
      content({ id: `c${i}`, updatedAt: `2026-09-0${i + 1}T00:00:00.000Z` })
    );
    const m = buildHomeModel({ contents, publications: [], tests: [] });
    expect(m.continueWorking).toHaveLength(5);
    expect(m.continueWorking[0].id).toBe("c6");
    expect(m.continueWorking[4].id).toBe("c2");
  });

  it("running tests only, createdAt DESC, max 3; concluded excluded", () => {
    const tests = [
      test({ id: "t1", createdAt: "2026-09-01T00:00:00.000Z" }),
      test({ id: "t2", createdAt: "2026-09-03T00:00:00.000Z" }),
      test({ id: "t3", createdAt: "2026-09-02T00:00:00.000Z" }),
      test({ id: "t4", createdAt: "2026-09-04T00:00:00.000Z" }),
      test({ id: "t5", status: "concluded", createdAt: "2026-09-05T00:00:00.000Z" }),
    ];
    const m = buildHomeModel({ contents: [], publications: [], tests });
    expect(m.runningTests.map((t) => t.id)).toEqual(["t4", "t2", "t3"]);
  });

  it("deterministic: same input → identical output", () => {
    const input = {
      contents: [
        content({ id: "a", status: "review", updatedAt: "2026-09-01T00:00:00.000Z" }),
        content({ id: "b", status: "review", updatedAt: "2026-09-01T00:00:00.000Z" }),
      ],
      publications: [pub({ publicationId: "p1", checkpoints: [DUE_24] })],
      tests: [test({ id: "t1" })],
    };
    expect(buildHomeModel(input)).toEqual(buildHomeModel(input));
    // tie-break by id for identical timestamps
    const m = buildHomeModel(input);
    expect(m.reviewContents.map((c) => c.id)).toEqual(["a", "b"]);
  });
});
