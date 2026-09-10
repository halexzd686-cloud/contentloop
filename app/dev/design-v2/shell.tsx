"use client";

import Link from "next/link";
import { Home, Target, PenSquare, KanbanSquare, BarChart3, Settings } from "lucide-react";

/**
 * M5.6 Phase 1 prototype shell — disposable static replica of the
 * production sidebar so page composition is evaluated in context.
 * No navigation behavior, no production linkage. Removed after
 * propagation.
 */

const NAV = [
  { key: "home", label: "Home", icon: Home },
  { key: "radar", label: "Radar", icon: Target },
  { key: "studio", label: "Studio", icon: PenSquare },
  { key: "pipeline", label: "Pipeline", icon: KanbanSquare },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "settings", label: "Settings", icon: Settings },
];

export function ProtoShell({
  active,
  children,
}: {
  active: string;
  children: React.ReactNode;
}) {
  return (
    <div className="dv2 flex h-screen bg-canvas text-ink-primary">
      <aside className="flex w-[224px] shrink-0 flex-col border-r border-border bg-workspace">
        <div className="flex items-center gap-2 px-5 py-4">
          <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-mint-600 font-serif text-sm font-semibold text-white">
            C
          </span>
          <span className="text-sm font-semibold">ContentLoop</span>
        </div>
        <nav className="mt-2 space-y-0.5 px-2">
          {NAV.map((n) => (
            <span
              key={n.key}
              className={`flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-sm ${
                active === n.key
                  ? "bg-mint-100 font-medium text-mint-600"
                  : "text-ink-secondary"
              }`}
            >
              <n.icon className="h-4 w-4" />
              {n.label}
              {active === n.key && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-mint-600" />
              )}
            </span>
          ))}
        </nav>
        <div className="mt-auto px-5 py-4 text-[11px] text-ink-muted">
          design-v2 prototype
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

export function ProtoIndex() {
  return (
    <ProtoShell active="">
      <div className="p-8">
        <h1 className="text-2xl font-semibold">Design v2 prototypes</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Disposable M5.6 visual prototypes. No production behavior.
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          <li><Link className="text-mint-600 underline" href="/dev/design-v2/home">Home</Link></li>
          <li><Link className="text-mint-600 underline" href="/dev/design-v2/studio">Studio detail</Link></li>
          <li><Link className="text-mint-600 underline" href="/dev/design-v2/analytics">Analytics detail</Link></li>
        </ul>
      </div>
    </ProtoShell>
  );
}
