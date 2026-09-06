import { Badge } from "@/components/ui/badge";
import { DEMO_BADGE_LABEL } from "@/lib/labels";

/**
 * M4.4 — Demo provenance badge.
 *
 * Renders only on explicit isDemo authority (never title/notes
 * heuristics). Textual, not color-only; normal presentation
 * otherwise. Demo is not an error state.
 */
export function DemoBadge({ isDemo }: { isDemo: boolean | null | undefined }) {
  if (!isDemo) return null;
  return <Badge variant="outline">{DEMO_BADGE_LABEL}</Badge>;
}
