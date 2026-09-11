// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { Gateway } from "@/components/gateway/gateway";
import { Sidebar } from "@/components/layout/sidebar";

/**
 * M7 Phase A — Gateway + Editorial Rail behavior tests.
 * Canvas visuals (EvidenceMark) are verified in the browser; jsdom has
 * no 2d context, so only DOM/semantics are asserted here.
 */

const replaceMock = vi.fn();
let pathnameMock = "/app";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => pathnameMock,
}));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  replaceMock.mockClear();
  pathnameMock = "/app";
  window.localStorage.clear();
  window.history.replaceState({}, "", "/");
  // Gateway reveals via rAF — run synchronously in tests
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    cb(performance.now());
    return 0;
  }) as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame = (() => {}) as typeof cancelAnimationFrame;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("Gateway", () => {
  it("renders wordmark, portal button and direct-entry checkbox", async () => {
    await act(async () => root.render(React.createElement(Gateway)));
    expect(container.textContent).toContain("ContentLoop");
    const portal = container.querySelector<HTMLAnchorElement>('a[href="/app"]');
    expect(portal).toBeTruthy();
    expect(portal!.textContent).toContain("进入 ContentLoop");
    const checkbox = container.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(checkbox).toBeTruthy();
    expect(container.textContent).toContain("下次直接进入工作区");
  });

  it("shows no slogan, nav, or marketing copy", async () => {
    await act(async () => root.render(React.createElement(Gateway)));
    expect(container.textContent).not.toContain("让每次表现");
    expect(container.textContent).not.toContain("3–5 人");
    expect(container.querySelector("nav")).toBeNull();
    expect(container.querySelector("footer")).toBeNull();
  });

  it("renders the Evidence Mark canvas with an accessible name", async () => {
    await act(async () => root.render(React.createElement(Gateway)));
    const canvas = container.querySelector("canvas");
    expect(canvas).toBeTruthy();
    expect(canvas!.getAttribute("role")).toBe("img");
    expect(canvas!.getAttribute("aria-label")).toBeTruthy();
  });

  it("checkbox persists direct-entry preference to localStorage", async () => {
    await act(async () => root.render(React.createElement(Gateway)));
    const checkbox = container.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    await act(async () => {
      checkbox.click();
    });
    expect(window.localStorage.getItem("contentloop.direct-entry")).toBe("1");
    await act(async () => {
      checkbox.click();
    });
    expect(window.localStorage.getItem("contentloop.direct-entry")).toBeNull();
  });

  it("redirects to /app when direct-entry preference is set", async () => {
    window.localStorage.setItem("contentloop.direct-entry", "1");
    await act(async () => root.render(React.createElement(Gateway)));
    expect(replaceMock).toHaveBeenCalledWith("/app");
    // Gateway content must not render during redirect
    expect(container.textContent).not.toContain("进入 ContentLoop");
  });

  it("?gateway=1 forces the Gateway despite the preference (dev/test path)", async () => {
    window.localStorage.setItem("contentloop.direct-entry", "1");
    window.history.replaceState({}, "", "/?gateway=1");
    await act(async () => root.render(React.createElement(Gateway)));
    expect(replaceMock).not.toHaveBeenCalled();
    expect(container.textContent).toContain("进入 ContentLoop");
  });
});

describe("Editorial Rail (Sidebar)", () => {
  it("renders exactly the six frozen destinations", async () => {
    await act(async () => root.render(React.createElement(Sidebar)));
    const links = [...container.querySelectorAll<HTMLAnchorElement>("nav a")];
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/app",
      "/app/radar",
      "/app/studio",
      "/app/pipeline",
      "/app/analytics",
      "/app/settings",
    ]);
    const text = container.textContent!;
    for (const label of ["首页", "选题雷达", "内容工作台", "内容流程", "数据复盘", "设置", "工作区"]) {
      expect(text).toContain(label);
    }
  });

  it("marks the active route with aria-current, others without", async () => {
    pathnameMock = "/app/radar";
    await act(async () => root.render(React.createElement(Sidebar)));
    const radar = container.querySelector<HTMLAnchorElement>('a[href="/app/radar"]')!;
    expect(radar.getAttribute("aria-current")).toBe("page");
    const settings = container.querySelector<HTMLAnchorElement>('a[href="/app/settings"]')!;
    expect(settings.getAttribute("aria-current")).toBeNull();
  });

  it("home is active only on /app exactly", async () => {
    pathnameMock = "/app/radar";
    await act(async () => root.render(React.createElement(Sidebar)));
    const home = container.querySelector<HTMLAnchorElement>('a[href="/app"]')!;
    expect(home.getAttribute("aria-current")).toBeNull();
  });

  it("has no manual collapse control in V1", async () => {
    await act(async () => root.render(React.createElement(Sidebar)));
    expect(container.textContent).not.toContain("收起");
    expect(container.textContent).not.toContain("展开");
    expect(container.querySelector("button")).toBeNull();
  });
});
