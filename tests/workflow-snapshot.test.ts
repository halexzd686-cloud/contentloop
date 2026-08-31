import { describe, it, expect } from "vitest";

import {
  isLatestWorkflowRevision,
  applyVersionsSnapshot,
  type WorkflowSnapshot,
} from "@/lib/workflow-snapshot";

/**
 * M1.6 workflow state-sync — snapshot application + stale guard.
 * Domain DB behavior is covered by the Supabase smoke test; these lock
 * the client-side pure rules that keep every panel on one state.
 */

const SNAP: WorkflowSnapshot = {
  content: { id: "c1", status: "review" },
  brief: { status: "approved", approvedAt: "2026-08-31T00:00:00Z", approvedBy: "m1" },
  hasMaster: true,
  versions: [
    { id: "v1", platform: "xiaohongshu", status: "review" },
    { id: "v2", platform: "bilibili", status: "review" },
    { id: "v3", platform: "douyin", status: "review" },
  ],
  reviews: [],
};

describe("isLatestWorkflowRevision", () => {
  it("only the latest started action may apply", () => {
    expect(isLatestWorkflowRevision(2, 2)).toBe(true);
    expect(isLatestWorkflowRevision(1, 2)).toBe(false); // stale response dropped
    expect(isLatestWorkflowRevision(3, 2)).toBe(true);
  });
});

describe("applyVersionsSnapshot", () => {
  it("Send to Review snapshot flips every version status in one apply", () => {
    const prev = [
      { id: "v1", platform: "xiaohongshu", status: "draft", data: { title: "keep me" } },
      { id: "v2", platform: "bilibili", status: "draft", data: { script: "keep" } },
      { id: "v3", platform: "douyin", status: "draft", data: {} },
    ];
    const next = applyVersionsSnapshot(prev, SNAP.versions);
    expect(next.map((v) => v.status)).toEqual(["review", "review", "review"]);
    // Editing payloads are preserved — workflow never touches data.
    expect(next[0].data).toEqual({ title: "keep me" });
    expect(next[1].data).toEqual({ script: "keep" });
  });

  it("Return XHS to Draft updates only that platform", () => {
    const prev = [
      { id: "v1", platform: "xiaohongshu", status: "approved", data: {} },
      { id: "v2", platform: "bilibili", status: "approved", data: {} },
      { id: "v3", platform: "douyin", status: "approved", data: {} },
    ];
    const next = applyVersionsSnapshot(prev, [
      { id: "v1", platform: "xiaohongshu", status: "draft" },
      { id: "v2", platform: "bilibili", status: "approved" },
      { id: "v3", platform: "douyin", status: "approved" },
    ]);
    expect(next.map((v) => v.status)).toEqual(["draft", "approved", "approved"]);
  });

  it("a version unknown to local state is appended (e.g. created elsewhere)", () => {
    const prev = [{ id: "v1", platform: "xiaohongshu", status: "draft", data: {} }];
    const next = applyVersionsSnapshot(prev, [
      { id: "v1", platform: "xiaohongshu", status: "review" },
      { id: "v9", platform: "bilibili", status: "review" },
    ]);
    expect(next).toHaveLength(2);
    expect(next[1]).toEqual({ id: "v9", platform: "bilibili", status: "review" });
  });
});
