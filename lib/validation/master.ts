import { z } from "zod";

/**
 * ContentMaster validation — data-model §11
 *
 * Module repetition rules (frozen M1.4 decision):
 * - hook / core_message / conclusion / cta: exactly 1, not deletable
 * - section: 1..N, repeatable, deletable down to 1
 * - demo / evidence: 0..N, repeatable, freely deletable
 *
 * Incomplete drafts are allowed: module content may be an empty string.
 * Empty skeleton is structured emptiness, never mock content.
 */

export const MODULE_TYPES = [
  "hook",
  "core_message",
  "section",
  "demo",
  "evidence",
  "conclusion",
  "cta",
] as const;

export type ModuleType = (typeof MODULE_TYPES)[number];

/** Singletons must exist exactly once and cannot be deleted. */
export const SINGLETON_TYPES: readonly ModuleType[] = [
  "hook",
  "core_message",
  "conclusion",
  "cta",
];

/** Section must exist at least once. */
export const MIN_SECTION_COUNT = 1;

export const masterModuleSchema = z.object({
  id: z.string().min(1).max(100),
  type: z.enum(MODULE_TYPES),
  title: z.string().max(500).optional(),
  content: z.string().max(20000), // empty string allowed — incomplete draft OK
  order: z.number().int(), // client-sent; server re-normalizes to 0..n-1
});

export const masterModulesSchema = z
  .array(masterModuleSchema)
  .min(1)
  .superRefine((modules, ctx) => {
    // Unique stable ids — array index is never an identity
    const ids = new Set<string>();
    for (const m of modules) {
      if (ids.has(m.id)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate module id: ${m.id}`,
        });
      }
      ids.add(m.id);
    }

    // Singleton rules: exactly 1 each
    for (const t of SINGLETON_TYPES) {
      const count = modules.filter((m) => m.type === t).length;
      if (count !== 1) {
        ctx.addIssue({
          code: "custom",
          message: `Module type "${t}" must exist exactly once (found ${count})`,
        });
      }
    }

    // Section: at least 1
    const sections = modules.filter((m) => m.type === "section").length;
    if (sections < MIN_SECTION_COUNT) {
      ctx.addIssue({
        code: "custom",
        message: "At least one section module is required",
      });
    }
  });

export type MasterModule = z.infer<typeof masterModuleSchema>;

/**
 * Default skeleton (PRD §8.7). Stable server-generated ids.
 * content = "" — structured empty draft, not mock content.
 */
export function buildDefaultModules(
  createId: () => string = () => crypto.randomUUID()
): MasterModule[] {
  const types: ModuleType[] = [
    "hook",
    "core_message",
    "section",
    "section",
    "demo",
    "evidence",
    "conclusion",
    "cta",
  ];
  return types.map((type, i) => ({
    id: createId(),
    type,
    content: "",
    order: i,
  }));
}

/**
 * Server-side order normalization: order = 0..n-1 by array position.
 * Client-sent order is never authoritative.
 */
export function normalizeModuleOrder(modules: MasterModule[]): MasterModule[] {
  return modules.map((m, i) => ({ ...m, order: i }));
}

/**
 * Deletion guard for the UI/API layer.
 * Singletons are never deletable; section is deletable only if >1 remain.
 */
export function canDeleteModule(
  type: ModuleType,
  modules: MasterModule[]
): boolean {
  if (SINGLETON_TYPES.includes(type)) return false;
  if (type === "section") {
    return (
      modules.filter((m) => m.type === "section").length > MIN_SECTION_COUNT
    );
  }
  return true; // demo / evidence: 0..N
}

/**
 * Which module types may currently be added (respects singleton cap).
 */
export function canAddModule(type: ModuleType, modules: MasterModule[]): boolean {
  if (SINGLETON_TYPES.includes(type)) {
    return !modules.some((m) => m.type === type);
  }
  return true; // section / demo / evidence repeatable
}
