"use client";

import { useEffect, useRef } from "react";

/**
 * Loop Evidence Mark — M7 Phase A.1 (visual fidelity correction, pass 2)
 *
 * Faithful to the approved high-fidelity reference:
 *
 *   Signal (top, tiny dark point)
 *     → sweep down-right → Content (green ring)
 *       → gentle arc right → Publication (silver ring, rightmost)
 *         → FOLDS back down-left → Evidence (center of gravity:
 *           dark-green core + gold ring + concentric golden sunburst)
 *           → Learning (lower level, green filled + soft halo)
 *             → open horizontal tail of dissolving dots to the right
 *
 * Halftone is spray-like and semantic: fans along the upper sweep, a
 * cloud around Publication, a dense golden sunburst around Evidence,
 * sparse around Signal, dissolving after Learning. Not wallpaper.
 *
 * Canvas 2D, zero dependencies. Reveal ≈ 1.6s then fully static.
 * Reduced motion / rAF-starved environments: final frame guaranteed
 * by a completion timer. Never writes canvas.style (RO feedback loop).
 */

const GREEN = "#7C9482";
const SILVER = "#C8C9CB";
const GOLD = "#D4B26A";
const NEUTRAL = "#626660";
const LABEL_GOLD = "#AE8A44";
const BG = "#F5F6F3"; // cl-paper — node interiors punch out the path

const REVEAL_MS = 1600;

/* ── Folded trajectory: five semantic nodes (normalized coords) ── */
const NODES = [
  { x: 0.44, y: 0.09 }, // Signal
  { x: 0.59, y: 0.26 }, // Content
  { x: 0.80, y: 0.335 }, // Publication (rightmost)
  { x: 0.67, y: 0.54 }, // Evidence (center of gravity)
  { x: 0.61, y: 0.75 }, // Learning (lower level)
] as const;

const EVIDENCE = { x: NODES[3].x, y: NODES[3].y };

const NODE_LABELS = [
  { text: "Signal", dx: 0.034, dy: -0.006 },
  { text: "Content", dx: 0.042, dy: 0.0 },
  { text: "Publication", dx: 0.032, dy: -0.002 },
  { text: "Evidence", dx: 0.060, dy: 0.022, gold: true },
  { text: "Learning", dx: 0.048, dy: -0.022 }, // above the tail line
] as const;

/** Catmull-Rom through the five nodes → smooth folded polyline. */
function buildPath(samplesPerSeg = 48): { x: number; y: number }[] {
  const P = NODES.map((n) => ({ ...n }));
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
    for (let s = 0; s < samplesPerSeg; s++) {
      pts.push(cr(p0, p1, p2, p3, s / samplesPerSeg));
    }
  }
  pts.push({ ...P[P.length - 1] });
  return pts;
}

function pathPoint(pts: { x: number; y: number }[], t: number) {
  const i = Math.min(pts.length - 1, Math.max(0, Math.round(t * (pts.length - 1))));
  return pts[i];
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
  r: number; // design-unit radius (400 base)
  a: number; // final alpha
  color: string;
  threshold: number; // reveal time
}

