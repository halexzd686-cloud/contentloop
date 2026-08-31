import { z } from "zod";

/**
 * Review validation — data-model §15, PRD §8.14
 *
 * The checklist is HUMAN-ONLY: five booleans, each confirmed by a
 * human. AI never writes it. Partial checklists may be saved; all
 * five must be true before Approve for Publishing (re-verified
 * server-side on every approve).
 */

export const reviewChecklistSchema = z
  .object({
    factsConfirmed: z.boolean(),
    titleCoverMatch: z.boolean(),
    platformFitConfirmed: z.boolean(),
    riskChecked: z.boolean(),
    humanReviewed: z.boolean(),
  })
  .strict();

export type ReviewChecklist = z.infer<typeof reviewChecklistSchema>;

export const EMPTY_CHECKLIST: ReviewChecklist = {
  factsConfirmed: false,
  titleCoverMatch: false,
  platformFitConfirmed: false,
  riskChecked: false,
  humanReviewed: false,
};

export function isChecklistComplete(c: ReviewChecklist): boolean {
  return (
    c.factsConfirmed &&
    c.titleCoverMatch &&
    c.platformFitConfirmed &&
    c.riskChecked &&
    c.humanReviewed
  );
}

/**
 * Content status transition rules (frozen M1.6 decision).
 *
 * DRAG_TRANSITIONS lists what Pipeline drag may trigger. Everything
 * else is unreachable via drag and most of it has no API path at all:
 * - review → scheduled: ONLY via Approve for Publishing (checklist)
 * - scheduled → review: ONLY via single-platform Return to Draft
 * - scheduled → in_progress: ONLY via Global Upstream Invalidation
 * - any → published: forbidden in M1.6 (needs a real Publication)
 */
export const DRAG_TRANSITIONS: Record<string, readonly string[]> = {
  planning: ["in_progress"],
  in_progress: ["review"],
  review: ["in_progress"],
  scheduled: [],
  published: [],
};

export function canDragTransition(from: string, to: string): boolean {
  return DRAG_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Human-readable reason a drag transition is blocked. */
export function dragBlockReason(from: string, to: string): string {
  if (to === "published") {
    return "Publishing requires a real Publication record — not available yet.";
  }
  if (from === "review" && to === "scheduled") {
    return "Complete the Review Checklist and use Approve for Publishing.";
  }
  if (from === "scheduled" && to === "review") {
    return "Return a platform version to draft to reopen review.";
  }
  return `Transition ${from} → ${to} is not allowed.`;
}
