"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Radar,
  PenTool,
  KanbanSquare,
  BarChart3,
  Settings,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * ContentLoop Sidebar — design.md §9, §40
 *
 * Fixed 6 navigation items. No additional top-level entries.
 * Collapsed: 68px (icons only)
 * Expanded: 216–224px (icons + labels)
 * Active: mint indicator + slight surface change + stronger text
 */

const NAV_ITEMS = [
  { label: "Home", href: "/app", icon: Home },
  { label: "Radar", href: "/app/radar", icon: Radar },
  { label: "Studio", href: "/app/studio", icon: PenTool },
  { label: "Pipeline", href: "/app/pipeline", icon: KanbanSquare },
  { label: "Analytics", href: "/app/analytics", icon: BarChart3 },
  { label: "Settings", href: "/app/settings", icon: Settings },
] as const;

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-border bg-workspace transition-[width] duration-200",
        collapsed ? "w-[68px]" : "w-[224px]"
      )}
    >
      {/* Logo area */}
      <div
        className={cn(
          "flex h-14 items-center border-b border-border px-4",
          collapsed && "justify-center px-2"
        )}
      >
        {collapsed ? (
          <span className="font-serif text-lg text-mint-600">C</span>
        ) : (
          <span className="font-serif text-lg text-ink-primary">
            ContentLoop
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-3">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/app"
              ? pathname === "/app" || pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-[8px] px-3 py-2 text-sm transition-colors duration-150",
                collapsed && "justify-center px-2",
                isActive
                  ? "bg-mint-100 text-ink-primary font-medium"
                  : "text-ink-secondary hover:bg-surface-subtle hover:text-ink-primary"
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 shrink-0",
                  isActive ? "text-mint-600" : "text-ink-muted"
                )}
              />
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && isActive && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-mint-600" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-border p-2">
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex w-full items-center gap-3 rounded-[8px] px-3 py-2 text-sm text-ink-muted hover:bg-surface-subtle hover:text-ink-primary transition-colors duration-150",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronsLeft className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
