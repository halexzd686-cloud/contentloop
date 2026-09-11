"use client";

import { useEffect, useRef } from "react";

/**
 * Loop Evidence Mark — M7 Phase A Gateway visual (Secondary Brand Mark).
 *
 * One structured, open trajectory:
 *   Signal → Content → Publication → Evidence → Learning → open continuation
 * rendered through a halftone field: sparse dots resolve into structure,
 * the Evidence node resolves strongest (gold), Learning continues into a
 * fading open tail. Total reveal ≈ 1.6s, then the mark becomes static.
 *
 * Canvas 2D, zero dependencies. Reduced motion: final frame immediately
 * (short opacity fade). Halftone is supporting structure, not the dominant
 * visual; nothing stays permanently animated.
 */

const GREEN = "#7C9482";
const SILVER = "#C8C9CB";
const GOLD = "#D4B26A";

const REVEAL_MS = 1600;

/* Open trajectory — cubic bezier, lower-left → upper-right, NOT a loop. */
const B0 = { x: 0.10, y: 0.80 };
const B1 = { x: 0.34, y: 0.50 };
const B2 = { x: 0.52, y: 0.74 };
const B3 = { x: 0.86, y: 0.26 };

/** Five meaningful nodes along the trajectory (t on the curve). */
const NODE_T = [0.08, 0.34, 0.58, 0.80, 0.95] as const;
const EVIDENCE_IDX = 3;
const LEARNING_IDX = 4;

/** Open continuation tail: fading dots beyond Learning, along the curve's exit direction. */
const TAIL_DOTS = 5;

function bezier(t: number) {
  const u = 1 - t;
  return {
    x: u * u * u * B0.x + 3 * u * u * t * B1.x + 3 * u * t * t * B2.x + t * t * t * B3.x,
    y: u * u * u * B0.y + 3 * u * u * t * B1.y + 3 * u * t * t * B2.y + t * t * t * B3.y,
  };
}

/** Deterministic pseudo-random (mulberry32) — layout must be stable. */
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

interface HalftoneDot {
  x: number;
  y: number;
  nearT: number; // closest trajectory parameter, -1 if far
  threshold: number; // reveal time
  rand: number;
}

function buildField(): HalftoneDot[] {
  const rand = rng(7);
  const dots: HalftoneDot[] = [];
  const spacing = 0.048;
  // sample the trajectory for proximity tests
  const samples = Array.from({ length: 80 }, (_, i) => bezier(i / 79));
  for (let gx = spacing / 2; gx < 1; gx += spacing) {
    for (let gy = spacing / 2; gy < 1; gy += spacing) {
      const x = gx + (rand() - 0.5) * spacing * 0.45;
      const y = gy + (rand() - 0.5) * spacing * 0.45;
      let nearT = -1;
      let best = Infinity;
      for (let i = 0; i < samples.length; i++) {
        const d = Math.hypot(samples[i].x - x, samples[i].y - y);
        if (d < best) {
          best = d;
          nearT = i / 79;
        }
      }
      const near = best < 0.055;
      dots.push({
        x,
        y,
        nearT: near ? nearT : -1,
        // scattered dots trickle in early; path dots appear as the
        // trajectory passes them
        threshold: near ? 0.18 + 0.5 * nearT : 0.02 + rand() * 0.3,
        rand: rand(),
      });
    }
  }
  return dots;
}

