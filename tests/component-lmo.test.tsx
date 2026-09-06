// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { ImportMetricsModal } from "@/components/analytics/import-modal";
import { MetricSnapshotModal } from "@/components/studio/snapshot-modal";

/**
 * M5.2 acceptance L/M/O — component-level integration tests.
 * jsdom + real components + controlled fetch mock. No DB: every
 * network call is intercepted; zero writes are possible.
 */

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const RAW_DEFS = [
  { key: "views", type: "raw", isActive: true, platform: "xiaohongshu", alias: null, displayName: "Views" },
  { key: "likes", type: "raw", isActive: true, platform: "xiaohongshu", alias: null, displayName: "Likes" },
  { key: "saves", type: "raw", isActive: true, platform: "xiaohongshu", alias: null, displayName: "Saves" },
  { key: "comments", type: "raw", isActive: true, platform: "xiaohongshu", alias: null, displayName: "Comments" },
];

let container: HTMLDivElement;
let root: Root;
let fetchMock: ReturnType<typeof vi.fn>;

function okJson(body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  );
}

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

function text() {
  return document.body.textContent ?? "";
}
function button(name: string): HTMLButtonElement {
  const b = [...document.body.querySelectorAll("button")].find((x) =>
    (x.textContent ?? "").includes(name)
  );
  if (!b) throw new Error(`button not found: ${name}`);
  return b;
}
async function render(el: React.ReactElement) {
  await act(async () => root.render(el));
}
async function click(el: HTMLElement) {
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

// ─── L + M: ImportMetricsModal definitions failure & retry ──────

describe("L/M — import metric-definitions failure and retry", () => {
  it("failure is explicit error + Retry, never an empty-definition state; retry preserves the selected file", async () => {
    // 1st load fails (500), retry succeeds
    fetchMock
      .mockImplementationOnce(() =>
        Promise.resolve(new Response("boom", { status: 500 }))
      )
      .mockImplementation(() => okJson({ definitions: RAW_DEFS }));

    await render(
      React.createElement(ImportMetricsModal, {
        open: true,
        onOpenChange: () => {},
        publications: [],
        onDone: () => {},
      })
    );

    // L-1/2/3: error state + product copy + Retry
    expect(text()).toContain("Metric definitions could not be loaded.");
    const retry = [...document.body.querySelectorAll("button")].find(
      (b) => b.textContent === "Retry"
    );
    expect(retry).toBeTruthy();

    // L-4: failure is NOT presented as zero metrics
    expect(text()).not.toContain("No metrics defined");

    // L-5: template download + upload disabled while definitions unavailable
    expect(button("Download CSV Template").disabled).toBe(true);
    expect(button("Upload & Continue").disabled).toBe(true);

    // L-7: no fetch/status/stack/vendor leakage
    expect(text()).not.toContain("500");
    expect(text()).not.toContain("fetch");
    expect(text()).not.toContain("Response");

    // M: user selects a file BEFORE retrying (state must survive)
    const fileInput = document.body.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = new File(["publication_url,checkpoint\nhttps://x.com/a,24h\n"], "m.csv");
    await act(async () => {
      Object.defineProperty(fileInput, "files", { value: [file], configurable: true });
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    });

    // M: Retry
    await click(retry!);

    // M: definitions loaded, normal flow restored, file still selected
    expect(text()).not.toContain("Metric definitions could not be loaded.");
    expect(button("Download CSV Template").disabled).toBe(false);
    expect(button("Upload & Continue").disabled).toBe(false); // file preserved → enabled
    expect((fileInput.files?.length ?? 0)).toBe(1);

    // M: exactly two network calls, both definitions — no upload/parse/write
    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const call of fetchMock.mock.calls) {
      expect(String(call[0])).toBe("/api/settings/metrics");
    }
  });
});

// ─── O: manual metric entry regression ──────────────────────────

describe("O — manual metric entry blank / N/A / 0", () => {
  const publication = {
    id: "pub-1",
    platform: "xiaohongshu",
    finalTitle: "Test pub",
    publishedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  };

  it("blank unresolved + N/A explicit + 0 real zero; Save gating unchanged", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === "/api/settings/metrics") return okJson({ definitions: RAW_DEFS });
      throw new Error("unexpected fetch: " + url);
    });

    await render(
      React.createElement(MetricSnapshotModal, {
        open: true,
        onOpenChange: () => {},
        publication,
        checkpoint: "24h",
        mode: "create",
        existing: null,
        onDone: () => {},
      })
    );

    const inputs = [
      ...document.body.querySelectorAll('input[inputmode="numeric"]'),
    ] as HTMLInputElement[];
    expect(inputs.length).toBe(4); // views, likes, saves, comments

    const setValue = async (el: HTMLInputElement, v: string) => {
      await act(async () => {
        const setter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value"
        )!.set!;
        setter.call(el, v);
        el.dispatchEvent(new Event("input", { bubbles: true }));
      });
    };

    // views=100, likes=blank, saves=N/A, comments=0 → Save disabled
    await setValue(inputs[0], "100");
    await setValue(inputs[3], "0");
    const naButtons = [...document.body.querySelectorAll("button")].filter(
      (b) => b.textContent === "Mark N/A"
    );
    await click(naButtons[2]); // saves
    expect(text()).toContain("N/A");
    expect(button("Save Metrics").disabled).toBe(true);

    // likes=5 → Save enabled
    await setValue(inputs[1], "5");
    expect(button("Save Metrics").disabled).toBe(false);

    // no import-specific controls inside the manual entry modal
    expect(text()).not.toContain("Import");
    expect(text()).not.toContain("CSV");

    // zero network writes: only the definitions GET happened
    for (const call of fetchMock.mock.calls) {
      expect(String(call[0])).toBe("/api/settings/metrics");
    }
  });
});
