"use client";

import { useEffect, useRef } from "react";

/**
 * Loop Evidence Mark — M7 high-fidelity prototype (isolated dev route).
 *
 * Per ContentLoop_M7_Visual_Design_Spec.md §29:
 * folded / open / asymmetric trajectory with ≥2 major direction changes:
 *   Signal (small silver) → Content (primary ring) → Publication (ring)
 *   → FOLD down-left → Evidence (visual center: gold outer + green core
 *   + strongest halftone concentration) → Learning (green, lower level)
 *   → open fading tail (halftone dots, not a line).
 * Halftone clusters around semantic structure, densest at Evidence,
 * fast falloff away from the trajectory — never wallpaper.
 *
 * §27 Halftone Reveal: ~1.6s, then essentially static.
 * Engineering: Canvas 2D, DPR ≤ 2, rAF cleanup, rAF-debounced RO,
 * completion timer (rAF starvation), reduced-motion → final frame.
 */

const GREEN = "#7C9482";
const DEEP = "#4F6257";
const SILVER = "#B9BCB4";
const RING_SILVER = "#A9ACA4";
const GOLD = "#D4B26A";
const NEUTRAL = "#626660";
const LABEL_GOLD = "#AE8A44";
const BG = "#F5F6F3";

const REVEAL_MS = 1600;

/* Design space: right-hand section at the 1440 baseline (835×900). */
const DW = 835;
const DH = 900;

const NODES = [
  { x: 149, y: 133, label: "Signal", lx: 26, ly: -14 },
  { x: 300, y: 257, label: "Content", lx: 30, ly: -6 },
  { x: 639, y: 316, label: "Publication", lx: 30, ly: -6 },
  { x: 462, y: 485, label: "Evidence", lx: 56, ly: 18, gold: true },
  { x: 414, y: 683, label: "Learning", lx: 34, ly: -18 },
] as const;

const EVIDENCE = NODES[3];
const LEARNING = NODES[4];

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function smoothstep(t: number, a: number, b: number) {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
}

function catmull(P: readonly { x: number; y: number }[], per: number) {
  const pts: { x: number; y: number }[] = [];
  const cr = (
    p0: { x: number; y: number },
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number },
    t: number
  ) => {
    const t2 = t * t;
    const t3 = t2 * t;
    return {
      x:
        0.5 *
        (2 * p1.x +
          (p2.x - p0.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (3 * p1.x - p0.x - 3 * p2.x + p3.x) * t3),
      y:
        0.5 *
        (2 * p1.y +
          (p2.y - p0.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (3 * p1.y - p0.y - 3 * p2.y + p3.y) * t3),
    };
  };
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)];
    const p1 = P[i];
    const p2 = P[i + 1];
    const p3 = P[Math.min(P.length - 1, i + 2)];
    for (let s = 0; s < per; s++) pts.push(cr(p0, p1, p2, p3, s / per));
  }
  pts.push({ ...P[P.length - 1] });
  return pts;
}

interface Dot {
  x: number;
  y: number;
  r: number;
  a: number;
  color: string;
  threshold: number;
}

/* Direction A — geometric order only. Dots exist exclusively as perfect
   concentric dotted rings: 3 gold rings around Evidence (the visual
   center of gravity), 1 faint silver ring around Learning. No spray,
   no cloud, no jitter, no wallpaper. */
function buildField(): Dot[] {
  const dots: Dot[] = [];

  const ringOfDots = (
    cx: number,
    cy: number,
    radius: number,
    color: string,
    alpha: number,
    dotR: number,
    baseT: number
  ) => {
    const n = Math.max(12, Math.floor((2 * Math.PI * radius) / 16));
    for (let j = 0; j < n; j++) {
      const ang = (j / n) * Math.PI * 2;
      dots.push({
        x: cx + Math.cos(ang) * radius,
        y: cy + Math.sin(ang) * radius,
        r: dotR,
        a: alpha,
        color,
        // dots resolve clockwise as the ring forms
        threshold: baseT + (j / n) * 0.08,
      });
    }
  };

  /* Evidence: three gold rings, the only strong halftone structure */
  ringOfDots(EVIDENCE.x, EVIDENCE.y, 36, GOLD, 0.55, 1.9, 0.62);
  ringOfDots(EVIDENCE.x, EVIDENCE.y, 52, GOLD, 0.42, 1.8, 0.68);
  ringOfDots(EVIDENCE.x, EVIDENCE.y, 68, GOLD, 0.3, 1.6, 0.74);

  /* Learning: one faint structural silver ring */
  ringOfDots(LEARNING.x, LEARNING.y, 26, SILVER, 0.35, 1.5, 0.78);

  return dots;
}

function tailDots(rand: () => number) {
  const arr: { x: number; y: number; r: number; a: number; green: boolean }[] = [];
  let x = LEARNING.x + 42;
  for (let i = 1; i <= 10; i++) {
    arr.push({
      x,
      y: LEARNING.y + 4 - i * 1.2 + (rand() - 0.5) * 5,
      r: Math.max(0.9, 3.4 - i * 0.22),
      a: 0.85 * (1 - i / 12),
      green: i <= 4,
    });
    x += 22 + i * 1.6;
  }
  return arr;
}

