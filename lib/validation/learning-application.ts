import { z } from "zod";

/**
 * LearningApplication validation — M3.4.
 * Client submits only learningId + action (POST) or action (PATCH).
 * Everything else is server-owned.
 */

export const LEARNING_ACTIONS = ["applied", "dismissed"] as const;
export type LearningAction = (typeof LEARNING_ACTIONS)[number];

export const applyActionSchema = z
  .object({
    learningId: z.string().uuid(),
    action: z.enum(LEARNING_ACTIONS),
  })
  .strict();

export const transitionActionSchema = z
  .object({
    action: z.enum(LEARNING_ACTIONS),
  })
  .strict();

/** Content lifecycle eligible for NEW applications (published is not). */
export const ELIGIBLE_CONTENT_STATUSES = [
  "planning",
  "in_progress",
  "review",
  "scheduled",
] as const;

export function isContentLifecycleEligible(status: string): boolean {
  return (ELIGIBLE_CONTENT_STATUSES as readonly string[]).includes(status);
}

/** Platform scope: null learning platform = general; otherwise exact match. */
export function isPlatformEligible(
  learningPlatform: string | null,
  contentPlatform: string | null
): boolean {
  if (learningPlatform === null) return true;
  return learningPlatform === contentPlatform;
}

/** Pillar scope: null learning pillar = general; otherwise exact match. */
export function isPillarEligible(
  learningPillarId: string | null,
  contentPillarId: string | null
): boolean {
  if (learningPillarId === null) return true;
  return learningPillarId === contentPillarId;
}

export function isScopeEligible(
  learning: { platform: string | null; pillarId: string | null },
  content: { status: string; platform: string | null; pillarId: string | null }
): boolean {
  return (
    isContentLifecycleEligible(content.status) &&
    isPlatformEligible(learning.platform, content.platform) &&
    isPillarEligible(learning.pillarId, content.pillarId)
  );
}

/**
 * Deterministic candidate ordering (frozen):
 * exact platform+pillar → platform+unscoped pillar →
 * general platform+exact pillar → general+general → newest → id.
 */
export function candidateRank(
  learningPlatform: string | null,
  learningPillarId: string | null
): number {
  const p = learningPlatform === null ? 1 : 0;
  const q = learningPillarId === null ? 1 : 0;
  return p * 2 + q; // 0,1,2,3 in the frozen order
}
