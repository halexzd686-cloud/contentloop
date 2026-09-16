"use client";

import { useState } from "react";

/**
 * AiActionButton — M7 Studio Loop AI action (approved prototype
 * studio-s1..s6): orbit glyph (green ellipses + gold insight dot)
 * on a quiet document-gradient field; hairline border turns
 * primary on hover. Used for genuine AI proposals only —
 * generation state is handled by callers (button hides,
 * ThinkingOrbs shows).
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
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex h-11 w-full items-center justify-center gap-2.5 rounded-[6px] text-[13px] font-medium transition-colors duration-150 disabled:opacity-50"
      style={{
        border: `1px solid ${hover ? "#7C9482" : "rgba(200,201,203,0.9)"}`,
        background: "linear-gradient(180deg, #FFFFFF 0%, #F6F7F2 100%)",
        color: "#20231F",
      }}
    >
      <svg
        width="18"
        height="18"
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
      {label}
    </button>
  );
}
