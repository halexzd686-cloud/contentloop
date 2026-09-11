"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { signalStatusLabel } from "@/lib/labels";

/**
 * Signal Filters — simple tabs + search
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
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
        <Input
          placeholder="搜索线索…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Status tabs */}
      <div className="flex gap-1">
        {FILTER_TABS.map((tab) => {
          const isActive = activeStatus === tab.key;
          const count = tab.key === "" ? counts.total : counts[tab.key];

          return (
            <button
              key={tab.key}
              onClick={() => onStatusChange(tab.key)}
              className={cn(
                "rounded-[8px] px-3 py-1.5 text-sm transition-colors duration-150",
                isActive
                  ? "bg-mint-100 text-mint-600 font-medium"
                  : "text-ink-secondary hover:bg-surface-subtle hover:text-ink-primary"
              )}
            >
              {tab.label}
              {count !== undefined && count > 0 && (
                <span className="ml-1.5 text-xs opacity-70">{count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
