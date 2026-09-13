"use client";

import { useEffect, useRef } from "react";

/**
 * ThinkingOrbsV2 — design-fidelity iteration against the MetalForge
 * thinking-orbs gyro reference (style=gyro&speed=1&dots=1&perspective=1&
 * depthSize=1&depthFade=1). DRAFT for human comparison review at
 * /dev/orbs-compare — not yet the production component.
 *
 * What v2 changes vs v1:
 * - Machined orbit rings are VISIBLE (instrument tracks, not ghost hints)
 * - Global yaw precession: the whole assembly rotates as ONE gyro
 * - Rings precess too (projected, not static ellipses); front arc is
 *   repainted over far particles for real depth occlusion
 * - Center axis hub anchors the composition
 * - Stronger depth contrast: far particles dim + desaturate into
 *   structural silver; near particles sharpen to deep primary
 * - The gold insight node gains a resolving ring at the front of its orbit
 *
 * Same engineering contract: zero per-frame React renders, RAF cleanup,
 * DPR ≤ 2, offscreen/hidden pause, reduced-motion static frame.
 */

const C = {
  primary: "#7C9482",
  primaryDeep: "#4F6B5A", // front-of-depth primary (darker than v1)
  structural: "#C8C9CB",
  structuralDim: "#D6D7D9",
  insight: "#D4B26A",
  neutral: "#626660",
  ring: "#99A39B", // deeper sage-gray — machined track, never floaty
  ringFront: "#7E8C84", // front arc, deepest structural tone
};

const YAW_SPEED = 0.22; // global gyro precession (rad/s, calm per reference)

interface Plane {
  tiltX: number;
  rotZ: number;
  ratio: number;
  radius: number;
  ringAlpha: number;
}

interface Particle {
  plane: number;
  phase: number;
  speed: number;
  size: number;
  color: string;
  deepColor?: string;
  isInsight?: boolean;
}

const PLANES: Plane[] = [
  { tiltX: -0.55, rotZ: 0.24, ratio: 0.88, radius: 0.94, ringAlpha: 0.5 },
  { tiltX: 0.46, rotZ: -0.62, ratio: 0.6, radius: 0.72, ringAlpha: 0.42 },
  { tiltX: 0.16, rotZ: 1.08, ratio: 0.8, radius: 0.52, ringAlpha: 0.36 },
];

const PARTICLES: Particle[] = [
  { plane: 0, phase: 0.0, speed: 0.85, size: 0.085, color: C.primary, deepColor: C.primaryDeep },
  { plane: 0, phase: 2.4, speed: 0.85, size: 0.06, color: C.structural },
  { plane: 0, phase: 4.5, speed: 1.05, size: 0.055, color: C.neutral },
  { plane: 1, phase: 0.9, speed: -0.95, size: 0.076, color: C.primary, deepColor: C.primaryDeep },
  { plane: 1, phase: 3.1, speed: -0.8, size: 0.058, color: C.structural },
  { plane: 2, phase: 1.7, speed: 1.15, size: 0.068, color: C.primary, deepColor: C.primaryDeep },
  { plane: 2, phase: 5.0, speed: 1.15, size: 0.052, color: C.structural },
  // the single exceptional insight node
  { plane: 1, phase: 5.6, speed: -0.62, size: 0.075, color: C.insight, isInsight: true },
];

