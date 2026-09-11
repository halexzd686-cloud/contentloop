"use client";

import { useMemo } from "react";

/**
 * SpiralLoader — ContentLoop system-processing motion (M7 visual
 * fidelity pass).
 *
 * True Archimedean spiral geometry (r = a + bθ), not a broken ring.
 * Track = full faint spiral; active = a segment moving along the path
 * via stroke-dashoffset (not rotation-only). Optical-size variants:
 * 16px ≈ 1.4 turns (simplest, strongest stroke), 24px ≈ 1.6, 32px ≈ 1.9.
 * Reduced-motion: static spiral glyph; surrounding text carries state.
 */

const ACTIVE = "#7C9482";
const TRACK = "#C8C9CB";

/** Optical variants — turns / stroke tuned per size for legibility. */
function variantFor(size: number) {
  if (size <= 16) return { turns: 1.4, stroke: 2.4 };
  if (size <= 24) return { turns: 1.6, stroke: 2.4 };
  return { turns: 1.9, stroke: 2.5 };
}

/** Build an Archimedean spiral path in a 24×24 viewBox. */
function spiralPath(turns: number): string {
  const cx = 12;
  const cy = 12;
  const a0 = 0.9; // inner radius
  const b = (11.2 - a0) / (turns * Math.PI * 2);
  const steps = Math.ceil(turns * 64);
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const th = (i / steps) * turns * Math.PI * 2;
    const r = a0 + b * th;
    const x = cx + Math.cos(th) * r;
    const y = cy + Math.sin(th) * r;
    d += i === 0 ? `M ${x.toFixed(2)} ${y.toFixed(2)}` : ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return d;
}

export function SpiralLoader({
  size = 16,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const { d, stroke } = useMemo(() => {
    const v = variantFor(size);
    return { d: spiralPath(v.turns), stroke: v.stroke };
  }, [size]);

  // pathLength=100 normalizes dash math: active segment = 42% of the
  // path, keyframes use size-independent constants (see globals.css).
  // var()-in-keyframes proved unreliable in Chromium — do not reintroduce.
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={`spiral-loader ${className}`}
      role="status"
      aria-label="处理中"
      style={{
        display: "inline-block",
        verticalAlign: "middle",
        flexShrink: 0,
      }}
    >
      {/* track: full spiral, faint structural */}
      <path
        d={d}
        fill="none"
        stroke={TRACK}
        strokeWidth={stroke}
        strokeLinecap="round"
        opacity={0.5}
      />
      {/* active segment travels along the spiral path */}
      <path
        d={d}
        pathLength={100}
        fill="none"
        stroke={ACTIVE}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray="42 142"
        className="spiral-loader-active"
      />
    </svg>
  );
}
