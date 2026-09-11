"use client";

/**
 * SpiralLoader — ContentLoop system-processing motion (M7).
 *
 * SVG + CSS only. Active arc on a quiet track, transparent background.
 * Crisp at 16px (button context), no layout shift. Reduced-motion:
 * static spiral glyph; surrounding text carries the processing state.
 */

const ACTIVE = "#7C9482";
const TRACK = "#C8C9CB";

export function SpiralLoader({
  size = 16,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const stroke = size <= 16 ? 2.2 : 2.6;
  const r = 8.5;
  const arc = Math.PI * r; // half circumference

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={`spiral-loader ${className}`}
      role="status"
      aria-label="处理中"
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}
    >
      <circle
        cx="12" cy="12" r={r}
        fill="none" stroke={TRACK} strokeWidth={stroke}
        opacity={0.5}
      />
      <circle
        cx="12" cy="12" r={r}
        fill="none" stroke={ACTIVE} strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${arc * 1.25} ${arc * 2.75}`}
        className="spiral-loader-arc"
      />
      {/* inner spiral turn — the distinguishing glyph, static or not */}
      <circle
        cx="12" cy="12" r={4.2}
        fill="none" stroke={ACTIVE} strokeWidth={stroke * 0.8}
        strokeLinecap="round"
        strokeDasharray={`${Math.PI * 4.2 * 0.7} ${Math.PI * 4.2 * 1.3}`}
        className="spiral-loader-arc-inner"
        opacity={0.85}
      />
    </svg>
  );
}
