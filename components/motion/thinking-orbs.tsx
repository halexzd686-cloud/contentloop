"use client";

import { useEffect, useRef } from "react";

/**
 * ThinkingOrbs — ContentLoop AI reasoning motion (M7 visual fidelity pass).
 *
 * Canvas 2D gyro: multiple projected 3D-style orbital PLANES, each with
 * distinct tilt / ellipse ratio / orientation / precession. 8 controlled
 * particles distributed across planes; z-depth drives size + opacity +
 * color strength (painter's algorithm, far drawn first). One rare gold
 * insight particle. Orbit strokes are thin, faint, structural — the eye
 * reads moving spatial particles, not rings.
 *
 * Unchanged engineering contract: zero per-frame React renders, RAF
 * cleanup, DPR ≤ 2, offscreen/hidden pause, reduced-motion static frame.
 */

const COLORS = {
  primary: "#7C9482",
  primaryDeep: "#5F7A68", // front-particle strength
  structural: "#C8C9CB",
  insight: "#D4B26A",
  neutral: "#626660",
};

interface Plane {
  tiltX: number; // plane tilt around X (drives depth)
  rotZ: number; // plane orientation on screen
  ratio: number; // ellipse ratio (not circles)
  radius: number; // orbital radius factor
  precession: number; // gyro drift speed
  drift: number; // slow orientation drift
}

interface Particle {
  plane: number;
  phase: number;
  speed: number;
  size: number; // base radius factor
  color: string;
  deepColor?: string; // front-of-depth stronger color
}

// Distinct gyro planes — deliberately non-concentric in orientation.
const PLANES: Plane[] = [
  { tiltX: -0.52, rotZ: 0.24, ratio: 0.86, radius: 0.94, precession: 0.10, drift: 0.016 },
  { tiltX: 0.44, rotZ: -0.62, ratio: 0.62, radius: 0.74, precession: -0.13, drift: -0.012 },
  { tiltX: 0.18, rotZ: 1.05, ratio: 0.78, radius: 0.55, precession: 0.16, drift: 0.02 },
];

const PARTICLES: Particle[] = [
  { plane: 0, phase: 0.0, speed: 0.92, size: 0.082, color: COLORS.primary, deepColor: COLORS.primaryDeep },
  { plane: 0, phase: 2.3, speed: 0.92, size: 0.062, color: COLORS.structural },
  { plane: 0, phase: 4.4, speed: 1.12, size: 0.056, color: COLORS.neutral },
  { plane: 1, phase: 0.9, speed: -1.05, size: 0.074, color: COLORS.primary, deepColor: COLORS.primaryDeep },
  { plane: 1, phase: 3.1, speed: -0.88, size: 0.058, color: COLORS.structural },
  { plane: 2, phase: 1.7, speed: 1.28, size: 0.066, color: COLORS.primary, deepColor: COLORS.primaryDeep },
  { plane: 2, phase: 5.2, speed: 1.28, size: 0.052, color: COLORS.structural },
  // the single exceptional insight node
  { plane: 1, phase: 5.6, speed: -0.7, size: 0.072, color: COLORS.insight },
];

export function ThinkingOrbs({
  size = 48,
  className = "",
  staticFrame = false,
}: {
  size?: number;
  className?: string;
  /** Force the reduced-motion static frame (spike/preview contexts). */
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
    // Optical correction: 48px simplifies strokes + strengthens contrast
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

    /** Project a particle through its plane at time t → screen + depth. */
    const project = (p: Particle, t: number) => {
      const plane = PLANES[p.plane];
      const tiltX = plane.tiltX + t * plane.precession;
      const rotZ = plane.rotZ + t * plane.drift;
      const a = p.phase + t * p.speed;

      // point on ellipse (unit)
      const x = Math.cos(a);
      const y = Math.sin(a) * plane.ratio;
      // tilt around X → depth
      const y1 = y * Math.cos(tiltX);
      const z = y * Math.sin(tiltX);
      // orient on screen
      const xs = x * Math.cos(rotZ) - y1 * Math.sin(rotZ);
      const ys = x * Math.sin(rotZ) + y1 * Math.cos(rotZ);
      return { x: xs, y: ys, z, plane };
    };

    const drawFrame = (t: number) => {
      const c = size / 2;
      ctx.clearRect(0, 0, size, size);

      // orbit tracks: thin, faint, secondary
      for (let i = 0; i < PLANES.length; i++) {
        if (compact && i === 2) continue; // 48px: simplest track set
        const plane = PLANES[i];
        const tiltX = plane.tiltX + t * plane.precession;
        const rotZ = plane.rotZ + t * plane.drift;
        ctx.save();
        ctx.translate(c, c);
        ctx.rotate(rotZ);
        ctx.beginPath();
        ctx.ellipse(
          0, 0,
          plane.radius * c * 0.94,
          Math.max(1.2, plane.radius * c * 0.94 * plane.ratio * Math.cos(tiltX)),
          0, 0, Math.PI * 2
        );
        ctx.strokeStyle = COLORS.structural;
        ctx.globalAlpha = compact ? 0.16 : 0.2;
        ctx.lineWidth = compact ? 0.6 : 0.75;
        ctx.stroke();
        ctx.restore();
        ctx.globalAlpha = 1;
      }

      // particles, far → near (painter's algorithm)
      const projected = PARTICLES.map((p) => ({ p, ...project(p, t) }))
        .sort((a, b) => a.z - b.z);

      for (const { p, x, y, z, plane } of projected) {
        const depth = (z + 1) / 2; // 0 far … 1 near
        const scale = (compact ? 0.45 : 0.42) + depth * (compact ? 1.05 : 1.0);
        const alpha = 0.16 + depth * 0.84;
        ctx.beginPath();
        ctx.arc(
          c + x * plane.radius * c * 0.94,
          c + y * plane.radius * c * 0.94,
          Math.max(0.9, p.size * size * scale),
          0, Math.PI * 2
        );
        ctx.globalAlpha = alpha;
        ctx.fillStyle =
          p.deepColor && depth > 0.72 ? p.deepColor : p.color;
        ctx.fill();
        ctx.globalAlpha = 1;
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
