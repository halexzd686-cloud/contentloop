"use client";

import { useState } from "react";
import Link from "next/link";
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
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { signalStatusLabel, confidenceLabel } from "@/lib/labels";

/**
 * Quick Review Panel — design.md §33.3
 * Shows signal detail + AI analysis + decision actions (Skip / Create Content).
 * Analysis fields show empty state when null — never mock data.
 * M1.2B: Analyze Signal (new/reviewing only); AI suggests, human decides.
 */

// ─── Types ─────────────────────────────────────────────

interface AnalysisEvidenceItem {
  claim: string;
  source: "signal_input" | "brand_context" | "model_inference";
}

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
  audienceFitScore: number | null;
  timingScore: number | null;
  contentPotentialScore: number | null;
  whyItMatters: string | null;
  audienceMatch: string | null;
  contentRisk: string | null;
  possibleAngles: string[] | null;
  analysisConfidence: string | null;
  analysisEvidence: AnalysisEvidenceItem[] | null;
  analyzedAt: string | null;
  skipReason: string | null;
  selectedAngle: string | null;
  primaryPlatform: string | null;
  ownerId: string | null;
  contentId: string | null;
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

const CONFIDENCE_CONFIG: Record<
  string,
  { variant: "mint" | "default" | "warning" | "danger" }
> = {
  high: { variant: "mint" },
  medium: { variant: "default" },
  low: { variant: "warning" },
  insufficient_evidence: { variant: "default" },
};

const EVIDENCE_SOURCE_LABELS: Record<string, string> = {
  signal_input: "Signal input",
  brand_context: "Brand context",
  model_inference: "AI inference",
};

// ─── Small pieces ──────────────────────────────────────

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

function ScoreValue({ value }: { value: number | null }) {
  return (
    <span className="text-sm text-ink-primary">
      {value === null ? "N/A" : value}
    </span>
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
  onAnalyze: (id: string) => Promise<void>;
  onClose: () => void;
}

export function QuickReview({
  signal,
  onSkip,
  onCreateContent,
  onAnalyze,
  onClose,
}: QuickReviewProps) {
  const [skipOpen, setSkipOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdContentId, setCreatedContentId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  if (!signal) {
    return (
      <div className="flex h-full items-center justify-center bg-canvas p-8">
        <div className="max-w-[240px] text-center">
          <p className="text-sm font-medium text-ink-secondary">Quick Review</p>
          <p className="mt-2 text-xs leading-relaxed text-ink-muted">
            Select a signal on the left to review its analysis, score and
            possible angles — then decide: skip it, or turn it into content.
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

  const analyzed = signal.analyzedAt !== null;
  const insufficient =
    analyzed && signal.analysisConfidence === "insufficient_evidence";

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

  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      await onAnalyze(signal!.id);
    } catch (err) {
      // Failure never clears an existing valid analysis.
      setAnalyzeError(
        err instanceof Error ? err.message : "Analysis failed. Please retry."
      );
    } finally {
      setAnalyzing(false);
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
                signal.status === "selected" ? "mint" : "default"
              }
            >
              {signalStatusLabel(signal.status)}
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

        {/* ─── AI Analysis ─── */}
        <div className="space-y-4 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Analysis
            </p>
            {analyzed && signal.analysisConfidence && (
              <Badge
                variant={
                  CONFIDENCE_CONFIG[signal.analysisConfidence]?.variant ||
                  "default"
                }
              >
                {signal.analysisConfidence === "insufficient_evidence"
                  ? confidenceLabel(signal.analysisConfidence)
                  : `${confidenceLabel(signal.analysisConfidence)} confidence`}
              </Badge>
            )}
          </div>

          {analyzeError && (
            <div className="rounded-[8px] border border-danger/20 bg-danger/5 p-3">
              <p className="text-xs text-danger">{analyzeError}</p>
              {canAct && (
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-mint-600 hover:underline disabled:opacity-50"
                >
                  <RefreshCw className="h-3 w-3" />
                  Retry
                </button>
              )}
            </div>
          )}

          {!analyzed ? (
            <>
              <EmptyField label="Topic Score" />
              <EmptyField label="Why It Matters" />
              <EmptyField label="Audience Match" />
              <EmptyField label="Content Risk" />
              <EmptyField label="Possible Angles" />
            </>
          ) : (
            <>
              {/* Topic Score */}
              <div>
                <p className="text-xs font-medium text-ink-muted">Topic Score</p>
                <p className="mt-0.5 text-[11px] text-ink-secondary">
                  Topic Score summarizes Audience Fit, Timing and Content
                  Potential.
                </p>
                {insufficient ? (
                  <p className="mt-1 text-sm text-ink-faint">
                    Not enough verified information to score this signal.
                  </p>
                ) : (
                  <div className="mt-1.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-ink-muted">Overall</span>
                      <span className="text-sm font-semibold text-ink-primary">
                        {signal.topicScore === null ? "N/A" : signal.topicScore}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-ink-muted">Audience Fit</span>
                      <ScoreValue value={signal.audienceFitScore} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-ink-muted">Timing</span>
                      <ScoreValue value={signal.timingScore} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-ink-muted">
                        Content Potential
                      </span>
                      <ScoreValue value={signal.contentPotentialScore} />
                    </div>
                  </div>
                )}
              </div>

              {/* Text fields */}
              <div>
                <p className="text-xs font-medium text-ink-muted">
                  Why It Matters
                </p>
                <p className="mt-1 text-sm text-ink-secondary">
                  {signal.whyItMatters || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-muted">
                  Audience Match
                </p>
                <p className="mt-1 text-sm text-ink-secondary">
                  {signal.audienceMatch || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-muted">
                  Content Risk
                </p>
                <p className="mt-1 text-sm text-ink-secondary">
                  {signal.contentRisk || "N/A"}
                </p>
              </div>

              {/* Possible Angles */}
              <div>
                <p className="text-xs font-medium text-ink-muted">
                  Possible Angles
                </p>
                {signal.possibleAngles && signal.possibleAngles.length > 0 ? (
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-ink-secondary">
                    {signal.possibleAngles.map((angle, i) => (
                      <li key={i}>{angle}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-ink-faint">
                    None suggested.
                  </p>
                )}
              </div>

              {/* Evidence */}
              {signal.analysisEvidence &&
                signal.analysisEvidence.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-ink-muted">
                      Evidence
                    </p>
                    <ul className="mt-1 space-y-1.5">
                      {signal.analysisEvidence.map((item, i) => (
                        <li key={i} className="text-xs text-ink-secondary">
                          <span className="mr-1.5 inline-block rounded bg-surface-subtle px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
                            {EVIDENCE_SOURCE_LABELS[item.source] ||
                              item.source}
                          </span>
                          {item.claim}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </>
          )}
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
            {(signal.contentId || createdContentId) && (
              <Link
                href={`/app/studio/${signal.contentId || createdContentId}`}
                className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-mint-600 hover:underline"
              >
                Open Content
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {canAct && (
        <div className="space-y-2 border-t border-border pt-4">
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={handleAnalyze}
            disabled={analyzing || actionLoading}
          >
            <Sparkles className="mr-1 h-3 w-3" />
            {analyzing
              ? "Analyzing signal…"
              : analyzed
                ? "Re-analyze Signal"
                : "Analyze Signal"}
          </Button>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSkipOpen(true)}
              disabled={actionLoading || analyzing}
            >
              Skip
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="flex-1"
              onClick={() => setCreateOpen(true)}
              disabled={actionLoading || analyzing}
            >
              Create Content
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
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
