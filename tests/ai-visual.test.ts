import { describe, it, expect } from "vitest";

import {
  studioAIVisual,
  shinyTextActive,
  proposalReveal,
} from "@/lib/ai-visual";

/**
 * M4.4 — Studio AI visual lifecycle. The mapping is total and
 * priority-ordered: ShinyText and BlurText can never be active at
 * the same time, even if the input flags race.
 */

describe("studioAIVisual", () => {
  it("idle: both flags false → fully static", () => {
    const s = studioAIVisual({ generating: false, proposalPending: false });
    expect(s).toBe("idle");
    expect(shinyTextActive(s)).toBe(false);
    expect(proposalReveal(s)).toBe(false);
  });

  it("generating: ShinyText active only", () => {
    const s = studioAIVisual({ generating: true, proposalPending: false });
    expect(s).toBe("generating");
    expect(shinyTextActive(s)).toBe(true);
    expect(proposalReveal(s)).toBe(false);
  });

  it("proposal ready: BlurText reveal, ShinyText stopped", () => {
    const s = studioAIVisual({ generating: false, proposalPending: true });
    expect(s).toBe("proposal_ready");
    expect(shinyTextActive(s)).toBe(false);
    expect(proposalReveal(s)).toBe(true);
  });

  it("racing flags: never both effects — generating wins", () => {
    const s = studioAIVisual({ generating: true, proposalPending: true });
    expect(shinyTextActive(s)).toBe(true);
    expect(proposalReveal(s)).toBe(false);
    // structural invariant: at most one effect active in every state
    for (const generating of [false, true]) {
      for (const proposalPending of [false, true]) {
        const st = studioAIVisual({ generating, proposalPending });
        expect(shinyTextActive(st) && proposalReveal(st)).toBe(false);
      }
    }
  });
});
