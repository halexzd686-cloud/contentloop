"use client";

/**
 * FountainLoader — ContentLoop page/component transition motion.
 * Reference: MetalForge fountain loader (droplets spout up and fall).
 * SVG + CSS only; ContentLoop palette (primary droplets, silver track).
 * Reduced-motion: static droplets (CSS animation disabled globally).
 *
 * Engineering note: keyframes use no CSS variables (frozen spiral rule);
 * per-droplet offsets are static positions, stagger via animation-delay.
 */

const DROPLETS: { x: number; delay: number; dur: number }[] = [
  { x: 12, delay: 0, dur: 1400 },
  { x: 8.5, delay: 180, dur: 1400 },
  { x: 15.5, delay: 180, dur: 1400 },
  { x: 5.5, delay: 380, dur: 1400 },
  { x: 18.5, delay: 380, dur: 1400 },
];

export function FountainLoader({
  size = 24,
  label,
  className = "",
}: {
  size?: number;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex flex-col items-center gap-2 ${className}`}
      role="status"
      aria-label={label ?? "加载中"}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        aria-hidden
        className="fountain-loader"
        style={{ display: "inline-block", overflow: "visible" }}
      >
        {/* track: faint basin */}
        <ellipse cx="12" cy="20" rx="8" ry="1.6" fill="none" stroke="#C8C9CB" strokeWidth="1" opacity="0.8" />
        {/* spout */}
        <line x1="12" y1="20" x2="12" y2="13" stroke="#C8C9CB" strokeWidth="1.4" strokeLinecap="round" />
        {DROPLETS.map((d, i) => (
          <circle
            key={i}
            cx={d.x}
            cy="13"
            r="1.7"
            fill="#7C9482"
            className="fountain-dot"
            style={{
              animationDelay: `${d.delay}ms`,
              animationDuration: `${d.dur}ms`,
            }}
          />
        ))}
      </svg>
      {label && (
        <span className="text-[13px] text-ink-secondary">{label}</span>
      )}
      <style>{`
        @keyframes fountain-rise {
          0%   { transform: translateY(0);      opacity: 0; }
          18%  { opacity: 1; }
          55%  { transform: translateY(-9px);   opacity: 1; }
          85%  { opacity: 0.5; }
          100% { transform: translateY(1px);    opacity: 0; }
        }
        .fountain-dot {
          animation-name: fountain-rise;
          animation-timing-function: cubic-bezier(0.3, 0.1, 0.5, 0.9);
          animation-iteration-count: infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .fountain-dot { animation: none; opacity: 0.7; }
        }
      `}</style>
    </span>
  );
}
