"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SkipDialog } from "@/components/radar/skip-dialog";
import { CreateContentDialog } from "@/components/radar/create-content-dialog";
import {
  Globe,
  Lightbulb,
  Newspaper,
  Users,
  Building,
  HelpCircle,
  ExternalLink,
  ArrowRight,
} from "lucide-react";

/**
 * Quick Review Panel — design.md §33.3
 * Shows signal detail + decision actions (Skip / Create Content).
 * Analysis fields show empty state when null — never mock data.
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
  skipReason: string | null;
  selectedAngle: string | null;
  primaryPlatform: string | null;
  ownerId: string | null;
  createdAt: string;
}

// ─── Config ────────────────────────────────────────────

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

const STATUS_LABEL: Record<string, string> = {
  new: "NEW",
  reviewing: "REVIEWING",
  selected: "SELECTED",
  skipped: "SKIPPED",
};

const SKIP_REASON_LABELS: Record<string, string> = {
  too_late: "Too Late",
  saturated: "Saturated",
  low_audience_fit: "Low Audience Fit",
  insufficient_information: "Insufficient Information",
  high_production_cost: "High Production Cost",
  no_clear_angle: "No Clear Angle",
  other: "Other",
};

const PLATFORM_LABELS: Record<string, string> = {
  xiaohongshu: "Xiaohongshu",
  bilibili: "Bilibili",
  douyin: "Douyin",
};

// ─── Empty Analysis Field ──────────────────────────────

function EmptyField({ label }: { label: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p className="mt-1 text-sm text-ink-faint">
        Analysis not generated yet.
      </p>
    </div>
  );
}

// ─── Quick Review ──────────────────────────────────────

interface QuickReviewProps {
  signal: Signal | null;
  onSkip: (id: string, reason: string) => Promise<void>;
  onCreateContent: (
    id: string,
    data: { primaryPlatform: string; selectedAngle: string; ownerId: string }
  ) => Promise<string | null>;
  onClose: () => void;
}

export function QuickReview({
  signal,
  onSkip,
  onCreateContent,
  onClose,
}: QuickReviewProps) {
  const [skipOpen, setSkipOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdContentId, setCreatedContentId] = useState<string | null>(null);

  if (!signal) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-ink-muted">Select a signal to review</p>
          <p className="mt-1 text-xs text-ink-faint">
            Click a signal card on the left
          </p>
        </div>
      </div>
    );
  }

  const sourceConfig = signal.sourceType
    ? SOURCE_TYPE_CONFIG[signal.sourceType]
    : null;
  const SourceIcon = sourceConfig?.icon || HelpCircle;

  const canAct = signal.status === "new" || signal.status === "reviewing";
  const isSelected = signal.status === "selected";
  const isSkipped = signal.status === "skipped";

  async function handleSkip(reason: string) {
    setActionLoading(true);
    try {
      await onSkip(signal!.id, reason);
      setSkipOpen(false);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCreate(data: {
    primaryPlatform: string;
    selectedAngle: string;
    ownerId: string;
  }) {
    setActionLoading(true);
    setCreateError(null);
    try {
      const contentId = await onCreateContent(signal!.id, data);
      if (contentId) {
        setCreatedContentId(contentId);
        setCreateOpen(false);
      }
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create content"
      );
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h2 className="text-sm font-semibold text-ink-primary">
          Quick Review
        </h2>
        <button
          onClick={onClose}
          className="text-xs text-ink-muted hover:text-ink-primary"
        >
          Close
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto pt-4">
        {/* Signal Info */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            {sourceConfig && (
              <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
                <SourceIcon className="h-3 w-3" />
                {sourceConfig.label}
              </span>
            )}
            <Badge
              variant={
                signal.status === "selected"
                  ? "mint"
                  : signal.status === "skipped"
                    ? "danger"
                    : signal.status === "reviewing"
                      ? "warning"
                      : "default"
              }
            >
              {STATUS_LABEL[signal.status]}
            </Badge>
          </div>
          <h3 className="text-base font-semibold text-ink-primary leading-snug">
            {signal.title}
          </h3>
          {signal.sourceUrl && (
            <a
              href={signal.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs text-mint-600 hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              Source
            </a>
          )}
          <p className="mt-1 text-xs text-ink-muted">
            {signal.publishedAt
              ? `Published ${new Date(signal.publishedAt).toLocaleDateString()}`
              : `Added ${new Date(signal.createdAt).toLocaleDateString()}`}
          </p>
        </div>

        {signal.summary && (
          <div>
            <p className="text-xs font-medium text-ink-muted">Summary</p>
            <p className="mt-1 text-sm text-ink-secondary">{signal.summary}</p>
          </div>
        )}

        {/* Analysis fields — show empty state when null */}
        <div className="space-y-4 border-t border-border pt-4">
          {signal.topicScore !== null ? (
            <div>
              <p className="text-xs font-medium text-ink-muted">Topic Score</p>
              <p className="mt-1 text-sm text-ink-primary">
                {signal.topicScore}
              </p>
            </div>
          ) : (
            <EmptyField label="Topic Score" />
          )}
          <EmptyField label="Why It Matters" />
          <EmptyField label="Audience Match" />
          <EmptyField label="Content Risk" />
          <EmptyField label="Possible Angles" />
        </div>

        {/* Skipped state */}
        {isSkipped && signal.skipReason && (
          <div className="rounded-[8px] border border-danger/20 bg-danger/5 p-3">
            <p className="text-xs font-medium text-ink-muted">Skip Reason</p>
            <p className="mt-1 text-sm text-ink-primary">
              {SKIP_REASON_LABELS[signal.skipReason] || signal.skipReason}
            </p>
          </div>
        )}

        {/* Selected state */}
        {isSelected && (
          <div className="rounded-[8px] border border-mint-600/20 bg-mint-100 p-3 space-y-2">
            <p className="text-xs font-medium text-mint-600">Selected</p>
            {signal.selectedAngle && (
              <p className="text-sm text-ink-primary">
                Angle: {signal.selectedAngle}
              </p>
            )}
            {signal.primaryPlatform && (
              <p className="text-sm text-ink-secondary">
                Platform: {PLATFORM_LABELS[signal.primaryPlatform] || signal.primaryPlatform}
              </p>
            )}
            {createdContentId && (
              <p className="mt-2 text-sm font-medium text-mint-600">
                Content created successfully.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {canAct && (
        <div className="flex gap-2 border-t border-border pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSkipOpen(true)}
            disabled={actionLoading}
          >
            Skip
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            onClick={() => setCreateOpen(true)}
            disabled={actionLoading}
          >
            Create Content
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <SkipDialog
        open={skipOpen}
        onOpenChange={setSkipOpen}
        onConfirm={handleSkip}
        loading={actionLoading}
      />
      <CreateContentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onConfirm={handleCreate}
        loading={actionLoading}
        error={createError}
      />
    </div>
  );
}
