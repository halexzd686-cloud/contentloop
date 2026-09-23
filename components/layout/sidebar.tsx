"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";
import { NAV_LABELS } from "@/lib/labels";
import { SidebarPet } from "./sidebar-pet";
import {
  NavHomeIcon,
  NavRadarIcon,
  NavStudioIcon,
  NavPipelineIcon,
  NavAnalyticsIcon,
  NavSettingsIcon,
} from "@/components/icons/nav-icons";

/**
 * ContentLoop Editorial Rail — M7 (approved via /dev/m7-prototype/shell)
 *
 * Fixed 6 navigation items, full height, no manual collapse.
 * Width: 196px @1280 → 216px @1440+ (via --sidebar-width).
 * M9 responsive: below 1280px the rail auto-collapses to a 64px
 * icon-only column (labels/wordmark hidden via .sidebar-label, icons
 * centered via .sidebar-nav-row, "CL" mark via .sidebar-mark — all in
 * globals.css). Approved M9 decision; AGENTS §27 allows collapsing
 * the sidebar at narrower widths.
 * Icons: local machined-gauge set XIII (components/icons/nav-icons).
 * Active = 24px × 2px primary rail marker + primary icon + strong 600 label.
 * No active background blocks, no pills, no bottom account area — the M9
 * bottom elements are user-approved exceptions: 小环 (sidebar pet,
 * real-data attention badge/panel) and the ③ theme toggle.
 * 设置 is separated from the five workflow pages by spacing only.
 */

const WORKFLOW_ITEMS = [
  { label: NAV_LABELS.home, href: "/app", icon: NavHomeIcon },
  { label: NAV_LABELS.radar, href: "/app/radar", icon: NavRadarIcon },
  { label: NAV_LABELS.studio, href: "/app/studio", icon: NavStudioIcon },
  { label: NAV_LABELS.pipeline, href: "/app/pipeline", icon: NavPipelineIcon },
  { label: NAV_LABELS.analytics, href: "/app/analytics", icon: NavAnalyticsIcon },
] as const;

function NavRow({
  item,
  isActive,
}: {
  item: { label: string; href: string; icon: typeof NavHomeIcon };
  isActive: boolean;
}) {
  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "sidebar-nav-row relative flex h-10 items-center gap-3 px-5 text-[13px] transition-colors duration-150",
        isActive
          ? "font-semibold text-ink-primary"
          : "text-ink-secondary hover:text-ink-primary"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute left-0 top-1/2 h-6 w-[2px] -translate-y-1/2 rounded-full bg-cl-primary transition-opacity duration-150",
          isActive ? "opacity-100" : "opacity-0"
        )}
      />
      <item.icon
        className="h-[18px] w-[18px] shrink-0"
        style={{ color: isActive ? "var(--cl-primary)" : "var(--cl-neutral)" }}
        aria-hidden
      />
      <span className="sidebar-label">{item.label}</span>
    </Link>
  );
}

/**
 * M9 ③ theme toggle — user-approved bottom element. Reads/writes
 * <html data-theme> + localStorage["cl-theme"] and broadcasts
 * "cl-themechange" for future motion components. useSyncExternalStore
 * keeps SSR light (server snapshot false) with no hydration mismatch
 * and no setState-in-effect.
 */
function ThemeToggle() {
  const dark = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("cl-themechange", onChange);
      return () => window.removeEventListener("cl-themechange", onChange);
    },
    () => document.documentElement.dataset.theme === "dark",
    () => false
  );

  function toggle() {
    const next = !dark;
    if (next) {
      document.documentElement.dataset.theme = "dark";
    } else {
      delete document.documentElement.dataset.theme;
    }
    try {
      localStorage.setItem("cl-theme", next ? "dark" : "light");
    } catch {
      // storage unavailable (private mode) — session theme still applies
    }
    window.dispatchEvent(new Event("cl-themechange"));
  }

  const Icon = dark ? Sun : Moon;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "切换为浅色模式" : "切换为深色模式"}
      className="sidebar-nav-row relative flex h-10 w-full items-center gap-3 px-5 text-[13px] text-ink-secondary transition-colors duration-150 hover:text-ink-primary"
    >
      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
      <span className="sidebar-label">{dark ? "浅色模式" : "深色模式"}</span>
    </button>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  const isItemActive = (href: string) =>
    href === "/app"
      ? pathname === "/app" || pathname === "/"
      : pathname.startsWith(href);

  return (
    <aside className="flex h-screen w-[var(--sidebar-width)] shrink-0 flex-col border-r border-border bg-cl-sidebar">
      {/* Wordmark — Cormorant Garamond Semibold, compact shell size;
          "CL" mark shows only when the rail is auto-collapsed (<1280, M9) */}
      <div className="sidebar-wordmark px-5 pb-7 pt-6" aria-label="ContentLoop">
        <span className="sidebar-label font-brand text-2xl font-semibold tracking-[0.005em] text-ink-primary">
          ContentLoop
        </span>
        <span
          aria-hidden
          className="sidebar-mark font-brand text-lg font-semibold text-ink-primary"
        >
          CL
        </span>
      </div>

      <div className="sidebar-label px-5 pb-2 text-[11px] font-medium tracking-[0.14em] text-ink-muted">
        工作区
      </div>

      <nav aria-label="主导航" className="flex flex-1 flex-col gap-0.5">
        {WORKFLOW_ITEMS.map((item) => (
          <NavRow key={item.href} item={item} isActive={isItemActive(item.href)} />
        ))}

        {/* Settings — separated by spacing, not a heavy divider */}
        <div className="mt-8">
          <NavRow
            item={{ label: NAV_LABELS.settings, href: "/app/settings", icon: NavSettingsIcon }}
            isActive={isItemActive("/app/settings")}
          />
        </div>
      </nav>

      {/* M9 bottom elements: 小环 pet above the theme toggle (both
          user-approved; see header comment) */}
      <div className="pb-5">
        <SidebarPet />
        <ThemeToggle />
      </div>
    </aside>
  );
}