function buildField(pts: { x: number; y: number }[]): HalftoneDot[] {
  const rand = rng(11);
  const dots: HalftoneDot[] = [];

  /* Spray fans along the upper sweep (Signal→Publication): biased to
     the lower-right side, cone widens along the path, sparse at Signal. */
  for (let i = 0; i < 420; i++) {
    const t = Math.pow(rand(), 1.25) * 0.52; // upper sweep only
    const density = 0.15 + 0.85 * (t / 0.52); // sparse near Signal
    if (rand() > density) continue;
    const p = pathPoint(pts, t);
    const p2 = pathPoint(pts, Math.min(1, t + 0.01));
    let nx = -(p2.y - p.y);
    let ny = p2.x - p.x;
    const nl = Math.hypot(nx, ny) || 1;
    nx /= nl;
    ny /= nl;
    if (ny < 0) {
      nx = -nx;
      ny = -ny; // bias the fan to the lower side of the sweep
    }
    const side = rand() < 0.72 ? 1 : -1; // mostly below, some above
    const dist = Math.pow(rand(), 1.5) * (0.03 + 0.11 * (t / 0.52));
    const x = p.x + nx * dist * side + (rand() - 0.5) * 0.014;
    const y = p.y + ny * dist * side + (rand() - 0.5) * 0.014;
    if (x < 0.01 || x > 0.99 || y < 0.01 || y > 0.99) continue;
    const closeness = 1 - dist / 0.14;
    dots.push({
      x,
      y,
      r: 0.7 + closeness * 1.2 + rand() * 0.3,
      a: 0.12 + Math.max(0, closeness) * 0.38,
      color: closeness > 0.5 ? GREEN : SILVER,
      threshold: 0.14 + 0.5 * t + rand() * 0.06,
    });
  }

  /* Publication cloud — local concentration right/below the ring. */
  for (let i = 0; i < 60; i++) {
    const ang = rand() * Math.PI * 2;
    const rad = Math.pow(rand(), 1.3) * 0.1;
    const x = NODES[2].x + Math.cos(ang) * rad + 0.02;
    const y = NODES[2].y + Math.sin(ang) * rad + 0.015;
    if (x < 0.01 || x > 0.99 || y < 0.01 || y > 0.99) continue;
    const fade = 1 - rad / 0.11;
    dots.push({
      x,
      y,
      r: 0.7 + rand() * 0.9,
      a: 0.1 + Math.max(0, fade) * 0.3,
      color: fade > 0.5 ? GREEN : SILVER,
      threshold: 0.3 + rand() * 0.15,
    });
  }

  /* Evidence sunburst — concentric golden dotted arcs; the strongest
     local structure on the canvas. */
  for (let k = 0; k < 11; k++) {
    const rad = 0.042 + k * 0.0135;
    const n = Math.max(8, Math.floor((2 * Math.PI * rad) / 0.015));
    for (let j = 0; j < n; j++) {
      const ang = (j / n) * Math.PI * 2 + (rand() - 0.5) * 0.06;
      const x = EVIDENCE.x + Math.cos(ang) * rad;
      const y = EVIDENCE.y + Math.sin(ang) * rad;
      if (x < 0.01 || x > 0.99 || y < 0.01 || y > 0.99) continue;
      const fade = 1 - k / 12;
      dots.push({
        x,
        y,
        r: 1.25 - k * 0.055,
        a: 0.2 + fade * 0.5,
        color: GOLD,
        threshold: 0.62 + k * 0.024 + rand() * 0.04,
      });
    }
  }

  /* Learning halo — modest silver/green scatter below-left. */
  for (let i = 0; i < 34; i++) {
    const ang = rand() * Math.PI * 2;
    const rad = 0.035 + Math.pow(rand(), 1.2) * 0.07;
    const x = NODES[4].x + Math.cos(ang) * rad - 0.015;
    const y = NODES[4].y + Math.sin(ang) * rad + 0.02;
    if (x < 0.01 || x > 0.99 || y < 0.01 || y > 0.99) continue;
    dots.push({
      x,
      y,
      r: 0.6 + rand() * 0.8,
      a: 0.08 + rand() * 0.2,
      color: rand() > 0.6 ? GREEN : SILVER,
      threshold: 0.66 + rand() * 0.2,
    });
  }

  /* A few ambient specks so the field never reads as clipped. */
  for (let i = 0; i < 16; i++) {
    dots.push({
      x: 0.2 + rand() * 0.75,
      y: 0.05 + rand() * 0.85,
      r: 0.6 + rand() * 0.5,
      a: 0.04 + rand() * 0.05,
      color: SILVER,
      threshold: rand() * 0.3,
    });
  }

  return dots;
}

/** Open tail after Learning: a horizontal row of dissolving dots. */
function tailDots() {
  const rand = rng(23);
  const arr: { x: number; y: number; r: number; a: number; green: boolean }[] = [];
  const start = NODES[4];
  let x = start.x + 0.055;
  for (let i = 1; i <= 8; i++) {
    arr.push({
      x,
      y: start.y + 0.004 + (rand() - 0.5) * 0.008,
      r: 2.2 - i * 0.16,
      a: 0.75 * (1 - i / 9.5),
      green: i <= 4, // Learning green dissolves into structural silver
    });
    x += 0.034 + i * 0.002; // spacing widens as the trail dissolves
  }
  return arr;
}

