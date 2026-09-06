"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * DotTexture — custom ContentLoop editorial texture (NOT React Bits).
 *
 * The official React Bits HalftoneReveal is an OGL/WebGL shader and
 * was evaluated and rejected for V1 (dependency cost not justified).
 * This is a plain CSS dot-grid accent for the Radar empty state.
 * prefers-reduced-motion → static faint dot pattern.
 */
export function DotTexture({ className = "" }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  const pattern = (
    <div
      aria-hidden
      className="absolute inset-0 rounded-[10px]"
      style={{
        backgroundImage:
          "radial-gradient(circle, var(--ink-faint) 1px, transparent 1px)",
        backgroundSize: "12px 12px",
        maskImage:
          "radial-gradient(ellipse 70% 80% at 50% 40%, black 30%, transparent 75%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 70% 80% at 50% 40%, black 30%, transparent 75%)",
      }}
    />
  );

  if (reduceMotion) {
    return (
      <div className={`relative ${className}`} style={{ opacity: 0.35 }}>
        {pattern}
      </div>
    );
  }

  return (
    <motion.div
      className={`relative ${className}`}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 0.4, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {pattern}
    </motion.div>
  );
}
