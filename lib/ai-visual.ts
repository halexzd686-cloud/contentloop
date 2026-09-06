/**
 * M4.4 — Studio AI visual lifecycle (pure mapping).
 *
 * IDLE           → everything static
 * GENERATING     → ShinyText active only
 * PROPOSAL_READY → ShinyText stopped, BlurText revealed the proposal once
 *
 * The mapping is total and priority-ordered: ShinyText and BlurText
 * can never be active simultaneously, even if the input flags race.
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

export function proposalReveal(state: StudioAIVisual): boolean {
  return state === "proposal_ready";
}
