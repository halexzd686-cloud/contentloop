"use client";

import { useEffect, useRef } from "react";
import { resolveTokens, onThemeChange } from "@/lib/theme";

/**
 * RibbonPillLoader — data-loading motion (M7, human-approved).
 *
 * Per the MetalForge thinking-orbs/ribbon reference (style=ribbon,
 * showsPill=1, showsLabel=1): particles travel a lemniscate (∞)
 * ribbon orbit, weaving over/under at the crossing with depth-scaled
 * size and alpha; a gold insight bead trails last. The pill shell
 * uses the reference's light-theme values (pill #ECECEF, label
 * #25242A), which sit inside our silver/ink tokens; accent maps to
 * #7C9482 / #D4B26A per the frozen palette.
 * M9 ③: shell/label now read --pill-bg / --cl-ink-strong; canvas
 * colors resolve from tokens at runtime and re-resolve on
 * "cl-themechange".
 *
 * Semantic split: ribbon = DATA READING (metrics fetch), gyro
 * ThinkingOrbs = AI REASONING. Different shape, different meaning.
 *
 * Engineering contract mirrors ThinkingOrbs: zero per-frame React
 * renders, RAF cleanup, DPR ≤ 2, offscreen/hidden pause,
 * reduced-motion static frame.
 */

const TOKEN_MAP = {
  primary: "--cl-primary",
  insight: "--cl-gold",
  ring: "--cl-ring", // track = ring hue at 0.55 alpha (drawn via globalAlpha)
} as const;

type PaletteKey = keyof typeof TOKEN_MAP;
type Palette = Record<PaletteKey, string>;

const FALLBACK: Palette = {
  primary: "#7C9482",
  insight: "#D4B26A",
  ring: "#8B978F",
};

const CW = 72; // canvas css width
const CH = 34; // canvas css height

const DOTS = [
  { phase: 0.0, r: 3.4, color: "primary" },
  { phase: 1.4, r: 2.8, color: "primary" },
  { phase: 2.9, r: 2.4, color: "primary" },
  { phase: 4.3, r: 2.2, color: "insight" },
] as const satisfies readonly { phase: number; r: number; color: PaletteKey }[];

const SPEED = 1.05; // rad/s, calm per reference

export function RibbonPillLoader({
  label = "正在加载…",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let raf = 0;
    let running = false;
    let inView = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pal = resolveTokens<Palette>(TOKEN_MAP, FALLBACK);
    /* M9 ③: re-resolve on theme switch — RAF loop reads pal per frame;
       the reduced-motion static frame repaints once. */
    const offTheme = onThemeChange(() => {
      Object.assign(pal, resolveTokens<Palette>(TOKEN_MAP, FALLBACK));
      if (reduced) drawFrame(0.7);
    });

    const cx = CW / 2;
    const cy = CH / 2;
    const A = CW * 0.42;
    const B = CH * 0.3;

    const point = (t: number) => ({
      x: cx + A * Math.cos(t),
      y: cy + B * Math.sin(t) * Math.cos(t) * 2,
      depth: 0.5 + 0.5 * Math.sin(t + Math.PI / 4),
    });

    const drawFrame = (now: number) => {
      const t0 = now * SPEED;
      ctx.clearRect(0, 0, CW, CH);

      // ribbon track
      ctx.beginPath();
      for (let i = 0; i <= 90; i++) {
        const p = point((i / 90) * Math.PI * 2);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.strokeStyle = pal.ring;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // particles, far → near
      const ds = DOTS.map((d) => ({ ...d, p: point(t0 + d.phase) })).sort(
        (a, b) => a.p.depth - b.p.depth
      );
      for (const d of ds) {
        const s = 0.55 + 0.65 * d.p.depth;
        ctx.globalAlpha = 0.3 + 0.7 * d.p.depth;
        ctx.beginPath();
        ctx.arc(d.p.x, d.p.y, d.r * s, 0, Math.PI * 2);
        ctx.fillStyle = pal[d.color];
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const resize = () => {
      canvas.width = CW * dpr;
      canvas.height = CH * dpr;
      canvas.style.width = `${CW}px`;
      canvas.style.height = `${CH}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduced) drawFrame(0.7);
    };

    const loop = (now: number) => {
      if (!running) return;
      drawFrame(now / 1000);
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      if (running || reduced) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    resize();
    if (reduced) return offTheme;

    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (inView && !document.hidden) start();
        else stop();
      },
      { threshold: 0.05 }
    );
    io.observe(canvas);
    const onVisibility = () => {
      if (document.hidden) stop();
      else if (inView) start();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      offTheme();
    };
  }, []);

  return (
    <span
      className={`inline-flex items-center gap-3 rounded-full py-2.5 pl-3 pr-5 ${className}`}
      style={{
        background: "var(--pill-bg)",
        border: "1px solid var(--border)",
      }}
      role="status"
      aria-label={label}
    >
      <canvas
        ref={canvasRef}
        aria-hidden
        style={{ width: CW, height: CH }}
      />
      <span
        className="text-[12.5px] font-medium"
        style={{ color: "var(--cl-ink-strong)" }}
      >
        {label}
      </span>
    </span>
  );
}
