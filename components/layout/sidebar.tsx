"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Radar,
  PenTool,
  KanbanSquare,
  BarChart3,
  Settings,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { NAV_LABELS } from "@/lib/labels";

/**
 * ContentLoop Editorial Rail — M7 Phase A
 *
 * Fixed 6 navigation items, full height, no manual collapse.
 * Width: 196px @1280 → 216px @1440+ (via --sidebar-width).
 * Active = 2px primary left rail + primary icon + strong 600 label.
 * No active background blocks, no pills, no bottom account area.
 * 设置 is separated from the five workflow pages by spacing only.
 */

const WORKFLOW_ITEMS = [
  { label: NAV_LABELS.home, href: "/app", icon: Home },
  { label: NAV_LABELS.radar, href: "/app/radar", icon: Radar },
  { label: NAV_LABELS.studio, href: "/app/studio", icon: PenTool },
  { label: NAV_LABELS.pipeline, href: "/app/pipeline", icon: KanbanSquare },
  { label: NAV_LABELS.analytics, href: "/app/analytics", icon: BarChart3 },
] as const;

function NavRow({
  item,
  isActive,
}: {
  item: (typeof WORKFLOW_ITEMS)[number] | { label: string; href: string; icon: typeof Home };
  isActive: boolean;
}) {
  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "relative flex h-10 items-center gap-3 px-5 text-[13px] transition-colors duration-150",
        isActive
          ? "font-semibold text-ink-primary"
          : "text-ink-secondary hover:text-ink-primary"
      )}
    >
      {/* Active rail — 2px primary trajectory marker */}
      <span
        aria-hidden
        className={cn(
          "absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-cl-primary transition-opacity duration-150",
          isActive ? "opacity-100" : "opacity-0"
        )}
      />
      <item.icon
        className={cn(
          "h-[18px] w-[18px] shrink-0",
          isActive ? "text-cl-primary" : "text-cl-neutral"
        )}
        strokeWidth={1.75}
        aria-hidden
      />
      <span>{item.label}</span>
    </Link>
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
      {/* Wordmark — Cormorant Garamond Semibold, compact shell size */}
      <div className="px-5 pb-6 pt-6">
        <span className="font-brand text-2xl font-semibold tracking-[0.01em] text-ink-primary">
          ContentLoop
        </span>
      </div>

      {/* Workspace group */}
      <div className="px-5 pb-2 text-[11px] font-medium tracking-[0.14em] text-ink-muted">
        工作区
      </div>

      <nav aria-label="主导航" className="flex flex-1 flex-col gap-0.5">
        {WORKFLOW_ITEMS.map((item) => (
          <NavRow key={item.href} item={item} isActive={isItemActive(item.href)} />
        ))}

        {/* Settings — separated by spacing, not a heavy divider */}
        <div className="mt-6">
          <NavRow
            item={{ label: NAV_LABELS.settings, href: "/app/settings", icon: Settings }}
            isActive={isItemActive("/app/settings")}
          />
        </div>
      </nav>
    </aside>
  );
}
