"use client";

import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

/**
 * CollapsibleRail — M9 responsive right-rail + Loop AI 审阅展开 (方案②).
 *
 * ≥1200px: children render inline as the plain rail, with a ‹ expand
 * button at the top-right (aria-label 展开审阅). Expanding turns the SAME
 * host element into an overlay review panel — children never remount, so
 * unsaved AI proposal edits survive. An invisible spacer keeps the rail's
 * width, so the document column stays put (overlay, not squeeze).
 *
 * Overlay (both breakpoints): fixed right edge, full height,
 * min(720px, 92vw) wide, hairline left border, var(--cl-surface) surface, 260ms
 * slide-in (reduced-motion instant). › button / Esc / outside click close.
 * Typography switches to the review ramp via [data-loop-ai-expanded]
 * descendant rules in globals.css — child components are untouched.
 *
 * <1200px: rail leaves the flow; a floating trigger (bottom-right) opens
 * the same 720px review overlay directly (one unified width, no tiers).
 *
 * SSR-safe: the initial render is always the expanded-inline assumption;
 * the media query applies after hydration. State is local only.
 */

const RAIL_QUERY = "(max-width: 1199.98px)";

const OVERLAY_CLASS =
  "fixed inset-y-0 right-0 z-40 w-[min(720px,92vw)] overflow-y-auto px-8 pb-10 pt-6 transition-transform duration-[260ms] ease-out motion-reduce:transition-none";

const OVERLAY_SHADOW = "-16px 0 40px var(--ink-tint)";

export function CollapsibleRail({
  label,
  className,
  style,
  children,
}: {
  label: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false); // <1200: rail leaves the flow
  const [expanded, setExpanded] = useState(false); // review overlay open
  const [entered, setEntered] = useState(false);

  const close = useCallback(() => {
    setExpanded(false);
    setEntered(false);
  }, []);

  useEffect(() => {
    const mql = window.matchMedia(RAIL_QUERY);
    const onChange = () => setCollapsed(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setEntered(true))
    );
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded, close]);

  function toggleButton(isOverlay: boolean) {
    return (
      <button
        type="button"
        aria-label={isOverlay ? "收起审阅" : "展开审阅"}
        onClick={() => (isOverlay ? close() : setExpanded(true))}
        className={`${
          isOverlay ? "fixed right-4 top-4" : "absolute right-3 top-3"
        } z-10 flex h-7 w-7 items-center justify-center rounded-[5px] text-ink-secondary transition-colors duration-150 hover:bg-surface-subtle hover:text-ink-primary`}
        style={{
          border: "1px solid var(--border)",
          background: "var(--cl-surface)",
        }}
      >
        {isOverlay ? (
          <ChevronRight className="h-4 w-4" aria-hidden />
        ) : (
          <ChevronLeft className="h-4 w-4" aria-hidden />
        )}
      </button>
    );
  }

  if (!collapsed) {
    // ≥1200: inline rail. Keys keep the host element identical across the
    // inline ↔ overlay switch, preserving all child state.
    return (
      <>
        {expanded && (
          <div
            key="backdrop"
            aria-hidden
            className="fixed inset-0 z-30"
            onClick={close}
          />
        )}
        {expanded && (
          <div
            key="spacer"
            aria-hidden
            className={`invisible ${className ?? ""}`}
            style={style}
          />
        )}
        <div
          key="host"
          data-loop-ai-expanded={expanded ? "" : undefined}
          role={expanded ? "dialog" : undefined}
          aria-label={expanded ? label : undefined}
          className={
            expanded
              ? `${OVERLAY_CLASS} ${
                  entered ? "translate-x-0" : "translate-x-full"
                }`
              : `relative ${className ?? ""}`
          }
          style={
            expanded ? { ...style, boxShadow: OVERLAY_SHADOW } : style
          }
        >
          {children}
          {toggleButton(expanded)}
        </div>
      </>
    );
  }

  // <1200: floating trigger; overlay opens directly as the 720px review.
  return (
    <>
      {expanded && (
        <div aria-hidden className="fixed inset-0 z-30" onClick={close} />
      )}
      {!expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="fixed bottom-6 right-6 z-30 flex h-9 items-center gap-2 rounded-[6px] px-3.5 text-xs font-medium transition-colors duration-150 hover:bg-[var(--cl-overlay)]"
          style={{
            border: "1px solid var(--border)",
            background: "var(--cl-surface)",
            color: "var(--cl-neutral)",
            boxShadow: "0 2px 12px var(--ink-tint)",
          }}
        >
          <Sparkles
            className="h-3.5 w-3.5"
            style={{ color: "var(--cl-primary)" }}
            aria-hidden
          />
          {label}
        </button>
      )}
      {expanded && (
        <div
          data-loop-ai-expanded=""
          role="dialog"
          aria-label={label}
          className={`${OVERLAY_CLASS} ${
            entered ? "translate-x-0" : "translate-x-full"
          }`}
          style={{ ...style, boxShadow: OVERLAY_SHADOW }}
        >
          {children}
          {toggleButton(true)}
        </div>
      )}
    </>
  );
}
