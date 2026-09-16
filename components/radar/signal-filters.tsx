"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { signalStatusLabel } from "@/lib/labels";

/**
 * Signal Filters — M7 P4: Index Tabs + expanding search (approved
 * direction D). Default state is a single hairline icon button;
 * clicking expands a full-width underline field with result count
 * and close. Closing clears the query. No saved views, no
 * advanced filters, no pagination.
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
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Field stays visible while a query is active, even after
  // re-renders triggered by fetch.
  const active = open || search.length > 0;

  function close() {
    setOpen(false);
    onSearchChange("");
  }

  return (
    <div>
      <div
        className="flex items-center justify-between gap-4"
        style={{ borderBottom: "1px solid rgba(200,201,203,0.65)" }}
      >
        {/* Index Tabs */}
        <div className="flex gap-6">
          {FILTER_TABS.map((tab) => {
            const on = activeStatus === tab.key;
            const count =
              tab.key === "" ? counts.total : (counts[tab.key] ?? 0);
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

        {/* Search toggle — hairline icon; green when active */}
        <button
          aria-label={active ? "关闭搜索" : "搜索线索"}
          onClick={() => (active ? close() : setOpen(true))}
          className="mb-1.5 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[6px] transition-colors duration-150"
          style={{
            border: active
              ? "1px solid #7C9482"
              : "1px solid rgba(200,201,203,0.8)",
            background: active ? "#7C9482" : "transparent",
            color: active ? "rgba(255,255,255,0.95)" : "#8B8E87",
          }}
        >
          <Search className="h-[13px] w-[13px]" />
        </button>
      </div>

      {/* Expanded search field */}
      {active && (
        <div
          className="flex items-center gap-2 px-0.5 py-[9px]"
          style={{ borderBottom: "1px solid #7C9482" }}
        >
          <Search className="h-[13px] w-[13px] shrink-0 text-ink-secondary" />
          <input
            ref={inputRef}
            aria-label="搜索线索"
            placeholder="搜索线索…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") close();
            }}
            className="flex-1 bg-transparent text-[12.5px] text-ink-primary placeholder:text-ink-muted focus:outline-none"
          />
          {search && (
            <span
              className="shrink-0 text-[11px] tabular-nums"
              style={{ color: "#626660" }}
            >
              {counts.total ?? 0} 条结果
            </span>
          )}
          <button
            aria-label="清除搜索"
            onClick={close}
            className="shrink-0 text-ink-muted transition-colors hover:text-ink-primary"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
