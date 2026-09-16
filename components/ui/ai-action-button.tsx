"use client";

/**
 * AiActionButton — M7 A2 "magic" Loop AI action (human-approved).
 *
 * Idle: aurora conic border travels behind the document face, inner
 * aura breathes, orbit glyph rotates slowly — restrained but alive.
 * Click fires onClick immediately (no click morph — removed per
 * review); the caller swaps in ThinkingOrbs while generating.
 * Styles live in globals.css (.ai-magic-btn*), frozen palette only.
 *
 * Used for every genuine AI generation entry (brief draft, platform
 * adapt, signal analyze, performance analyze).
 */
export function AiActionButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} className="ai-magic-btn w-full">
      <span className="ai-magic-btn__face">
        <svg
          className="ai-magic-btn__glyph"
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#7C9482"
          strokeWidth="1.7"
          strokeLinecap="round"
          aria-hidden
        >
          <ellipse cx="12" cy="12" rx="8.5" ry="3.6" transform="rotate(-24 12 12)" />
          <ellipse cx="12" cy="12" rx="8.5" ry="3.6" transform="rotate(38 12 12)" opacity="0.55" />
          <circle cx="12" cy="12" r="1.9" fill="#7C9482" stroke="none" />
          <circle cx="18.6" cy="7.8" r="1.3" fill="#D4B26A" stroke="none" />
        </svg>
        <span style={{ position: "relative" }}>{label}</span>
      </span>
    </button>
  );
}