function draw(ctx: CanvasRenderingContext2D, size: number, dots: HalftoneDot[], t: number) {
  ctx.clearRect(0, 0, size, size);
  const S = size;

  /* ── Halftone field (supporting structure) ── */
  for (const d of dots) {
    const appear = smoothstep(t, d.threshold, d.threshold + 0.14);
    if (appear <= 0) continue;
    const near = d.nearT >= 0;
    const baseR = near ? 1.5 : 0.9 + d.rand * 0.5;
    const baseA = near ? 0.55 : 0.10 + d.rand * 0.08;
    ctx.globalAlpha = baseA * appear;
    ctx.fillStyle = near ? GREEN : SILVER;
    ctx.beginPath();
    ctx.arc(d.x * S, d.y * S, baseR * (S / 400), 0, Math.PI * 2);
    ctx.fill();
  }

  /* ── Trajectory path (main, green) ── */
  const pathP = smoothstep(t, 0.15, 0.78);
  if (pathP > 0) {
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 2 * (S / 400);
    ctx.lineCap = "round";
    ctx.beginPath();
    const steps = Math.max(2, Math.floor(pathP * 72));
    for (let i = 0; i <= steps; i++) {
      const p = bezier((i / 72) * 1); // full param range, clipped by steps
      if ((i / 72) > pathP) break;
      if (i === 0) ctx.moveTo(p.x * S, p.y * S);
      else ctx.lineTo(p.x * S, p.y * S);
    }
    ctx.stroke();
  }

  /* ── Open continuation tail (structural, fading) ── */
  const tailP = smoothstep(t, 0.82, 1);
  if (tailP > 0) {
    const p3 = B3;
    const prev = bezier(0.985);
    const dir = { x: p3.x - prev.x, y: p3.y - prev.y };
    const len = Math.hypot(dir.x, dir.y) || 1;
    const ux = dir.x / len;
    const uy = dir.y / len;
    for (let i = 1; i <= TAIL_DOTS; i++) {
      const dist = 0.05 + i * 0.055;
      const x = (p3.x + ux * dist) * S;
      const y = (p3.y + uy * dist) * S;
      const fade = (1 - i / (TAIL_DOTS + 1)) * 0.5;
      ctx.globalAlpha = fade * tailP;
      ctx.fillStyle = SILVER;
      ctx.beginPath();
      ctx.arc(x, y, (2.2 - i * 0.25) * (S / 400), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ── Nodes: Signal → Content → Publication → Evidence → Learning ── */
  NODE_T.forEach((nt, i) => {
    const appear = smoothstep(t, 0.3 + i * 0.12, 0.44 + i * 0.12);
    if (appear <= 0) return;
    const p = bezier(nt);
    const x = p.x * S;
    const y = p.y * S;
    const isEvidence = i === EVIDENCE_IDX;
    const isLearning = i === LEARNING_IDX;
    const r = (isEvidence ? 7 : isLearning ? 5.5 : 4.5) * (S / 400) * (0.6 + 0.4 * appear);

    ctx.globalAlpha = appear;
    ctx.fillStyle = isEvidence ? GOLD : GREEN;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    if (isEvidence) {
      // Evidence: visually strongest — gold core + resolved ring
      const ringP = smoothstep(t, 0.72, 0.95);
      if (ringP > 0) {
        ctx.globalAlpha = 0.75 * ringP;
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 1.4 * (S / 400);
        ctx.beginPath();
        ctx.arc(x, y, r + 5 * (S / 400) * ringP, 0, Math.PI * 2);
        ctx.stroke();
      }
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
    if (!ctx) return; // jsdom / no 2d context — render container only

    const dots = buildField();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let size = 0;
    let raf = 0;
    let start = 0;
    let done = false;

    const paint = (t: number) => {
      if (size <= 0) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(ctx, size, dots, t);
    };

    const tick = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / REVEAL_MS);
      paint(t);
      if (t >= 1) {
        done = true;
        return; // stop — the mark becomes static, no background loop
      }
      raf = requestAnimationFrame(tick);
    };

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      size = Math.min(rect.width, rect.height);
      if (size <= 0) return;
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      if (done || reduced || document.hidden) paint(1);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    if (reduced || document.hidden) {
      paint(1);
      done = true;
    } else {
      raf = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={wrapRef} className={`flex items-center justify-center ${className}`}>
      <canvas ref={canvasRef} role="img" aria-label="ContentLoop 品牌轨迹：线索、内容、发布、证据、经验，延伸至开放的未来" />
    </div>
  );
}
