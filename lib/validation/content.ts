import { z } from "zod";
import { PLATFORMS } from "@/lib/validation/platform-version";

/** M4.1 — manual create / platform correction validation. */

export const manualCreateSchema = z
  .object({
    title: z.string().trim().min(1).max(500),
    primaryPlatform: z.enum(PLATFORMS),
    pillarId: z.string().uuid().nullable().optional(),
    ownerId: z.string().uuid(),
  })
  .strict();

export type ManualCreateInput = z.infer<typeof manualCreateSchema>;

export const setPrimaryPlatformSchema = z
  .object({
    primaryPlatform: z.enum(PLATFORMS),
  })
  .strict();