function draw(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  pts: { x: number; y: number }[],
  dots: HalftoneDot[],
  tail: ReturnType<typeof tailDots>,
  t: number
) {
  ctx.clearRect(0, 0, W, H);
  const S = Math.min(W, H);
  const ox = (W - S) / 2;
  const oy = (H - S) / 2;
  const X = (v: number) => ox + v * S;
  const Y = (v: number) => oy + v * S;
  const U = S / 400;

  /* ── Halftone field (semantic sprays, not wallpaper) ── */
  for (const d of dots) {
    const appear = smoothstep(t, d.threshold, d.threshold + 0.12);
    if (appear <= 0) continue;
    ctx.globalAlpha = d.a * appear;
    ctx.fillStyle = d.color;
    ctx.beginPath();
    ctx.arc(X(d.x), Y(d.y), d.r * U, 0, Math.PI * 2);
    ctx.fill();
  }

  /* ── Folded trajectory (thin, restrained) ── */
  const pathP = smoothstep(t, 0.12, 0.72);
  if (pathP > 0) {
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 1.9 * U;
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

  /* ── Open continuation tail — dissolving dots, NOT a solid line ── */
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

  /* ── Nodes — Signal → Content → Publication → Evidence → Learning ── */
  NODES.forEach((n, i) => {
    const appear = smoothstep(t, 0.26 + i * 0.11, 0.4 + i * 0.11);
    if (appear <= 0) return;
    const x = X(n.x);
    const y = Y(n.y);
    const pop = 0.55 + 0.45 * appear;

    ctx.globalAlpha = appear;
    if (i === 0) {
      // Signal: tiny dark point
      ctx.fillStyle = NEUTRAL;
      ctx.beginPath();
      ctx.arc(x, y, 3 * U * pop, 0, Math.PI * 2);
      ctx.fill();
    } else if (i === 1) {
      // Content: primary ring node
      ctx.fillStyle = BG;
      ctx.beginPath();
      ctx.arc(x, y, 6.6 * U * pop, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = GREEN;
      ctx.lineWidth = 2.2 * U;
      ctx.beginPath();
      ctx.arc(x, y, 6.6 * U * pop, 0, Math.PI * 2);
      ctx.stroke();
    } else if (i === 2) {
      // Publication: structural ring node
      ctx.fillStyle = BG;
      ctx.beginPath();
      ctx.arc(x, y, 6.4 * U * pop, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = SILVER;
      ctx.lineWidth = 2.2 * U;
      ctx.beginPath();
      ctx.arc(x, y, 6.4 * U * pop, 0, Math.PI * 2);
      ctx.stroke();
    } else if (i === 3) {
      // Evidence: center of gravity — dark-green core + gold ring + halo
      const ringP = smoothstep(t, 0.66, 0.92);
      if (ringP > 0) {
        ctx.globalAlpha = 0.2 * ringP;
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 1.6 * U;
        ctx.beginPath();
        ctx.arc(x, y, 21 * U * pop, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.9 * ringP;
        ctx.lineWidth = 2.6 * U;
        ctx.beginPath();
        ctx.arc(x, y, 14.5 * U * pop, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = appear;
      ctx.fillStyle = "#4F6257"; // deep green core (darker than primary)
      ctx.beginPath();
      ctx.arc(x, y, 9.5 * U * pop, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Learning: primary green node + soft halo — NOT the peak
      ctx.globalAlpha = 0.15 * appear;
      ctx.strokeStyle = GREEN;
      ctx.lineWidth = 1.8 * U;
      ctx.beginPath();
      ctx.arc(x, y, 13 * U * pop, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = appear;
      ctx.fillStyle = GREEN;
      ctx.beginPath();
      ctx.arc(x, y, 7.5 * U * pop, 0, Math.PI * 2);
      ctx.fill();
    }

    /* ── Restrained serif labels ── */
    const label = NODE_LABELS[i];
    const labelA = smoothstep(t, 0.4 + i * 0.11, 0.55 + i * 0.11);
    if (labelA > 0) {
      ctx.globalAlpha = labelA * 0.9;
      ctx.fillStyle = "gold" in label && label.gold ? LABEL_GOLD : NEUTRAL;
      ctx.font = `italic 500 ${14 * U}px "Cormorant Garamond", "Noto Serif SC", serif`;
      ctx.textBaseline = "middle";
      ctx.fillText(label.text, x + label.dx * S, y + label.dy * S);
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

    const pts = buildPath();
    const dots = buildField(pts);
    const tail = tailDots();
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
        return; // stop — the mark becomes static, no background loop
      }
      raf = requestAnimationFrame(tick);
    };

    // Completion guarantee: rAF can be starved (hidden tabs, throttled
    // compositing, headless captures). The timer ensures the mark always
    // resolves to its final static state even when frames never fire.
    const finishTimer = window.setTimeout(() => {
      currentT = 1;
      done = true;
      cancelAnimationFrame(raf);
      paint();
    }, REVEAL_MS + 120);

    // Size once synchronously, then keep RO callbacks rAF-debounced so
    // canvas backing-store writes never trigger a ResizeObserver loop.
    resize();
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(roRaf);
      roRaf = requestAnimationFrame(resize);
    });
    ro.observe(wrap);

    if (!done) {
      raf = requestAnimationFrame(tick);
    }

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
