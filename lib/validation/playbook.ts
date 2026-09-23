import { z } from "zod";

import { PLATFORMS } from "@/lib/validation/platform-version";

/**
 * Platform Playbook validation — M8 (AGENTS §21, PRD §15.4).
 *
 * Playbook is structured business configuration, not a raw prompt.
 * AI may DRAFT (aiPlaybookDraftSchema, never persisted); only the
 * human save path (playbookUpsertSchema) writes. No versioning in V1.
 * Empty fields stay null — never fabricated defaults.
 */

const ruleText = z.string().trim().max(2000).nullable();

const exampleSchema = z.object({
  title: z.string().trim().min(1).max(200),
  note: z.string().trim().max(500).optional(),
  url: z.string().trim().url().max(500).optional(),
});

const shape = {
  voice: ruleText,
  titleStyle: ruleText,
  hookStyle: ruleText,
  structure: ruleText,
  cta: ruleText,
  avoid: z.array(z.string().trim().min(1).max(200)).max(20).nullable(),
  goodExamples: z.array(exampleSchema).max(10).nullable(),
};

/** Human save payload (PUT /api/settings/playbooks). Identity = platform. */
export const playbookUpsertSchema = z
  .object({
    platform: z.enum(PLATFORMS),
    ...shape,
  })
  .strict();

export type PlaybookUpsertInput = z.infer<typeof playbookUpsertSchema>;

/**
 * AI draft output — same seven fields, all required so the model must
 * take a position on each (human edits before saving). Parsed from
 * LLM JSON; malformed output is rejected, never written.
 */
export const aiPlaybookDraftSchema = z
  .object({
    voice: z.string().trim().min(1).max(2000),
    titleStyle: z.string().trim().min(1).max(2000),
    hookStyle: z.string().trim().min(1).max(2000),
    structure: z.string().trim().min(1).max(2000),
    cta: z.string().trim().min(1).max(2000),
    avoid: z.array(z.string().trim().min(1).max(200)).max(20),
    goodExamples: z.array(exampleSchema).max(10),
  })
  .strict();

export type AIPlaybookDraft = z.infer<typeof aiPlaybookDraftSchema>;
