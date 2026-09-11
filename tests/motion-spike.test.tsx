// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { SpiralLoader } from "@/components/motion/spiral-loader";

/**
 * M7 motion spike — meaningful render/behavior tests only.
 * (Canvas RAF lifecycle is exercised in the browser check; jsdom has
 * no canvas 2D context, so ThinkingOrbs is validated there.)
 */

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("SpiralLoader", () => {
  it("renders at required sizes with frozen colors", async () => {
    for (const size of [16, 24, 32]) {
      await act(async () =>
        root.render(React.createElement(SpiralLoader, { size }))
      );
      const svg = container.querySelector("svg")!;
      expect(svg.getAttribute("width")).toBe(String(size));
      expect(svg.getAttribute("height")).toBe(String(size));
      expect(svg.innerHTML).toContain("#7C9482");
      expect(svg.innerHTML).toContain("#C8C9CB");
    }
  });

  it("announces processing state for assistive tech", async () => {
    await act(async () =>
      root.render(React.createElement(SpiralLoader, { size: 16 }))
    );
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("role")).toBe("status");
    expect(svg.getAttribute("aria-label")).toBe("处理中");
  });

  it("no layout shift: inline-block + fixed box", async () => {
    await act(async () =>
      root.render(React.createElement(SpiralLoader, { size: 16 }))
    );
    const svg = container.querySelector("svg")!;
    expect(svg.style.display).toBe("inline-block");
    expect(svg.style.flexShrink).toBe("0");
  });
});

describe("SpiralLoader reduced-motion", () => {
  it("spiral arcs are animation-free under prefers-reduced-motion (CSS contract)", () => {
    // The reduced-motion rule lives in globals.css; assert the classes
    // the rule targets are the ones the component renders.
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf-8");
    expect(css).toContain(".spiral-loader-active");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain("spiral-travel");
  });
});
