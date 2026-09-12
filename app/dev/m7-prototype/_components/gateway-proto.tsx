"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { EvidenceMark } from "./evidence-mark";

/**
 * M7 High-Fidelity Prototype — Gateway (isolated dev surface)
 *
 * Spec: ContentLoop_M7_Visual_Design_Spec.md §27–33
 * Route: /dev/m7-prototype/gateway (never in production nav, no records)
 *
 * Existing Function → New Presentation mapping:
 * - "进入 ContentLoop"        → existing root entry behavior (production: "/"
 *                               renders Gateway / direct-entry redirect to /app)
 * - "下次直接进入工作区"       → approved M7 UX-only exception, localStorage only
 *                               (key: contentloop.direct-entry); forced test
 *                               path: /?gateway=1 (wired at production port)
 * - Loop Evidence Mark        → brand presentation only, no domain behavior
 *
 * Content allowed by spec §30: wordmark, portal button, preference, mark.
 * Nothing else — no slogan, no description, no nav, no footer.
 */

const DIRECT_ENTRY_KEY = "contentloop.direct-entry";

export function GatewayProto() {
  const [direct, setDirect] = useState(false);

  useEffect(() => {
    try {
      const id = requestAnimationFrame(() => {
        setDirect(window.localStorage.getItem(DIRECT_ENTRY_KEY) === "1");
      });
      return () => cancelAnimationFrame(id);
    } catch {
      /* localStorage unavailable */
    }
  }, []);

  const onToggleDirect = (next: boolean) => {
    setDirect(next);
    try {
      if (next) window.localStorage.setItem(DIRECT_ENTRY_KEY, "1");
      else window.localStorage.removeItem(DIRECT_ENTRY_KEY);
    } catch {
      /* persistence unavailable */
    }
  };

  return (
    <div
      className="flex min-h-screen"
      style={{ background: "#F5F6F3", color: "#20231F" }}
    >
      {/* M7 fonts are prototype-local; production layout stays on the
          M6 font set until the visual direction is accepted. */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Noto+Sans+SC:wght@400;500;600&family=Noto+Serif+SC:ital,wght@0,600;1,500&display=swap"
      />

      {/* Left ≈42% — wordmark, portal, preference. Generous negative space. */}
      <section className="flex flex-[42] flex-col justify-center pl-[8.5%] pr-8">
        <div className="-mt-24">
          {/* Spec §3.3: nominal ~40px BUT "以视觉重量为准" — the approved
              reference carries the wordmark at ~33% of viewport width.
              76px lands between the nominal spec and the reference. */}
          <h1
            style={{
              fontFamily: '"Cormorant Garamond", "Noto Serif SC", serif',
              fontWeight: 600,
              fontSize: 76,
              lineHeight: 1,
              letterSpacing: "0.005em",
            }}
          >
            ContentLoop
          </h1>

          <div className="mt-[88px]">
            {/* Spec §32 Portal Button: ~206×50, r6, primary, near-white,
                no shadow/glow/scale/bounce, restrained terminal cue. */}
            <Link
              href="/app"
              className="group inline-flex h-[50px] w-[206px] items-center justify-center gap-2.5 rounded-[6px] text-[14px] font-medium text-white/95 transition-colors duration-150"
              style={{ background: "#7C9482" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#71856F")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#7C9482")}
            >
              进入 ContentLoop
              <ArrowRight
                className="h-4 w-4 opacity-70 transition-transform duration-150 group-hover:translate-x-0.5"
                strokeWidth={1.75}
                aria-hidden
              />
            </Link>
          </div>

          {/* Spec §14/§33 checkbox: 16px, r3, silver border, green checked,
              gold focus. */}
          <label className="mt-6 inline-flex cursor-pointer items-center gap-2.5 text-[13px] text-[#626660]">
            <span className="relative inline-flex h-4 w-4 items-center justify-center">
              <input
                type="checkbox"
                checked={direct}
                onChange={(e) => onToggleDirect(e.target.checked)}
                className="peer h-4 w-4 appearance-none rounded-[3px] border bg-white transition-colors duration-150 checked:border-[#7C9482] checked:bg-[#7C9482]"
                style={{ borderColor: "#C8C9CB" }}
              />
              <Check
                className="pointer-events-none absolute h-3 w-3 text-white opacity-0 transition-opacity duration-150 peer-checked:opacity-100"
                strokeWidth={2.5}
                aria-hidden
              />
            </span>
            下次直接进入工作区
          </label>
        </div>
      </section>

      {/* Right ≈58% — Loop Evidence Mark, part of the canvas, no card,
          slightly right, slightly up, strong anchor. */}
      <section className="flex flex-[58] items-center justify-center">
        <EvidenceMark className="h-full w-full" />
      </section>
    </div>
  );
}
