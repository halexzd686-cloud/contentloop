/**
 * M4.4 — Studio AI visual lifecycle (pure mapping).
 *
 * IDLE           → everything static
 * GENERATING     → ShinyText active only
 * PROPOSAL_READY → static (proposal banner renders as plain text)
 *
 * M5.6: BlurText was removed from the V1 React Bits set; the proposal
 * arrival state is intentionally static. ShinyText remains the only
 * AI-generating indicator.
 */

export type StudioAIVisual = "idle" | "generating" | "proposal_ready";

export function studioAIVisual(input: {
  generating: boolean;
  proposalPending: boolean;
}): StudioAIVisual {
  if (input.generating) return "generating";
  if (input.proposalPending) return "proposal_ready";
  return "idle";
}

export function shinyTextActive(state: StudioAIVisual): boolean {
  return state === "generating";
}

