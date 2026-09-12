"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";

import { EvidenceMark } from "./evidence-mark";

/**
 * ContentLoop Gateway — M7 Phase A
 *
 * Brand Gateway, intentionally minimal: wordmark + Portal Button +
 * direct-entry preference + Loop Evidence Mark. No slogan, no product
 * explanation, no nav, no footer.
 *
 * Direct-entry preference (approved M7 UX-only exception):
 * client-local localStorage only — no DB, no sync, no settings entry.
 * Default/unchecked: "/" shows Gateway. Checked: "/" redirects to /app.
 * Development/testing path to reach Gateway while the preference is set:
 *   /?gateway=1
 */

const DIRECT_ENTRY_KEY = "contentloop.direct-entry";

export function Gateway() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [direct, setDirect] = useState(false);

  useEffect(() => {
    const forced = new URLSearchParams(window.location.search).get("gateway") === "1";
    let pref = false;
    try {
      pref = window.localStorage.getItem(DIRECT_ENTRY_KEY) === "1";
    } catch {
      /* localStorage unavailable → always show Gateway */
    }
    if (pref && !forced) {
      router.replace("/app");
      return;
    }
    const id = requestAnimationFrame(() => {
      setDirect(pref);
      setVisible(true);
    });
    return () => cancelAnimationFrame(id);
  }, [router]);

  const onToggleDirect = (next: boolean) => {
    setDirect(next);
    try {
      if (next) window.localStorage.setItem(DIRECT_ENTRY_KEY, "1");
      else window.localStorage.removeItem(DIRECT_ENTRY_KEY);
    } catch {
      /* persistence unavailable — preference simply won't stick */
    }
  };

  if (!visible) {
    // Decide first: preference holders go straight to the workspace
    // without a Gateway flash.
    return <div className="min-h-screen bg-cl-paper" aria-busy="true" />;
  }

  return (
    <div className="flex min-h-screen bg-cl-paper">
      {/* Left ~42% — wordmark, portal, preference. Generous negative space. */}
      <section className="flex flex-[42] flex-col justify-center pl-[8%] pr-8">
        <div className="-mt-24">
          {/* Optical scale per approved reference: the wordmark is the
              primary brand anchor — do not shrink for "minimalism". */}
          <h1 className="font-brand text-[72px] font-semibold leading-none tracking-[0.005em] text-ink-primary">
            ContentLoop
          </h1>

          <div className="mt-[96px]">
            <Link
              href="/app"
              className="group inline-flex h-[60px] w-[280px] items-center justify-between rounded-[8px] bg-cl-primary px-7 text-[16px] font-medium text-white/95 transition-colors duration-150 hover:bg-[#6F8779]"
            >
              进入 ContentLoop
              {/* Real next-stage transition → restrained directional terminal */}
              <ArrowRight
                className="h-[18px] w-[18px] opacity-70 transition-transform duration-150 group-hover:translate-x-0.5"
                strokeWidth={1.75}
                aria-hidden
              />
            </Link>
          </div>

          <label className="mt-6 inline-flex cursor-pointer items-center gap-2.5 text-[14px] text-cl-neutral">
            <span className="relative inline-flex h-4 w-4 items-center justify-center">
              <input
                type="checkbox"
                checked={direct}
                onChange={(e) => onToggleDirect(e.target.checked)}
                className="peer h-4 w-4 appearance-none rounded-[3px] border border-cl-silver bg-cl-overlay transition-colors duration-150 checked:border-cl-primary checked:bg-cl-primary"
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

      {/* Right ~58% — Loop Evidence Mark, part of the canvas, no panel.
          Major brand anchor: allowed to occupy real visual territory. */}
      <section className="flex flex-[58] items-center justify-center">
        <EvidenceMark className="h-full w-full max-h-[700px] max-w-[700px]" />
      </section>
    </div>
  );
}
