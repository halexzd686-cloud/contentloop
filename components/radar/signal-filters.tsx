"use client";

import { Search } from "lucide-react";
import { signalStatusLabel } from "@/lib/labels";

/**
 * Signal Filters — M7 P4: Index Tabs + inline search.
 * Text tabs with 2px primary underline (same language as Home),
 * hairline base rule, minimal borderless search on the right.
 * No saved views, no advanced filters, no pagination.
 */

const FILTER_TABS = [
  { key: "", label: "全部" },
  { key: "new", label: signalStatusLabel("new") },
  { key: "reviewing", label: signalStatusLabel("reviewing") },
  { key: "selected", label: signalStatusLabel("selected") },
  { key: "skipped", label: signalStatusLabel("skipped") },
] as const;

interface SignalFiltersProps {
  activeStatus: string;
  onStatusChange: (status: string) => void;
  search: string;
  onSearchChange: (search: string) => void;
  counts: Record<string, number>;
}

export function SignalFilters({
  activeStatus,
  onStatusChange,
  search,
  onSearchChange,
  counts,
}: SignalFiltersProps) {
  return (
    <div
      className="flex items-center justify-between gap-4"
      style={{ borderBottom: "1px solid rgba(200,201,203,0.65)" }}
    >
      {/* Index Tabs */}
      <div className="flex gap-6">
        {FILTER_TABS.map((tab) => {
          const on = activeStatus === tab.key;
          const count = tab.key === "" ? counts.total : (counts[tab.key] ?? 0);
          return (
            <button
              key={tab.key}
              onClick={() => onStatusChange(tab.key)}
              className="relative pb-2 text-[13px]"
              style={{
                color: on ? "#20231F" : "#626660",
                fontWeight: on ? 600 : 400,
              }}
            >
              {tab.label}
              <span
                className="ml-[3px] text-[11px] tabular-nums"
                style={{ color: "#8B8E87" }}
              >
                {count}
              </span>
              {on && (
                <span
                  className="absolute inset-x-0 bottom-0 h-[2px]"
                  style={{ background: "#7C9482" }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Inline search */}
      <div className="relative flex items-center pb-2">
        <Search className="pointer-events-none absolute left-0 h-3.5 w-3.5 text-ink-muted" />
        <input
          placeholder="搜索线索…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-36 bg-transparent pl-5 text-xs text-ink-primary placeholder:text-ink-muted focus:w-44 focus:outline-none transition-[width] duration-200"
        />
      </div>
    </div>
  );
}