export function ThinkingOrbsV2({
  size = 48,
  className = "",
  staticFrame = false,
}: {
  size?: number;
  className?: string;
  staticFrame?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced =
      staticFrame ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const compact = size <= 48;

    let raf = 0;
    let running = false;
    let inView = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduced) drawFrame(0.7);
    };

    /** Project a unit-ellipse point through plane + global yaw. */
    const projectPoint = (
      plane: Plane,
      angle: number,
      yaw: number
    ): { x: number; y: number; z: number } => {
      const ex = Math.cos(angle);
      const ey = Math.sin(angle) * plane.ratio;
      // plane tilt around X → depth
      const y1 = ey * Math.cos(plane.tiltX);
      const z1 = ey * Math.sin(plane.tiltX);
      // plane orientation on screen
      const xr = ex * Math.cos(plane.rotZ) - y1 * Math.sin(plane.rotZ);
      const zr = z1;
      const yr = ex * Math.sin(plane.rotZ) + y1 * Math.cos(plane.rotZ);
      // global yaw precession: rotate (x, z) around Y
      const cy = Math.cos(yaw);
      const sy = Math.sin(yaw);
      return {
        x: xr * cy + zr * sy,
        y: yr,
        z: -xr * sy + zr * cy,
      };
    };

    /** Draw one plane's ring, optionally only the near-depth arc. */
    const drawRing = (
      plane: Plane,
      yaw: number,
      onlyFrontArc: boolean
    ) => {
      const c = size / 2;
      const R = plane.radius * c * 0.94;
      const N = 72;
      ctx.beginPath();
      let pen = false;
      for (let i = 0; i <= N; i++) {
        const a = (i / N) * Math.PI * 2;
        const p = projectPoint(plane, a, yaw);
        const depth = (p.z + 1) / 2;
        const use = onlyFrontArc ? depth > 0.52 : true;
        if (use) {
          const px = c + p.x * R;
          const py = c + p.y * R;
          if (!pen) {
            ctx.moveTo(px, py);
            pen = true;
          } else {
            ctx.lineTo(px, py);
          }
        } else {
          pen = false;
        }
      }
      ctx.strokeStyle = onlyFrontArc ? C.ringFront : C.ring;
      ctx.globalAlpha = onlyFrontArc
        ? Math.min(0.88, plane.ringAlpha + 0.34)
        : compact
          ? plane.ringAlpha * 0.72
          : plane.ringAlpha * 0.85;
      ctx.lineWidth = onlyFrontArc ? (compact ? 1 : 1.2) : compact ? 0.9 : 1.1;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.globalAlpha = 1;
    };

    const drawFrame = (t: number) => {
      const c = size / 2;
      ctx.clearRect(0, 0, size, size);
      const yaw = t * YAW_SPEED;

      // pass 1: full rings (faint structure)
      for (const plane of PLANES) {
        if (compact && plane === PLANES[2]) continue;
        drawRing(plane, yaw, false);
      }

      // center axis hub — the instrument's anchor
      ctx.beginPath();
      ctx.arc(c, c, Math.max(1.4, size * 0.032), 0, Math.PI * 2);
      ctx.fillStyle = C.primary;
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.globalAlpha = 1;

      // particles, far → near
      const projected = PARTICLES.map((p) => {
        const plane = PLANES[p.plane];
        const proj = projectPoint(plane, p.phase + t * p.speed, yaw);
        return { p, plane, ...proj };
      }).sort((a, b) => a.z - b.z);

      for (const { p, plane, x, y, z } of projected) {
        const depth = (z + 1) / 2;
        const scale = 0.38 + depth * 1.18;
        const alpha = 0.1 + depth * 0.9;
        const R = plane.radius * c * 0.94;
        const px = c + x * R;
        const py = c + y * R;
        const r = Math.max(0.9, p.size * size * scale);

        // far particles desaturate into structural silver (insight keeps gold)
        let fill: string;
        if (p.isInsight) {
          fill = C.insight;
        } else if (depth < 0.42) {
          fill = C.structuralDim;
        } else if (p.deepColor && depth > 0.7) {
          fill = p.deepColor;
        } else {
          fill = p.color;
        }

        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.globalAlpha = 1;

        // insight node: a resolving gold ring at the front of its orbit
        if (p.isInsight && depth > 0.68) {
          ctx.beginPath();
          ctx.arc(px, py, r + size * 0.045 * depth, 0, Math.PI * 2);
          ctx.strokeStyle = C.insight;
          ctx.globalAlpha = (depth - 0.68) * 2.2 * 0.75;
          ctx.lineWidth = Math.max(0.8, size * 0.018);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }

      // pass 3: front arc of the rings repainted over far particles
      for (const plane of PLANES) {
        if (compact && plane === PLANES[2]) continue;
        drawRing(plane, yaw, true);
      }
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
    if (reduced) {
      const ro = new ResizeObserver(resize);
      ro.observe(canvas);
      return () => ro.disconnect();
    }

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
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [size, staticFrame]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      role="img"
      aria-label="AI 正在思考"
      style={{ width: size, height: size }}
    />
  );
}
