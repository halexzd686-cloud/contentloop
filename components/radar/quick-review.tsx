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
import { signalStatusLabel, confidenceLabel, platformLabel } from "@/lib/labels";
import { DotTexture } from "@/components/reactbits/dot-texture";
import { ThinkingOrbs } from "@/components/motion/thinking-orbs";

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
  official: { label: "官方", icon: Building },
  community: { label: "社区", icon: Users },
  competitor: { label: "竞品", icon: Globe },
  news: { label: "资讯", icon: Newspaper },
  idea: { label: "想法", icon: Lightbulb },
  other: { label: "其他", icon: HelpCircle },
};

const SKIP_REASON_LABELS: Record<string, string> = {
  too_late: "时效已过",
  saturated: "内容已饱和",
  low_audience_fit: "受众匹配度低",
  insufficient_information: "信息不足",
  high_production_cost: "制作成本高",
  no_clear_angle: "没有清晰角度",
  other: "其他",
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
  signal_input: "线索输入",
  brand_context: "品牌上下文",
  model_inference: "AI 推断",
};

// ─── Small pieces ──────────────────────────────────────

function EmptyField({ label }: { label: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p className="mt-1 text-sm text-ink-faint">
        尚未生成 AI 分析。
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
      <div className="flex h-full items-center justify-center">
        <div className="relative max-w-[260px] px-6 py-10 text-center">
          {/* M5.6: compact intentional empty state — the pane itself
              stays a normal surface; restrained editorial texture only. */}
          <DotTexture className="pointer-events-none absolute inset-x-0 top-0 h-16 opacity-60" />
          <p className="relative text-sm font-medium text-ink-secondary">
            快速评估
          </p>
          <p className="relative mt-2 text-xs leading-relaxed text-ink-muted">
            从左侧选择一条线索，查看它的分析、评分和可选角度——然后决定：跳过，或创建内容。
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
        err instanceof Error ? err.message : "创建内容失败"
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
        err instanceof Error ? err.message : "分析失败，请重试。"
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
          快速评估
        </h2>
        <button
          onClick={onClose}
          className="text-xs text-ink-muted hover:text-ink-primary"
        >
          关闭
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
              查看来源
            </a>
          )}
          <p className="mt-1 text-xs text-ink-muted">
            {signal.publishedAt
              ? `发布于 ${new Date(signal.publishedAt).toLocaleDateString()}`
              : `添加于 ${new Date(signal.createdAt).toLocaleDateString()}`}
          </p>
        </div>

        {signal.summary && (
          <div>
            <p className="text-xs font-medium text-ink-muted">摘要</p>
            <p className="mt-1 text-sm text-ink-secondary">{signal.summary}</p>
          </div>
        )}

        {/* ─── AI Analysis ─── */}
        <div className="space-y-4 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              AI 分析
            </p>
            {analyzed && signal.analysisConfidence && (
              <Badge
                variant={
                  CONFIDENCE_CONFIG[signal.analysisConfidence]?.variant ||
                  "default"
                }
              >
                {confidenceLabel(signal.analysisConfidence)}
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
                  重试
                </button>
              )}
            </div>
          )}

          {!analyzed ? (
            <>
              <EmptyField label="选题评分" />
              <EmptyField label="为什么值得做" />
              <EmptyField label="受众匹配" />
              <EmptyField label="内容风险" />
              <EmptyField label="可选角度" />
            </>
          ) : (
            <>
              {/* Topic Score */}
              <div>
                <p className="text-xs font-medium text-ink-muted">选题评分</p>
                <p className="mt-0.5 text-[11px] text-ink-secondary">
                  选题评分综合受众匹配、时机和内容潜力。
                </p>
                {insufficient ? (
                  <p className="mt-1 text-sm text-ink-faint">
                    信息不足，暂无法评分。
                  </p>
                ) : (
                  <div className="mt-1.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-ink-muted">综合</span>
                      <span className="text-sm font-semibold text-ink-primary">
                        {signal.topicScore === null ? "N/A" : signal.topicScore}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-ink-muted">受众匹配</span>
                      <ScoreValue value={signal.audienceFitScore} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-ink-muted">时机</span>
                      <ScoreValue value={signal.timingScore} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-ink-muted">
                        内容潜力
                      </span>
                      <ScoreValue value={signal.contentPotentialScore} />
                    </div>
                  </div>
                )}
              </div>

              {/* Text fields */}
              <div>
                <p className="text-xs font-medium text-ink-muted">
                  为什么值得做
                </p>
                <p className="mt-1 text-sm text-ink-secondary">
                  {signal.whyItMatters || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-muted">
                  受众匹配
                </p>
                <p className="mt-1 text-sm text-ink-secondary">
                  {signal.audienceMatch || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-muted">
                  内容风险
                </p>
                <p className="mt-1 text-sm text-ink-secondary">
                  {signal.contentRisk || "N/A"}
                </p>
              </div>

              {/* Possible Angles */}
              <div>
                <p className="text-xs font-medium text-ink-muted">
                  可选角度
                </p>
                {signal.possibleAngles && signal.possibleAngles.length > 0 ? (
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-ink-secondary">
                    {signal.possibleAngles.map((angle, i) => (
                      <li key={i}>{angle}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-ink-faint">
                    暂无建议角度。
                  </p>
                )}
              </div>

              {/* Evidence */}
              {signal.analysisEvidence &&
                signal.analysisEvidence.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-ink-muted">
                      证据
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
            <p className="text-xs font-medium text-ink-muted">跳过原因</p>
            <p className="mt-1 text-sm text-ink-primary">
              {SKIP_REASON_LABELS[signal.skipReason] || signal.skipReason}
            </p>
          </div>
        )}

        {/* Selected state */}
        {isSelected && (
          <div className="rounded-[8px] border border-mint-600/20 bg-mint-100 p-3 space-y-2">
            <p className="text-xs font-medium text-mint-600">已选用</p>
            {signal.selectedAngle && (
              <p className="text-sm text-ink-primary">
                选定角度：{signal.selectedAngle}
              </p>
            )}
            {signal.primaryPlatform && (
              <p className="text-sm text-ink-secondary">
                主要平台：{platformLabel(signal.primaryPlatform)}
              </p>
            )}
            {createdContentId && (
              <p className="mt-2 text-sm font-medium text-mint-600">
                内容已创建。
              </p>
            )}
            {(signal.contentId || createdContentId) && (
              <Link
                href={`/app/studio/${signal.contentId || createdContentId}`}
                className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-mint-600 hover:underline"
              >
                打开内容
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {canAct && (
        <div className="space-y-2 border-t border-border pt-4">
          {/* M7: click → button hides, only Thinking Orbs remains */}
          {analyzing ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <ThinkingOrbs size={48} />
              <p className="text-xs text-ink-secondary">正在分析线索…</p>
            </div>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={handleAnalyze}
              disabled={actionLoading}
            >
              <Sparkles className="mr-1 h-3 w-3" />
              {analyzed ? "重新 AI 分析" : "AI 分析线索"}
            </Button>
          )}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSkipOpen(true)}
              disabled={actionLoading || analyzing}
            >
              跳过
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="flex-1"
              onClick={() => setCreateOpen(true)}
              disabled={actionLoading || analyzing}
            >
              创建内容
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
