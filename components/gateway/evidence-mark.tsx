"use client";

import { useEffect, useRef } from "react";

/**
 * Loop Evidence Mark — M7 prototype final: Arc Sweep (R2 Instrument Focus)
 *
 * Approved by human review (mock .shots/refn-2.png):
 * - three open concentric arcs, asymmetric openings (outer top sweep,
 *   mid bottom sweep, inner lower-left sweep)
 * - Evidence at the center: deep-green core + gold ring + gold tick bezel
 *   (enlarged, the instrument's focal point)
 * - nodes on arc endpoints: Signal / Content / Publication / Learning
 * - stage semantics via tiny pure numerals 01–05 only — no word labels
 * - no tail dots
 *
 * Motion (Halftone Reveal role, ≈1.4s, then fully static):
 * Evidence core lights first → tick bezel resolves clockwise → arcs scan
 * outward inner→mid→outer → nodes light at arc endpoints → numerals fade.
 *
 * Engineering: Canvas 2D, DPR ≤ 2, rAF cleanup, rAF-debounced RO,
 * completion timer (rAF starvation), reduced-motion → final frame.
 * Never writes canvas.style (RO feedback loop).
 */

const GREEN = "#7C9482";
const DEEP = "#4F6257";
const SILVER = "#C8C9CB";
const SILVER_DIM = "#B9BCB4";
const GOLD = "#D4B26A";
const NEUTRAL = "#626660";
const NUM_GOLD = "#AE8A44";
const BG = "#F5F6F3";

const REVEAL_MS = 1400;

/* Design space: right-hand section at the 1440 baseline (835×900). */
const DW = 835;
const DH = 900;

const CX = 455; // mark center in section space
const CY = 440;

const RAD = Math.PI / 180;

const ARCS = [
  { r: 200, a0: 195, a1: 345, color: SILVER, w: 2.0, from: 0.6, to: 0.9 }, // outer, top sweep
  { r: 148, a0: 20, a1: 170, color: GREEN, w: 2.6, from: 0.45, to: 0.78 }, // mid, bottom sweep
  { r: 95, a0: 95, a1: 235, color: SILVER_DIM, w: 2.2, from: 0.3, to: 0.62 }, // inner, lower-left
] as const;

function onCircle(r: number, deg: number) {
  return { x: CX + r * Math.cos(deg * RAD), y: CY + r * Math.sin(deg * RAD) };
}

const NODES = {
  signal: { ...onCircle(200, 195), r: 5 },
  content: { ...onCircle(148, 170), r: 9 },
  publication: { ...onCircle(148, 20), r: 9 },
  learning: { x: 450, y: 538, r: 7.5 },
} as const;

const NUMERALS = [
  { text: "01", x: 251, y: 414, gold: false },
  { text: "02", x: 287, y: 440, gold: false },
  { text: "03", x: 616, y: 487, gold: false },
  { text: "04", x: 511, y: 446, gold: true },
  { text: "05", x: 429, y: 572, gold: false },
] as const;

const TICKS = 28;

function smoothstep(t: number, a: number, b: number) {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
}

