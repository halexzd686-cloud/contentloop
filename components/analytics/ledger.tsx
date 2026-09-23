/**
 * M7 ledger language — shared chrome for Analytics surfaces.
 * Authority: app/app/analytics/page.tsx (analytics-final-v2).
 * Presentation-only primitives; no data or behavior.
 */

export const HAIRLINE = "1px solid var(--border-hairline)";
export const RULE = "1px solid var(--border)";

/** Functional small text (frozen color discipline). */
export const INK_FUNCTIONAL = "var(--cl-neutral)";
/** Decorative text only. */
export const INK_DECORATIVE = "var(--ink-muted)";
export const ACCENT_GREEN = "var(--cl-primary)";
export const ACCENT_GOLD = "var(--cl-gold)";
export const SURFACE = "var(--cl-surface)";

export function Motif({ gold }: { gold?: boolean }) {
  const c = gold ? ACCENT_GOLD : ACCENT_GREEN;
  return (
    <svg width="22" height="10" viewBox="0 0 22 10" aria-hidden>
      <line x1="0" y1="5" x2="12" y2="5" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <circle cx="18" cy="5" r="3" fill={c} />
    </svg>
  );
}

export function Sec({ title, note, gold }: { title: string; note?: string; gold?: boolean }) {
  return (
    <div className="mb-1 flex items-center gap-2">
      <Motif gold={gold} />
      <span className="text-[15px] font-semibold text-ink-primary">{title}</span>
      {note && (
        <span className="ml-auto text-xs" style={{ color: INK_FUNCTIONAL }}>
          {note}
        </span>
      )}
    </div>
  );
}

/** Small-caps group label inside a ledger block (e.g. 原始指标). */
export function LedgerLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[11px] font-semibold tracking-[0.14em]"
      style={{ color: INK_FUNCTIONAL }}
    >
      {children}
    </p>
  );
}

/** Status = text + small dot (no Badge pills in ledger language). */
export function StatusDot({ gold }: { gold?: boolean }) {
  return (
    <span
      className="inline-block h-[5px] w-[5px] shrink-0 rounded-full"
      style={{ background: gold ? ACCENT_GOLD : ACCENT_GREEN }}
      aria-hidden
    />
  );
}
