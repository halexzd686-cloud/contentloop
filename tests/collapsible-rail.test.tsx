// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { CollapsibleRail } from "@/components/layout/collapsible-rail";

/**
 * M9 方案② — CollapsibleRail behavior tests.
 * Inline ↔ review-overlay switching, child-DOM preservation (unsaved AI
 * proposal edits must survive), Esc/› close, and the <1200 floating entry.
 * jsdom has no matchMedia — stubbed per breakpoint. No style assertions.
 */

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

function stubMatchMedia(narrow: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: narrow,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  }));
}

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

function rail() {
  return React.createElement(
    CollapsibleRail,
    { label: "Loop AI", className: "w-[320px] shrink-0" },
    React.createElement("div", { "data-testid": "probe" }, "审阅内容")
  );
}
async function render(el: React.ReactElement) {
  await act(async () => root.render(el));
}
async function click(el: HTMLElement) {
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}
function byAria(name: string): HTMLButtonElement {
  const b = document.querySelector(`button[aria-label="${name}"]`);
  if (!b) throw new Error(`button not found: ${name}`);
  return b as HTMLButtonElement;
}
function probe(): HTMLElement {
  const p = document.querySelector('[data-testid="probe"]');
  if (!p) throw new Error("probe not found");
  return p as HTMLElement;
}

describe("CollapsibleRail ≥1200 (inline)", () => {
  it("renders children inline with a 展开审阅 button", async () => {
    stubMatchMedia(false);
    await render(rail());
    expect(probe().textContent).toBe("审阅内容");
    // inline: not a dialog, no expanded attribute yet
    expect(document.querySelector("[data-loop-ai-expanded]")).toBeNull();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(byAria("展开审阅")).toBeTruthy();
  });

  it("expand → dialog + data-loop-ai-expanded + 收起审阅, children DOM preserved", async () => {
    stubMatchMedia(false);
    await render(rail());
    const before = probe();

    await click(byAria("展开审阅"));

    const host = document.querySelector("[data-loop-ai-expanded]");
    expect(host).toBeTruthy();
    expect(host!.getAttribute("role")).toBe("dialog");
    expect(byAria("收起审阅")).toBeTruthy();
    // same DOM node — children never remounted (local edit state survives)
    expect(probe()).toBe(before);
    expect(document.contains(before)).toBe(true);
  });

  it("› closes back to inline; Esc closes back to inline", async () => {
    stubMatchMedia(false);
    await render(rail());

    // › close
    await click(byAria("展开审阅"));
    expect(document.querySelector("[data-loop-ai-expanded]")).toBeTruthy();
    await click(byAria("收起审阅"));
    expect(document.querySelector("[data-loop-ai-expanded]")).toBeNull();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(probe().textContent).toBe("审阅内容");

    // Esc close
    await click(byAria("展开审阅"));
    expect(document.querySelector("[data-loop-ai-expanded]")).toBeTruthy();
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(document.querySelector("[data-loop-ai-expanded]")).toBeNull();
    expect(probe().textContent).toBe("审阅内容");
  });
});

describe("CollapsibleRail <1200 (collapsed)", () => {
  it("children hidden behind a floating trigger; trigger opens the review overlay", async () => {
    stubMatchMedia(true);
    await render(rail());

    // not inline: no children in the flow, no expand arrow — floating entry instead
    expect(document.querySelector('[data-testid="probe"]')).toBeNull();
    expect(document.querySelector('button[aria-label="展开审阅"]')).toBeNull();
    const trigger = [...document.querySelectorAll("button")].find((b) =>
      (b.textContent ?? "").includes("Loop AI")
    );
    expect(trigger).toBeTruthy();

    await click(trigger!);

    const host = document.querySelector("[data-loop-ai-expanded]");
    expect(host).toBeTruthy();
    expect(host!.getAttribute("role")).toBe("dialog");
    expect(probe().textContent).toBe("审阅内容");
    expect(byAria("收起审阅")).toBeTruthy();
  });
});
