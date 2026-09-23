/**
 * M9 ③ dual-theme canvas helpers.
 *
 * Canvas 2D silently ignores var() in fill/stroke styles (reads back
 * #000000), so canvas components resolve token values in JS via
 * getComputedStyle, and re-resolve + repaint on "cl-themechange"
 * (dispatched by the sidebar theme toggle; RAF loops keep running
 * with the new values, reduced-motion static frames repaint once).
 */

export function readToken(token: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim();
  return v || fallback;
}

/** Resolve a { key: "--token" } map into concrete colors, keeping the
    original hexes as fallbacks so light pixels are unchanged if a
    token is ever missing. */
export function resolveTokens<T extends Record<string, string>>(
  map: { [K in keyof T]: string },
  fallbacks: T
): T {
  const out = { ...fallbacks };
  for (const k of Object.keys(fallbacks) as (keyof T)[]) {
    out[k] = readToken(map[k], fallbacks[k]) as T[keyof T];
  }
  return out;
}

/** Subscribe to theme switches; returns the unsubscribe (use in
    effect cleanup). */
export function onThemeChange(cb: () => void): () => void {
  window.addEventListener("cl-themechange", cb);
  return () => window.removeEventListener("cl-themechange", cb);
}
