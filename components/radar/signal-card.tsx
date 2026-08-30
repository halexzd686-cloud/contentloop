"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChevronDown,
  Globe,
  Lightbulb,
  Newspaper,
  Users,
  Building,
  HelpCircle,
} from "lucide-react";

/**
 * Signal Card — design.md §33.2
 * Medium density. Shows: source type, title, time, summary, status.
 * Topic Score: null → not displayed (never 0).
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
  createdAt: string;
}

// ─── Source Type Config ────────────────────────────────

const SOURCE_TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  official: { label: "Official", icon: Building },
  community: { label: "Community", icon: Users },
  competitor: { label: "Competitor", icon: Globe },
  news: { label: "News", icon: Newspaper },
  idea: { label: "Idea", icon: Lightbulb },
  other: { label: "Other", icon: HelpCircle },
};

const STATUS_VARIANT: Record<
  string,
  "default" | "mint" | "warning" | "danger"
> = {
  new: "default",
  reviewing: "warning",
  selected: "mint",
  skipped: "danger",
};

const STATUS_LABEL: Record<string, string> = {
  new: "NEW",
  reviewing: "REVIEWING",
  selected: "SELECTED",
  skipped: "SKIPPED",
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

  // M1.1: only allow toggling between new and reviewing
  const availableActions =
    currentStatus === "new"
      ? [{ status: "reviewing" as const, label: "Start Reviewing" }]
      : currentStatus === "reviewing"
        ? [{ status: "new" as const, label: "Back to New" }]
        : [];

  if (availableActions.length === 0) return null;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className="text-xs"
      >
        Update Status
        <ChevronDown className="ml-1 h-3 w-3" />
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

// ─── Signal Card ───────────────────────────────────────

export function SignalCard({
  signal,
  onStatusChange,
  updating,
}: {
  signal: Signal;
  onStatusChange: (id: string, status: "new" | "reviewing") => void;
  updating: boolean;
}) {
  const sourceConfig = signal.sourceType
    ? SOURCE_TYPE_CONFIG[signal.sourceType]
    : null;
  const SourceIcon = sourceConfig?.icon || HelpCircle;
  const timeDisplay = signal.publishedAt
    ? new Date(signal.publishedAt).toLocaleDateString()
    : new Date(signal.createdAt).toLocaleDateString();

  return (
    <Card className="transition-colors duration-150 hover:border-border-strong">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="mb-1.5 flex items-center gap-2">
              {sourceConfig && (
                <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
                  <SourceIcon className="h-3 w-3" />
                  {sourceConfig.label}
                </span>
              )}
              <span className="text-xs text-ink-muted">{timeDisplay}</span>
            </div>
            <CardTitle className="text-[15px] leading-snug">
              {signal.title}
            </CardTitle>
          </div>
          <Badge variant={STATUS_VARIANT[signal.status] || "default"}>
            {STATUS_LABEL[signal.status] || signal.status}
          </Badge>
        </div>
      </CardHeader>
      {signal.summary && (
        <CardContent className="pt-0 pb-3">
          <p className="text-sm text-ink-secondary line-clamp-2">
            {signal.summary}
          </p>
        </CardContent>
      )}
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {signal.topicScore !== null && (
              <span className="text-xs text-ink-muted">
                Score: {signal.topicScore}
              </span>
            )}
          </div>
          <StatusMenu
            currentStatus={signal.status}
            onStatusChange={(status) => onStatusChange(signal.id, status)}
            disabled={updating}
          />
        </div>
      </CardContent>
    </Card>
  );
}
