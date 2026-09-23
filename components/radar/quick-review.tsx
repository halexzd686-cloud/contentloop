"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SkipDialog } from "@/components/radar/skip-dialog";
import { CreateContentDialog } from "@/components/radar/create-content-dialog";
import {
  ExternalLink,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { signalStatusLabel, confidenceLabel, platformLabel } from "@/lib/labels";
import { DotTexture } from "@/components/reactbits/dot-texture";
import { ThinkingOrbs } from "@/components/motion/thinking-orbs";
import { AiActionButton } from "@/components/ui/ai-action-button";

/**
 * Quick Review — M7 P4: Review Sheet.
 * Playfair score numeral + primary rule (approved F3+D), hairline
 * sections, numbered angle rows with selected rail. All analysis
 * fields keep null-truth: unanalyzed shows explicit empty state,
 * never mock data. AI suggests, human decides.
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

const SOURCE_TYPE_LABELS: Record<string, string> = {
  official: "官方",
  community: "社区",
  competitor: "竞品",
  news: "资讯",
  idea: "想法",
  other: "其他",
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

const HAIRLINE = "1px solid var(--border-hairline)";
const RULE = "1px solid var(--border)";

// ─── Small pieces ──────────────────────────────────────

function SectionRule() {
  return (
    <hr className="my-[15px]" style={{ border: "none", borderTop: RULE }} />
  );
}

function EmptyField({ label }: { label: string }) {
  return (
    <div className="py-[6px]" style={{ borderBottom: HAIRLINE }}>
      <span className="text-[13px] text-ink-primary">{label}</span>
      <span className="ml-2 text-xs text-ink-faint">尚未生成 AI 分析</span>
    </div>
  );
}

function DimRow({ label, value }: { label: string; value: number | null }) {
  return (
    <div
      className="flex items-baseline justify-between py-[6px] text-[13px]"
      style={{ borderBottom: HAIRLINE }}
    >
      <span className="text-ink-primary">{label}</span>
      <span className="text-[13.5px] font-semibold tabular-nums text-ink-primary">
        {value === null ? "N/A" : value}
      </span>
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
          {/* Restrained editorial texture; static under
              prefers-reduced-motion. */}
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

  const sourceLabel = signal.sourceType
    ? SOURCE_TYPE_LABELS[signal.sourceType] || signal.sourceType
    : null;

  const canAct = signal.status === "new" || signal.status === "reviewing";
  const isSelected = signal.status === "selected";
  const isSkipped = signal.status === "skipped";

  const analyzed = signal.analyzedAt !== null;
  const insufficient =
    analyzed && signal.analysisConfidence === "insufficient_evidence";

  const timeMeta = signal.publishedAt
    ? `发布于 ${new Date(signal.publishedAt).toLocaleDateString()}`
    : `添加于 ${new Date(signal.createdAt).toLocaleDateString()}`;

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
    <div className="flex h-full flex-col px-[26px] py-5">
      {/* Sheet header */}
      <div className="flex items-baseline justify-between">
        <span
          className="text-[11px] font-medium tracking-[0.14em]"
          style={{ color: "var(--ink-muted)" }}
        >
          快速评估
        </span>
        <span className="flex items-center gap-3">
          <span
            className="flex items-center gap-1.5 text-[11px]"
            style={{ color: "var(--ink-muted)" }}
          >
            <span
              className="inline-block h-1 w-1 rounded-full"
              style={{ background: "var(--cl-gold)" }}
            />
            AI 分析 · 由你确认
          </span>
          <button
            onClick={onClose}
            className="text-[11px] text-ink-muted hover:text-ink-primary"
          >
            关闭
          </button>
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Title + meta */}
        <h2 className="mt-2 text-[17px] font-semibold leading-relaxed text-ink-primary">
          {signal.title}
        </h2>
        <p className="mt-[5px] text-xs" style={{ color: "var(--cl-neutral)" }}>
          {[sourceLabel, timeMeta].filter(Boolean).join(" · ")}
          {" · "}
          {signalStatusLabel(signal.status)}
        </p>
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
        {signal.summary && (
          <p className="mt-2 text-[13px] leading-[1.6]" style={{ color: "var(--cl-neutral)" }}>
            {signal.summary}
          </p>
        )}

        <SectionRule />

        {/* Score — Playfair Display numeral + primary rule (F3+D) */}
        {!analyzed ? (
          <div>
            <EmptyField label="选题评分" />
            <EmptyField label="为什么值得做" />
            <EmptyField label="受众匹配" />
            <EmptyField label="内容风险" />
            <EmptyField label="可选角度" />
          </div>
        ) : insufficient ? (
          <p className="text-sm text-ink-faint">
            信息不足，暂无法评分。可补充线索信息后重新分析。
          </p>
        ) : (
          <>
            <div className="flex items-end gap-4">
              <span className="inline-flex flex-col">
                <span
                  className="text-ink-primary"
                  style={{
                    fontFamily: "var(--font-playfair), serif",
                    fontWeight: 600,
                    fontSize: 46,
                    lineHeight: 1,
                  }}
                >
                  {signal.topicScore === null ? "N/A" : signal.topicScore}
                </span>
                <span
                  className="mt-2 w-full"
                  style={{ borderTop: "1.5px solid var(--cl-primary)" }}
                />
              </span>
              <span className="pb-[5px] text-xs" style={{ color: "var(--ink-muted)" }}>
                选题评分<span> / 100</span>
              </span>
              {signal.analysisConfidence && (
                <span className="ml-auto pb-[5px]">
                  <Badge
                    variant={
                      CONFIDENCE_CONFIG[signal.analysisConfidence]?.variant ||
                      "default"
                    }
                  >
                    {confidenceLabel(signal.analysisConfidence)}
                  </Badge>
                </span>
              )}
            </div>
            <div className="mt-3">
              <DimRow label="受众匹配" value={signal.audienceFitScore} />
              <DimRow label="时机" value={signal.timingScore} />
              <DimRow label="内容潜力" value={signal.contentPotentialScore} />
            </div>

            <SectionRule />

            {/* Why it matters */}
            <div>
              <div className="text-[13.5px] font-semibold text-ink-primary">
                为什么值得做
              </div>
              <p
                className="mt-[7px] text-[13.5px] leading-[1.65]"
                style={{ color: "var(--cl-neutral)" }}
              >
                {signal.whyItMatters || "N/A"}
              </p>
            </div>

            <SectionRule />

            {/* Audience / Risk */}
            <div className="grid grid-cols-2 gap-5">
              <div>
                <div
                  className="text-xs font-semibold"
                  style={{ color: "var(--cl-neutral)" }}
                >
                  受众匹配
                </div>
                <p
                  className="mt-1.5 text-[13px] leading-[1.6]"
                  style={{ color: "var(--cl-neutral)" }}
                >
                  {signal.audienceMatch || "N/A"}
                </p>
              </div>
              <div>
                <div
                  className="text-xs font-semibold"
                  style={{ color: "var(--cl-neutral)" }}
                >
                  内容风险
                </div>
                <p
                  className="mt-1.5 text-[13px] leading-[1.6]"
                  style={{ color: "var(--cl-neutral)" }}
                >
                  {signal.contentRisk || "N/A"}
                </p>
              </div>
            </div>

            <SectionRule />

            {/* Possible angles — numbered rows, selected rail */}
            <div>
              <div className="mb-1.5 text-[13.5px] font-semibold text-ink-primary">
                可选角度
              </div>
              {signal.possibleAngles && signal.possibleAngles.length > 0 ? (
                signal.possibleAngles.map((angle, i) => {
                  const sel = signal.selectedAngle === angle;
                  return (
                    <div
                      key={i}
                      className="relative flex gap-3.5 px-2 py-2"
                      style={{
                        borderBottom: HAIRLINE,
                        background: sel
                          ? "var(--mint-tint)"
                          : undefined,
                      }}
                    >
                      {sel && (
                        <span
                          className="absolute left-0 top-1/2 h-[22px] w-[2px] -translate-y-1/2 rounded-full"
                          style={{ background: "var(--cl-primary)" }}
                        />
                      )}
                      <span
                        className="w-5 shrink-0 text-[14px]"
                        style={{
                          fontFamily: "var(--font-cormorant), serif",
                          color: "var(--ink-muted)",
                        }}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="text-[13.5px] leading-[1.55] text-ink-primary">
                        {angle}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-[13px] text-ink-faint">暂无建议角度。</p>
              )}
            </div>

            {/* Evidence */}
            {signal.analysisEvidence && signal.analysisEvidence.length > 0 && (
              <>
                <SectionRule />
                <div>
                  <div
                    className="mb-1.5 text-xs font-semibold"
                    style={{ color: "var(--cl-neutral)" }}
                  >
                    证据
                  </div>
                  <ul className="space-y-1.5">
                    {signal.analysisEvidence.map((item, i) => (
                      <li
                        key={i}
                        className="text-xs"
                        style={{ color: "var(--cl-neutral)" }}
                      >
                        <span className="mr-1.5 inline-block rounded bg-surface-subtle px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
                          {EVIDENCE_SOURCE_LABELS[item.source] || item.source}
                        </span>
                        {item.claim}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </>
        )}

        {analyzeError && (
          <div className="mt-4 rounded-[8px] border border-danger/20 bg-danger/5 p-3">
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

        {/* Skipped state */}
        {isSkipped && signal.skipReason && (
          <>
            <SectionRule />
            <div className="rounded-[8px] border border-danger/20 bg-danger/5 p-3">
              <p className="text-xs font-medium text-ink-muted">跳过原因</p>
              <p className="mt-1 text-sm text-ink-primary">
                {SKIP_REASON_LABELS[signal.skipReason] || signal.skipReason}
              </p>
            </div>
          </>
        )}

        {/* Selected state */}
        {isSelected && (
          <>
            <SectionRule />
            <div className="space-y-2 rounded-[8px] border border-mint-600/20 bg-mint-100 p-3">
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
          </>
        )}
      </div>

      {/* Actions */}
      {canAct && (
        <div className="space-y-3 pt-4" style={{ borderTop: RULE }}>
          {/* M7: click → morph → button gone, Thinking Orbs remains */}
          {analyzing ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <ThinkingOrbs size={48} />
              <p className="text-xs text-ink-secondary">正在分析线索…</p>
            </div>
          ) : (
            <AiActionButton
              label={analyzed ? "重新 AI 分析" : "AI 分析线索"}
              onClick={handleAnalyze}
              disabled={actionLoading}
            />
          )}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSkipOpen(true)}
              disabled={actionLoading || analyzing}
              className="text-[12.5px] disabled:opacity-50"
              style={{ color: "var(--cl-neutral)" }}
            >
              跳过线索
            </button>
            <Button
              variant="primary"
              size="sm"
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