function draw(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  pts: { x: number; y: number }[],
  dots: Dot[],
  tail: ReturnType<typeof tailDots>,
  t: number
) {
  ctx.clearRect(0, 0, W, H);
  const s = Math.min(W / DW, H / DH);
  const ox = (W - DW * s) / 2;
  const oy = (H - DH * s) / 2;
  const X = (v: number) => ox + v * s;
  const Y = (v: number) => oy + v * s;
  const U = s; // 1 design px = s canvas px (design tuned at 835×900 ≈ 2.1× the old 400 base)

  /* Halftone */
  for (const d of dots) {
    const appear = smoothstep(t, d.threshold, d.threshold + 0.12);
    if (appear <= 0) continue;
    ctx.globalAlpha = d.a * appear;
    ctx.fillStyle = d.color;
    ctx.beginPath();
    ctx.arc(X(d.x), Y(d.y), d.r * U, 0, Math.PI * 2);
    ctx.fill();
  }

  /* Folded trajectory */
  const pathP = smoothstep(t, 0.12, 0.72);
  if (pathP > 0) {
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 2.2 * U;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    const maxI = Math.floor(pathP * (pts.length - 1));
    for (let i = 0; i <= maxI; i++) {
      if (i === 0) ctx.moveTo(X(pts[0].x), Y(pts[0].y));
      else ctx.lineTo(X(pts[i].x), Y(pts[i].y));
    }
    ctx.stroke();
  }

  /* Open tail — dissolving dots, not a line */
  const tailP = smoothstep(t, 0.8, 1);
  if (tailP > 0) {
    for (const d of tail) {
      ctx.globalAlpha = d.a * tailP;
      ctx.fillStyle = d.green ? GREEN : SILVER;
      ctx.beginPath();
      ctx.arc(X(d.x), Y(d.y), d.r * U, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* Nodes */
  NODES.forEach((n, i) => {
    const appear = smoothstep(t, 0.26 + i * 0.11, 0.4 + i * 0.11);
    if (appear <= 0) return;
    const x = X(n.x);
    const y = Y(n.y);
    const pop = 0.55 + 0.45 * appear;

    ctx.globalAlpha = appear;
    if (i === 0) {
      ctx.fillStyle = NEUTRAL;
      ctx.beginPath();
      ctx.arc(x, y, 5 * U * pop, 0, Math.PI * 2);
      ctx.fill();
    } else if (i === 1) {
      ctx.fillStyle = BG;
      ctx.beginPath();
      ctx.arc(x, y, 9 * U * pop, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = GREEN;
      ctx.lineWidth = 2.4 * U;
      ctx.beginPath();
      ctx.arc(x, y, 9 * U * pop, 0, Math.PI * 2);
      ctx.stroke();
    } else if (i === 2) {
      ctx.fillStyle = BG;
      ctx.beginPath();
      ctx.arc(x, y, 9 * U * pop, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = RING_SILVER;
      ctx.lineWidth = 2.4 * U;
      ctx.beginPath();
      ctx.arc(x, y, 9 * U * pop, 0, Math.PI * 2);
      ctx.stroke();
    } else if (i === 3) {
      const ringP = smoothstep(t, 0.66, 0.92);
      if (ringP > 0) {
        ctx.globalAlpha = 0.9 * ringP;
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 3 * U;
        ctx.beginPath();
        ctx.arc(x, y, 25 * U * pop, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = appear;
      ctx.fillStyle = DEEP;
      ctx.beginPath();
      ctx.arc(x, y, 16 * U * pop, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.globalAlpha = 0.16 * appear;
      ctx.strokeStyle = GREEN;
      ctx.lineWidth = 2 * U;
      ctx.beginPath();
      ctx.arc(x, y, 17 * U * pop, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = appear;
      ctx.fillStyle = GREEN;
      ctx.beginPath();
      ctx.arc(x, y, 10 * U * pop, 0, Math.PI * 2);
      ctx.fill();
    }

    /* Serif italic labels */
    const labelA = smoothstep(t, 0.4 + i * 0.11, 0.55 + i * 0.11);
    if (labelA > 0) {
      ctx.globalAlpha = labelA * 0.9;
      ctx.fillStyle = "gold" in n && n.gold ? LABEL_GOLD : NEUTRAL;
      ctx.font = `italic 500 ${17 * U}px "Cormorant Garamond", "Noto Serif SC", serif`;
      ctx.textBaseline = "middle";
      ctx.fillText(n.label, x + n.lx * U, y + n.ly * U);
    }
  });

  ctx.globalAlpha = 1;
}

export function EvidenceMark({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pts = catmull(NODES, 60);
    const dots = buildField();
    const tail = tailDots(rng(23));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let raf = 0;
    let roRaf = 0;
    let start = 0;
    let currentT = reduced || document.hidden ? 1 : 0;
    let done = currentT === 1;
    let bw = 0;
    let bh = 0;

    const paint = () => {
      if (bw <= 0 || bh <= 0) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(ctx, bw, bh, pts, dots, tail, currentT);
    };

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      if (w <= 0 || h <= 0 || (w === bw && h === bh)) return;
      bw = w;
      bh = h;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      paint();
    };

    const tick = (now: number) => {
      if (!start) start = now;
      currentT = Math.min(1, (now - start) / REVEAL_MS);
      paint();
      if (currentT >= 1) {
        done = true;
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const finishTimer = window.setTimeout(() => {
      currentT = 1;
      done = true;
      cancelAnimationFrame(raf);
      paint();
    }, REVEAL_MS + 120);

    resize();
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(roRaf);
      roRaf = requestAnimationFrame(resize);
    });
    ro.observe(wrap);

    if (!done) raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(roRaf);
      clearTimeout(finishTimer);
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={wrapRef} className={className}>
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        role="img"
        aria-label="ContentLoop 品牌轨迹：线索、内容、发布、证据、经验，延伸至开放的未来"
      />
    </div>
  );
}
