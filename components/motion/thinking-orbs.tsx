"use client";

import { useEffect, useRef } from "react";

/**
 * ThinkingOrbs — ContentLoop AI reasoning motion (M7).
 *
 * Canvas 2D gyro/orbital system: controlled dots on tilted orbits,
 * depth (z) drives size/opacity, slow plane precession. A precision
 * reasoning instrument — not random particles, not bouncing dots.
 *
 * Performance contract: zero React re-renders per frame (all canvas),
 * RAF cleanup on unmount, DPR ≤ 2, pauses when offscreen or tab hidden,
 * static representative frame under prefers-reduced-motion.
 */

const COLORS = {
  primary: "#7C9482", // ContentLoop primary
  structural: "#C8C9CB", // structural orbits
  insight: "#D4B26A", // insight node (single gold)
  neutral: "#626660", // track
};

interface Orb {
  radius: number; // orbital radius factor
  tilt: number; // orbital plane tilt (radians)
  phase: number; // start phase
  speed: number; // angular speed
  size: number; // base dot radius
  color: string;
}

export function ThinkingOrbs({
  size = 48,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const orbsRef = useRef<Orb[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Deterministic orbital layout: 4 structural + 1 insight node.
    orbsRef.current = [
      { radius: 0.92, tilt: -0.42, phase: 0.0, speed: 1.0, size: 0.085, color: COLORS.primary },
      { radius: 0.70, tilt: 0.36, phase: 1.4, speed: -0.85, size: 0.07, color: COLORS.structural },
      { radius: 0.55, tilt: -0.18, phase: 2.6, speed: 1.15, size: 0.065, color: COLORS.structural },
      { radius: 0.40, tilt: 0.55, phase: 4.1, speed: -1.3, size: 0.06, color: COLORS.neutral },
      { radius: 0.80, tilt: 0.1, phase: 3.3, speed: 0.7, size: 0.075, color: COLORS.insight },
    ];

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
      if (reduced) drawStatic();
    };

    const drawOrb = (o: Orb, t: number) => {
      const c = size / 2;
      const precession = reduced ? 0 : t * 0.12;
      const angle = o.phase + (reduced ? 0 : t * o.speed * 0.9);
      const tilt = o.tilt + precession;

      // position on orbit (unit space)
      const x0 = Math.cos(angle);
      const y0 = Math.sin(angle);
      const z0 = -Math.sin(angle) * Math.sin(tilt); // depth from tilt

      // project: tilt the orbit plane
      const px = x0;
      const py = y0 * Math.cos(tilt);
      const pz = z0;

      const depth = (pz + 1) / 2; // 0..1 (far..near)
      const scale = 0.55 + depth * 0.65;
      const alpha = 0.25 + depth * 0.75;

      ctx.beginPath();
      ctx.arc(
        c + px * o.radius * c * 0.92,
        c + py * o.radius * c * 0.92,
        Math.max(0.8, o.size * size * scale),
        0,
        Math.PI * 2
      );
      ctx.globalAlpha = alpha;
      ctx.fillStyle = o.color;
      ctx.fill();
      ctx.globalAlpha = 1;
    };

    const drawTracks = () => {
      const c = size / 2;
      for (const o of orbsRef.current) {
        ctx.beginPath();
        ctx.ellipse(
          c, c,
          o.radius * c * 0.92,
          Math.max(1, o.radius * c * 0.92 * Math.cos(o.tilt)),
          0, 0, Math.PI * 2
        );
        ctx.strokeStyle = COLORS.neutral;
        ctx.globalAlpha = 0.14;
        ctx.lineWidth = 0.75;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    };

    const drawStatic = () => {
      ctx.clearRect(0, 0, size, size);
      drawTracks();
      for (const o of orbsRef.current) drawOrb(o, 0);
    };

    const loop = (now: number) => {
      if (!running) return;
      ctx.clearRect(0, 0, size, size);
      drawTracks();
      const t = now / 1000;
      for (const o of orbsRef.current) drawOrb(o, t);
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

    if (!reduced) {
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
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [size]);

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
