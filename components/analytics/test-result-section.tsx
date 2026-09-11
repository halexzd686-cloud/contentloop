"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { formatMetricValue } from "@/lib/metrics/engine";
import type { ResultRow, BaselineCell } from "@/lib/tests-result";
import {
  testOutcomeLabel,
  testRoleLabel,
  TEST_OUTCOME_HELPERS,
} from "@/lib/labels";

/**
 * M3.2 Observed Results + Complete Test panel.
 *
 * Frozen rules: server owns every number; outcomes are human judgment
 * (Win/Loss/Trade-off/No Clear Result); no "significant/proved/winner"
 * language; concluded tests show frozen evidence ("captured at
 * conclusion time") with a stale banner when the subject changed.
 */

const OUTCOME_KEYS = ["win", "loss", "trade_off", "no_clear_result"] as const;

export interface ResultData {
  test: { checkpoint: string };
  /** Present on running (runtime); concluded carries it inside evidence. */
  primaryMetric?: {
    key: string;
    format: "count" | "percentage" | "ratio";
    label: string;
  } | null;
  rows: ResultRow[];
  readiness: {
    canConclude: boolean;
    forcedOutcome: string | null;
    reasons: string[];
  };
  previewFingerprint: string;
  baselineError: string | null;
  evidence?: {
    primaryMetric?: {
      key: string;
      format: "count" | "percentage" | "ratio";
      label: string;
    };
    publications: ResultRow[];
  };
  outcome?: string | null;
  conclusion?: string | null;
  concludedAt?: string | null;
  resultStale?: boolean;
}

function BaselineText({
  cell,
  format,
}: {
  cell: BaselineCell;
  format: "count" | "percentage" | "ratio";
}) {
  if (!cell.available) return <span className="text-ink-faint">N/A</span>;
  return (
    <span className="text-ink-secondary">
      {/* Same shared formatter as the primary value — one format per
          MetricDefinition, presentation-only. */}
      {formatMetricValue(format, cell.median)}
      <span className="ml-1 text-ink-faint">（n={cell.sampleCount}）</span>
    </span>
  );
}

