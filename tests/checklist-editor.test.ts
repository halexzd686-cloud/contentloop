import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { ChecklistEditor } from "@/lib/checklist-editor";
import type { ReviewChecklist } from "@/lib/validation/review";

/**
 * M1.6 checklist interaction fix — interaction-first, persistence-
 * asynchronous. Fake timers control the 300ms debounce.
 */

const EMPTY: ReviewChecklist = {
  factsConfirmed: false,
  titleCoverMatch: false,
  platformFitConfirmed: false,
  riskChecked: false,
  humanReviewed: false,
};

const FULL: ReviewChecklist = {
  factsConfirmed: true,
  titleCoverMatch: true,
  platformFitConfirmed: true,
  riskChecked: true,
  humanReviewed: true,
};

function setup(sendImpl?: (s: ReviewChecklist) => Promise<void>) {
  const payloads: ReviewChecklist[] = [];
  const send = vi.fn(async (s: ReviewChecklist) => {
    payloads.push({ ...s });
    await sendImpl?.(s);
  });
  const editor = new ChecklistEditor(EMPTY, send, undefined, undefined, 300);
  return { editor, payloads, send };
}

describe("ChecklistEditor", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("first click updates local state immediately, before any network", () => {
    const { editor, send } = setup();
    editor.toggle("factsConfirmed");
    expect(editor.getState().factsConfirmed).toBe(true);
    expect(send).not.toHaveBeenCalled();
  });

  it("rapid 5 clicks coalesce into one debounced save with the latest 5/5 snapshot", async () => {
    const { editor, send, payloads } = setup();
    editor.toggle("factsConfirmed");
    editor.toggle("titleCoverMatch");
    editor.toggle("platformFitConfirmed");
    editor.toggle("riskChecked");
    editor.toggle("humanReviewed");
    expect(editor.getState()).toEqual(FULL);
    expect(send).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(300);
    expect(send).toHaveBeenCalledTimes(1);
    expect(payloads[0]).toEqual(FULL);
  });

  it("check → uncheck → check persists the final state", async () => {
    const { editor, payloads, send } = setup();
    editor.toggle("factsConfirmed");
    editor.toggle("factsConfirmed");
    editor.toggle("factsConfirmed");
    await vi.advanceTimersByTimeAsync(300);
    expect(send).toHaveBeenCalledTimes(1);
    expect(payloads[0].factsConfirmed).toBe(true);
  });

  it("Select All: all five true, exactly one immediate save (no debounce wait)", async () => {
    const { editor, send, payloads } = setup();
    editor.setAll(true);
    expect(editor.getState()).toEqual(FULL);
    // immediate — no timer advance needed
    await vi.advanceTimersByTimeAsync(0);
    expect(send).toHaveBeenCalledTimes(1);
    expect(payloads[0]).toEqual(FULL);
  });

  it("Clear All: all five false, exactly one immediate save", async () => {
    const { editor, send, payloads } = setup();
    editor.setAll(true);
    await vi.advanceTimersByTimeAsync(0);
    editor.setAll(false);
    await vi.advanceTimersByTimeAsync(0);
    expect(editor.getState()).toEqual(EMPTY);
    expect(send).toHaveBeenCalledTimes(2);
    expect(payloads[1]).toEqual(EMPTY);
  });

  it("a newer change during an in-flight save wins; stale ack does not roll back", async () => {
    let resolveFirst!: () => void;
    const first = new Promise<void>((r) => (resolveFirst = r));
    let call = 0;
    const payloads: ReviewChecklist[] = [];
    const send = vi.fn((s: ReviewChecklist) => {
      call += 1;
      payloads.push({ ...s });
      return call === 1 ? first : Promise.resolve();
    });
    const editor = new ChecklistEditor(EMPTY, send, undefined, undefined, 300);

    editor.setAll(true); // send #1 in flight
    await vi.advanceTimersByTimeAsync(0);
    expect(send).toHaveBeenCalledTimes(1);

    editor.toggle("factsConfirmed"); // newer local state: 4/5
    await vi.advanceTimersByTimeAsync(300); // debounce fires, queued behind in-flight

    resolveFirst();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(0);

    expect(send).toHaveBeenCalledTimes(2);
    expect(payloads[1].factsConfirmed).toBe(false);
    expect(editor.getState().factsConfirmed).toBe(false); // never rolled back
    expect(await editor.flush()).toBe(true);
  });

  it("failed save preserves local state; retry sends the latest snapshot", async () => {
    let shouldFail = true;
    const { editor, send, payloads } = setup(async () => {
      if (shouldFail) throw new Error("network down");
    });
    editor.toggle("riskChecked");
    await vi.advanceTimersByTimeAsync(300);
    expect(editor.getState().riskChecked).toBe(true); // preserved

    shouldFail = false;
    editor.retry();
    await vi.advanceTimersByTimeAsync(0);
    expect(send).toHaveBeenCalledTimes(2);
    expect(payloads[1].riskChecked).toBe(true);
  });

  it("flush persists a pending debounced change before approve", async () => {
    const { editor, send, payloads } = setup();
    editor.toggle("humanReviewed");
    // No timer advance — approve happens immediately after the click.
    const ok = await editor.flush();
    expect(ok).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
    expect(payloads[0].humanReviewed).toBe(true);
  });

  it("failed flush resolves false — approve must be blocked", async () => {
    const { editor } = setup(async () => {
      throw new Error("down");
    });
    editor.toggle("humanReviewed");
    const ok = await editor.flush();
    expect(ok).toBe(false);
    expect(editor.getState().humanReviewed).toBe(true); // local state kept
  });
});
