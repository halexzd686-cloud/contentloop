"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { signalStatusLabel } from "@/lib/labels";

/**
 * Signal Row — M7 P4: research-index row (replaces card).
 * Cormorant index number + title + meta + status dot; selected
 * state = 2px primary left rail + tint. Status transitions
 * (new ↔ reviewing) preserved as a hover-revealed action.
 * Topic Score: null → "未评分" (never 0).
 */

// ─── Types ─────────────────────────────────────────────

interface Signal {
  id: string;
  inputType: "url" | "idea";
  sourceUrl: string | null;
  sourceType: string | null;
  title: string;
  summary: string | null;
  publishedAt: string | null;
  status: "new" | "reviewing" | "selected" | "skipped";
  topicScore: number | null;
  analyzedAt: string | null;
  skipReason: string | null;
  selectedAngle: string | null;
  primaryPlatform: string | null;
  ownerId: string | null;
  createdAt: string;
}

// ─── Config ────────────────────────────────────────────

const SOURCE_TYPE_LABELS: Record<string, string> = {
  official: "官方",
  community: "社区",
  competitor: "竞品",
  news: "资讯",
  idea: "想法",
  other: "其他",
};

const STATUS_DOT: Record<string, string> = {
  new: "#C8C9CB",
  reviewing: "#7C9482",
  selected: "#D4B26A",
  skipped: "#8B8E87",
};

// ─── Status Menu (M1.1: new ↔ reviewing only) ─────────

function StatusMenu({
  currentStatus,
  onStatusChange,
  disabled,
}: {
  currentStatus: string;
  onStatusChange: (status: "new" | "reviewing") => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);

  const availableActions =
    currentStatus === "new"
      ? [{ status: "reviewing" as const, label: "开始评估" }]
      : currentStatus === "reviewing"
        ? [{ status: "new" as const, label: "回到新线索" }]
        : [];

  if (availableActions.length === 0) return null;

  return (
    <div
      className="relative opacity-0 transition-opacity duration-150 group-hover:opacity-100"
      onClick={(e) => e.stopPropagation()}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className="h-6 px-1.5 text-[11px] text-ink-muted"
      >
        更新状态
        <ChevronDown className="ml-0.5 h-3 w-3" />
      </Button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-20 mt-1 min-w-[140px] rounded-[8px] border border-border bg-workspace py-1 shadow-md">
            {availableActions.map((action) => (
              <button
                key={action.status}
                className="w-full px-3 py-1.5 text-left text-xs text-ink-secondary hover:bg-surface-subtle hover:text-ink-primary"
                onClick={() => {
                  onStatusChange(action.status);
                  setOpen(false);
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Signal Row ────────────────────────────────────────

export function SignalCard({
  signal,
  index,
  onStatusChange,
  updating,
  selected,
  onSelect,
}: {
  signal: Signal;
  index: number;
  onStatusChange: (id: string, status: "new" | "reviewing") => void;
  updating: boolean;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const sourceLabel = signal.sourceType
    ? SOURCE_TYPE_LABELS[signal.sourceType] || signal.sourceType
    : null;
  const timeDisplay = signal.publishedAt
    ? new Date(signal.publishedAt).toLocaleDateString()
    : new Date(signal.createdAt).toLocaleDateString();
  // Data truth: only formally analyzed signals may show a score
  const scoreText =
    signal.analyzedAt !== null && signal.topicScore !== null
      ? `评分 ${signal.topicScore}`
      : "未评分";
  const meta = [sourceLabel, timeDisplay, scoreText].filter(Boolean).join(" · ");

  return (
    <div
      className="group relative flex cursor-pointer items-center gap-4 px-3 py-[13px] transition-colors duration-150 hover:bg-[rgba(124,148,130,0.05)]"
      style={{
        borderBottom: "1px solid rgba(200,201,203,0.4)",
        background: selected ? "rgba(124,148,130,0.07)" : undefined,
      }}
      onClick={() => onSelect(signal.id)}
    >
      {selected && (
        <span
          className="absolute left-0 top-1/2 h-6 w-[2px] -translate-y-1/2 rounded-full"
          style={{ background: "#7C9482" }}
        />
      )}
      <span
        className="w-5 shrink-0 text-[14px]"
        style={{
          fontFamily: "var(--font-cormorant), serif",
          color: "#8B8E87",
        }}
      >
        {String(index).padStart(2, "0")}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14.5px] font-semibold text-ink-primary">
          {signal.title}
        </div>
        <div className="mt-1 truncate text-xs" style={{ color: "#626660" }}>
          {meta}
        </div>
      </div>
      <StatusMenu
        currentStatus={signal.status}
        onStatusChange={(status) => onStatusChange(signal.id, status)}
        disabled={updating}
      />
      <span
        className="flex shrink-0 items-center gap-1.5 text-xs"
        style={{ color: "#626660" }}
      >
        <span
          className="inline-block h-[5px] w-[5px] rounded-full"
          style={{ background: STATUS_DOT[signal.status] || "#8B8E87" }}
        />
        {signalStatusLabel(signal.status)}
      </span>
    </div>
  );
}
