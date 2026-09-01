import { describe, it, expect } from "vitest";

import { snapshotEntryMode } from "@/lib/snapshot-entry";

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
