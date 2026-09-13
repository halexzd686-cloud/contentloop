"use client";

import { useState } from "react";
import {
  NavHomeIcon,
  NavRadarIcon,
  NavStudioIcon,
  NavPipelineIcon,
  NavAnalyticsIcon,
  NavSettingsIcon,
} from "./nav-icons";

/**
 * M7 High-Fidelity Prototype — App Shell / Editorial Rail
 * Route: /dev/m7-prototype/shell (isolated, no production nav entry)
 *
 * Spec: ContentLoop_M7_Visual_Design_Spec.md §34–37
 *
 * Existing Function → New Presentation mapping:
 * - 6 nav items → existing routes /app, /app/radar, /app/studio,
 *   /app/pipeline, /app/analytics, /app/settings (prototype: presentation
 *   only — items render as links but stay inside the prototype)
 * - active state → existing pathname-based active route (prototype:
 *   interactive click-to-switch for visual review only)
 * - Forbidden per §35: avatar / greeting / date / bell / workspace
 *   switcher / theme switch / profile block / version / collapse button
 *
 * The right side is a neutral workspace placeholder — Home body is a
 * separate prototype (next step), not part of this acceptance.
 */

const ITEMS = [
  { key: "home", label: "首页", icon: NavHomeIcon },
  { key: "radar", label: "选题雷达", icon: NavRadarIcon },
  { key: "studio", label: "内容工作台", icon: NavStudioIcon },
  { key: "pipeline", label: "内容流程", icon: NavPipelineIcon },
  { key: "analytics", label: "数据复盘", icon: NavAnalyticsIcon },
] as const;

export function ShellProto() {
  const [active, setActive] = useState<string>("home");

  return (
    <div
      className="flex min-h-screen"
      style={{ background: "#F5F6F3", color: "#20231F" }}
    >
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Noto+Sans+SC:wght@400;500;600&display=swap"
      />

      {/* ── Editorial Rail: 216px @1440 (196px @1280 via --rail-w),
          silver-derived surface, 1px divider, no shadow ── */}
      <aside
        className="flex h-screen w-[var(--rail-w,216px)] shrink-0 flex-col"
        style={{
          background: "#EDEFEA",
          borderRight: "1px solid rgba(200,201,203,0.65)",
        }}
      >
        {/* Compact wordmark — Cormorant Semibold, 24px */}
        <div className="px-5 pb-7 pt-6">
          <span
            style={{
              fontFamily: '"Cormorant Garamond", "Noto Serif SC", serif',
              fontWeight: 600,
              fontSize: 24,
              lineHeight: 1,
              letterSpacing: "0.005em",
            }}
          >
            ContentLoop
          </span>
        </div>

        <div
          className="px-5 pb-2 text-[11px] font-medium"
          style={{ color: "#8B8E87", letterSpacing: "0.14em" }}
        >
          工作区
        </div>

        <nav aria-label="主导航" className="flex flex-1 flex-col gap-0.5">
          {ITEMS.map((item) => {
            const isActive = active === item.key;
            return (
              <a
                key={item.key}
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setActive(item.key);
                }}
                aria-current={isActive ? "page" : undefined}
                className="relative flex h-10 items-center gap-3 px-5 text-[13px] transition-colors duration-150"
                style={{
                  color: isActive ? "#20231F" : "#626660",
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {/* Active marker — 24px × 2px primary editorial rail */}
                <span
                  aria-hidden
                  className="absolute left-0 top-1/2 h-6 w-[2px] -translate-y-1/2 rounded-full transition-opacity duration-150"
                  style={{
                    background: "#7C9482",
                    opacity: isActive ? 1 : 0,
                  }}
                />
                <item.icon
                  className="h-[18px] w-[18px] shrink-0"
                  aria-hidden
                  style={{ color: isActive ? "#7C9482" : "#626660" }}
                />
                <span>{item.label}</span>
              </a>
            );
          })}

          {/* 设置 — separated by larger spacing (§35), not bottom-anchored */}
          <div className="mt-8">
            {(() => {
              const isActive = active === "settings";
              return (
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setActive("settings");
                  }}
                  aria-current={isActive ? "page" : undefined}
                  className="relative flex h-10 items-center gap-3 px-5 text-[13px] transition-colors duration-150"
                  style={{
                    color: isActive ? "#20231F" : "#626660",
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  <span
                    aria-hidden
                    className="absolute left-0 top-1/2 h-6 w-[2px] -translate-y-1/2 rounded-full transition-opacity duration-150"
                    style={{
                      background: "#7C9482",
                      opacity: isActive ? 1 : 0,
                    }}
                  />
                  <NavSettingsIcon
                    className="h-[18px] w-[18px] shrink-0"
                    aria-hidden
                    style={{ color: isActive ? "#7C9482" : "#626660" }}
                  />
                  <span>设置</span>
                </a>
              );
            })()}
          </div>
        </nav>
      </aside>

      {/* ── Main workspace: paper surface, neutral placeholder ── */}
      <main className="flex-1 overflow-y-auto px-8 py-8">
        <p
          className="text-[11px] font-medium"
          style={{ color: "#8B8E87", letterSpacing: "0.14em" }}
        >
          工作区基底（Home 正文为下一步独立原型）
        </p>
        <div className="mt-6 space-y-3">
          {[0.42, 0.3, 0.36].map((w, i) => (
            <div
              key={i}
              className="h-4 rounded-[3px]"
              style={{
                width: `${w * 100}%`,
                background: "rgba(200,201,203,0.35)",
              }}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