function draw(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  ctx.clearRect(0, 0, W, H);
  const s = Math.min(W / DW, H / DH);
  const ox = (W - DW * s) / 2;
  const oy = (H - DH * s) / 2;
  const X = (v: number) => ox + v * s;
  const Y = (v: number) => oy + v * s;
  const U = s;

  /* ── Arcs: scan outward, drawn along their sweep ── */
  for (const arc of ARCS) {
    const p = smoothstep(t, arc.from, arc.to);
    if (p <= 0) continue;
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = arc.color;
    ctx.lineWidth = arc.w * U;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(
      X(CX),
      Y(CY),
      arc.r * U,
      arc.a0 * RAD,
      (arc.a0 + (arc.a1 - arc.a0) * p) * RAD
    );
    ctx.stroke();
  }

  /* ── Nodes light at arc endpoints ── */
  // Learning (inner arc starts here)
  const learningP = smoothstep(t, 0.3, 0.42);
  if (learningP > 0) {
    const n = NODES.learning;
    const x = X(n.x);
    const y = Y(n.y);
    ctx.globalAlpha = 0.35 * learningP;
    ctx.strokeStyle = SILVER_DIM;
    ctx.lineWidth = 1.5 * U;
    ctx.beginPath();
    ctx.arc(x, y, 12 * U, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = learningP;
    ctx.fillStyle = GREEN;
    ctx.beginPath();
    ctx.arc(x, y, n.r * U, 0, Math.PI * 2);
    ctx.fill();
  }

  // Publication (mid arc start)
  const pubP = smoothstep(t, 0.45, 0.55);
  if (pubP > 0) {
    const n = NODES.publication;
    ctx.globalAlpha = pubP;
    ctx.fillStyle = BG;
    ctx.beginPath();
    ctx.arc(X(n.x), Y(n.y), n.r * U, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = SILVER_DIM;
    ctx.lineWidth = 2.4 * U;
    ctx.beginPath();
    ctx.arc(X(n.x), Y(n.y), n.r * U, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Content (mid arc end)
  const contentP = smoothstep(t, 0.74, 0.84);
  if (contentP > 0) {
    const n = NODES.content;
    ctx.globalAlpha = contentP;
    ctx.fillStyle = BG;
    ctx.beginPath();
    ctx.arc(X(n.x), Y(n.y), n.r * U, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 2.4 * U;
    ctx.beginPath();
    ctx.arc(X(n.x), Y(n.y), n.r * U, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Signal (outer arc start)
  const signalP = smoothstep(t, 0.6, 0.72);
  if (signalP > 0) {
    const n = NODES.signal;
    ctx.globalAlpha = signalP;
    ctx.fillStyle = NEUTRAL;
    ctx.beginPath();
    ctx.arc(X(n.x), Y(n.y), n.r * U, 0, Math.PI * 2);
    ctx.fill();
  }

  /* ── Evidence: core lights first, then gold ring, then tick bezel ── */
  const coreP = smoothstep(t, 0.0, 0.25);
  if (coreP > 0) {
    ctx.globalAlpha = coreP;
    ctx.fillStyle = DEEP;
    ctx.beginPath();
    ctx.arc(X(CX), Y(CY), 18 * U * (0.6 + 0.4 * coreP), 0, Math.PI * 2);
    ctx.fill();
  }
  const ringP = smoothstep(t, 0.05, 0.35);
  if (ringP > 0) {
    ctx.globalAlpha = 0.95 * ringP;
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2.6 * U;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(X(CX), Y(CY), 26 * U, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ringP);
    ctx.stroke();
  }
  // tick bezel resolves clockwise
  for (let k = 0; k < TICKS; k++) {
    const tickP = smoothstep(t, 0.15 + (k / TICKS) * 0.4, 0.19 + (k / TICKS) * 0.4);
    if (tickP <= 0) continue;
    const ang = (k / TICKS) * Math.PI * 2 - Math.PI / 2;
    const long = k % 5 === 0;
    const r1 = 32 * U;
    const r2 = (long ? 45 : 40) * U;
    ctx.globalAlpha = 0.9 * tickP;
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = (long ? 1.9 : 1.6) * U;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(X(CX) + Math.cos(ang) * r1, Y(CY) + Math.sin(ang) * r1);
    ctx.lineTo(X(CX) + Math.cos(ang) * r2, Y(CY) + Math.sin(ang) * r2);
    ctx.stroke();
  }

  /* ── Numerals fade last ── */
  for (const num of NUMERALS) {
    const numP = smoothstep(t, 0.82, 1.0);
    if (numP <= 0) continue;
    ctx.globalAlpha = numP * 0.9;
    ctx.fillStyle = num.gold ? NUM_GOLD : SILVER_DIM;
    ctx.font = `600 ${14 * U}px "Cormorant Garamond", "Noto Serif SC", serif`;
    ctx.textBaseline = "middle";
    ctx.fillText(num.text, X(num.x), Y(num.y));
  }

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
      draw(ctx, bw, bh, currentT);
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
        return; // fully static after reveal
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
        aria-label="ContentLoop 品牌图形：三段开口弧线环绕中心证据焦点，五个阶段以编号 01 至 05 标记"
      />
    </div>
  );
}
