import { describe, it, expect } from "vitest";

import {
  studioAIVisual,
  shinyTextActive,
} from "@/lib/ai-visual";

/**
 * Studio AI visual lifecycle. M5.6: BlurText removed from the V1 set —
 * proposal arrival is static; ShinyText is the only AI indicator and
 * only during genuine generation.
 */

describe("studioAIVisual", () => {
  it("idle: both flags false → fully static", () => {
    const s = studioAIVisual({ generating: false, proposalPending: false });
    expect(s).toBe("idle");
    expect(shinyTextActive(s)).toBe(false);
  });

  it("generating: ShinyText active", () => {
    const s = studioAIVisual({ generating: true, proposalPending: false });
    expect(s).toBe("generating");
    expect(shinyTextActive(s)).toBe(true);
  });

  it("proposal ready: static — no motion effect remains in the model", () => {
    const s = studioAIVisual({ generating: false, proposalPending: true });
    expect(s).toBe("proposal_ready");
    expect(shinyTextActive(s)).toBe(false);
  });

  it("racing flags: generating wins; shimmer never runs over a proposal", () => {
    const s = studioAIVisual({ generating: true, proposalPending: true });
    expect(shinyTextActive(s)).toBe(true);
    for (const generating of [false, true]) {
      for (const proposalPending of [false, true]) {
        const st = studioAIVisual({ generating, proposalPending });
        // invariant: shimmer only while generating, never otherwise
        expect(shinyTextActive(st)).toBe(generating);
      }
    }
  });
});
