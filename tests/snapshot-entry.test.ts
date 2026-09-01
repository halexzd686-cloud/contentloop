import { describe, it, expect } from "vitest";

import { snapshotEntryMode, initSnapshotInputs } from "@/lib/snapshot-entry";

/**
 * M2.5 freeze blocker — snapshot entry mode rules.
 * Mode derives from checkpoint status, never from data availability.
 */
describe("snapshotEntryMode", () => {
  it("due → create", () => {
    expect(snapshotEntryMode("due")).toBe("create");
  });

  it("submitted → edit (never create fallback)", () => {
    expect(snapshotEntryMode("submitted")).toBe("edit");
  });

  it("not_due → no action", () => {
    expect(snapshotEntryMode("not_due")).toBeNull();
  });
});

describe("initSnapshotInputs", () => {
  const keys = ["views", "likes", "saves", "comments"];

  it("create mode: every field blank + unresolved — never visually zero", () => {
    const r = initSnapshotInputs(keys, null);
    for (const k of keys) {
      expect(r[k]).toEqual({ value: "", isNA: false });
    }
  });

  it("edit mode: stored 0 renders '0' (real zero preserved)", () => {
    const r = initSnapshotInputs(keys, {
      views: 1000,
      likes: 0,
      saves: null,
      comments: 10,
    });
    expect(r.views).toEqual({ value: "1000", isNA: false });
    expect(r.likes).toEqual({ value: "0", isNA: false });
    expect(r.saves).toEqual({ value: "", isNA: true });
    expect(r.comments).toEqual({ value: "10", isNA: false });
  });

  it("edit mode: key absent from stored map renders blank", () => {
    const r = initSnapshotInputs(["views"], {});
    expect(r.views).toEqual({ value: "", isNA: false });
  });
});