export function ResultSection({
  running,
  result,
  resultError,
  onRetryResult,
  concludeOpen,
  onOpenConclude,
  onCloseConclude,
  outcome,
  setOutcome,
  conclusion,
  setConclusion,
  onConclude,
  busy,
}: {
  running: boolean;
  result: ResultData | null;
  resultError: string | null;
  onRetryResult: () => void;
  concludeOpen: boolean;
  onOpenConclude: () => void;
  onCloseConclude: () => void;
  outcome: string;
  setOutcome: (v: string) => void;
  conclusion: string;
  setConclusion: (v: string) => void;
  onConclude: () => void;
  busy: boolean;
}) {
  if (resultError) {
    return (
      <section className="rounded-[8px] border border-danger/20 bg-danger/5 p-3">
        <p className="text-xs text-danger">{resultError}</p>
        <button
          className="mt-1 text-xs text-mint-600 underline"
          onClick={onRetryResult}
        >
          重试
        </button>
      </section>
    );
  }
  if (!result) {
    return (
      <section className="rounded-[8px] border border-border bg-canvas p-3">
        <p className="text-xs text-ink-faint">正在加载观察结果…</p>
      </section>
    );
  }

  const rows = result.evidence?.publications ?? result.rows ?? [];
  // Running → runtime primaryMetric; concluded → frozen evidence's.
  const pm = result.primaryMetric ?? result.evidence?.primaryMetric ?? null;

  return (
    <section className="rounded-[8px] border border-border bg-canvas p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
        观察结果 — {pm?.label ?? "主要指标"} · {result.test.checkpoint}
      </p>

      {!running && (
        <p className="mt-1 text-[11px] text-ink-faint">
          证据于结论时定格。
        </p>
      )}
      {!running && result.resultStale && (
        <p className="mt-1 rounded-[8px] border border-warning/30 bg-warning/5 p-2 text-xs text-ink-secondary">
          该测试完成后，关联发布数据已变化。
        </p>
      )}

      <div className="mt-2 space-y-1.5">
        {rows.length === 0 && (
          <p className="text-xs text-ink-faint">
            关联发布记录以观察结果。
          </p>
        )}
        {rows.map((r) => (
          <div
            key={r.publicationId}
            className="rounded-[8px] border border-border bg-workspace px-3 py-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ink-primary">
                {r.finalTitle}
              </span>
              <span className="text-[11px] text-ink-faint">{testRoleLabel(r.role)}</span>
            </div>
            {r.availability === "awaiting" ? (
              <p className="mt-0.5 text-[11px] text-ink-muted">
                还没有 {result.test.checkpoint} 数据
              </p>
            ) : r.availability === "metric_unavailable" ? (
              <p className="mt-0.5 text-[11px] text-ink-muted">
                主要指标不可用（N/A）
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-ink-secondary">
                <span className="font-medium text-ink-primary">
                  {pm ? formatMetricValue(pm.format, r.value) : "N/A"}
                </span>
                {" · "}账号中位数{" "}
                <BaselineText cell={r.accountBaseline} format={pm?.format ?? "count"} />
                {" · "}方向中位数{" "}
                <BaselineText cell={r.pillarBaseline} format={pm?.format ?? "count"} />
                {r.captureDeltaMinutes !== null && (
                  <span className="ml-1 text-ink-faint">
                    · 采集 {r.captureDeltaMinutes >= 0 ? "+" : ""}
                    {Math.round(r.captureDeltaMinutes)} 分钟（相对目标）
                  </span>
                )}
              </p>
            )}
          </div>
        ))}
      </div>

      {result.baselineError && (
        <p className="mt-2 text-xs text-danger">
          基线上下文不可用。{" "}
          <button className="underline" onClick={onRetryResult}>
            重试
          </button>
        </p>
      )}

      {!running && (
        <div className="mt-3 border-t border-border pt-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-ink-secondary">
            <span>结果：</span>
            <Badge variant={result.outcome === "win" ? "mint" : "default"}>
              {result.outcome ? testOutcomeLabel(result.outcome) : "—"}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-ink-primary">{result.conclusion}</p>
          {result.concludedAt && (
            <p className="mt-1 text-[11px] text-ink-faint">
              完成于 {new Date(result.concludedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {running && !concludeOpen && (
        <div className="mt-3 border-t border-border pt-3">
          {result.readiness.reasons.length > 0 && (
            <ul className="mb-2 space-y-1 text-[11px] text-ink-muted">
              {result.readiness.reasons.map((r) => (
                <li key={r}>• {r}</li>
              ))}
            </ul>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenConclude}
            disabled={!result.readiness.canConclude || !!result.baselineError}
          >
            <Check className="mr-1 h-3 w-3" />
            完成测试
          </Button>
        </div>
      )}

      {running && concludeOpen && (
        <div className="mt-3 space-y-3 rounded-[8px] border border-mint-600/30 bg-mint-100/40 p-3">
          <p className="text-xs font-medium text-ink-primary">
            请复核上方观察结果。确认后，证据将随你的结论一起保存。
          </p>
          {result.readiness.forcedOutcome === "no_clear_result" && (
            <p className="rounded-[8px] border border-warning/30 bg-warning/5 p-2 text-[11px] text-ink-secondary">
              {result.readiness.reasons.join(" ")}当前只能得出“无明确结论”。
            </p>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-secondary">
              结果
            </label>
            <select
              className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
            >
              {OUTCOME_KEYS.map((k) => (
                <option
                  key={k}
                  value={k}
                  disabled={
                    result.readiness.forcedOutcome === "no_clear_result" &&
                    k !== "no_clear_result"
                  }
                >
                  {testOutcomeLabel(k)}
                  {TEST_OUTCOME_HELPERS[k] ? ` — ${TEST_OUTCOME_HELPERS[k]}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-secondary">
              结论 *
            </label>
            <textarea
              rows={3}
              maxLength={2000}
              className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600"
              placeholder="描述你观察到的现象，而不是证明了什么。"
              value={conclusion}
              onChange={(e) => setConclusion(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={onConclude}
              disabled={busy || conclusion.trim() === ""}
            >
              {busy ? "保存中…" : "确认结论"}
            </Button>
            <Button variant="ghost" size="sm" onClick={onCloseConclude}>
              取消
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
