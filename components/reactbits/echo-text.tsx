"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * EchoText — vendored React Bits family (M4.4, frozen V1 set).
 *
 * One-shot semantic headline: ghost echoes trail the text once on
 * mount (400–600ms, expressive token group). No loop, no hover
 * replay, no layout shift. prefers-reduced-motion → fully static
 * text (content never depends on animation).
 */
export function EchoText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const [played, setPlayed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setPlayed(true), 650);
    return () => clearTimeout(t);
  }, []);

  if (reduceMotion) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={`relative inline-block ${className}`}>
      {/* Ghost echoes — absolutely stacked, no layout impact */}
      {!played &&
        [2, 1].map((i) => (
          <motion.span
            key={i}
            aria-hidden
            className="pointer-events-none absolute inset-0 select-none"
            initial={{ opacity: 0.28 / i, x: 0, y: 0 }}
            animate={{ opacity: 0, x: -5 * i, y: 2 * i }}
            transition={{ duration: 0.5, delay: 0.06 * i, ease: "easeOut" }}
          >
            {text}
          </motion.span>
        ))}
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {text}
      </motion.span>
    </span>
  );
}
