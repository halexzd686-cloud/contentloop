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
      <span className="ml-1 text-ink-faint">(n={cell.sampleCount})</span>
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
          Retry
        </button>
      </section>
    );
  }
  if (!result) {
    return (
      <section className="rounded-[8px] border border-border bg-canvas p-3">
        <p className="text-xs text-ink-faint">Loading observed results…</p>
      </section>
    );
  }

  const rows = result.evidence?.publications ?? result.rows ?? [];
  // Running → runtime primaryMetric; concluded → frozen evidence's.
  const pm = result.primaryMetric ?? result.evidence?.primaryMetric ?? null;

  return (
    <section className="rounded-[8px] border border-border bg-canvas p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Observed Results — {pm?.label ?? "Primary metric"} · {result.test.checkpoint}
      </p>

      {!running && (
        <p className="mt-1 text-[11px] text-ink-faint">
          Evidence captured at conclusion time.
        </p>
      )}
      {!running && result.resultStale && (
        <p className="mt-1 rounded-[8px] border border-warning/30 bg-warning/5 p-2 text-xs text-ink-secondary">
          Underlying publication data changed since this Test was concluded.
        </p>
      )}

      <div className="mt-2 space-y-1.5">
        {rows.length === 0 && (
          <p className="text-xs text-ink-faint">
            Attach publications to observe results.
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
                No {result.test.checkpoint} data yet
              </p>
            ) : r.availability === "metric_unavailable" ? (
              <p className="mt-0.5 text-[11px] text-ink-muted">
                Primary metric unavailable (N/A)
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-ink-secondary">
                <span className="font-medium text-ink-primary">
                  {pm ? formatMetricValue(pm.format, r.value) : "N/A"}
                </span>
                {" · "}Account median{" "}
                <BaselineText cell={r.accountBaseline} format={pm?.format ?? "count"} />
                {" · "}Pillar median{" "}
                <BaselineText cell={r.pillarBaseline} format={pm?.format ?? "count"} />
                {r.captureDeltaMinutes !== null && (
                  <span className="ml-1 text-ink-faint">
                    · captured {r.captureDeltaMinutes >= 0 ? "+" : ""}
                    {Math.round(r.captureDeltaMinutes)}min
                  </span>
                )}
              </p>
            )}
          </div>
        ))}
      </div>

      {result.baselineError && (
        <p className="mt-2 text-xs text-danger">
          Baseline context unavailable.{" "}
          <button className="underline" onClick={onRetryResult}>
            Retry
          </button>
        </p>
      )}

      {!running && (
        <div className="mt-3 border-t border-border pt-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-ink-secondary">
            <span>Outcome:</span>
            <Badge variant={result.outcome === "win" ? "mint" : "default"}>
              {result.outcome ? testOutcomeLabel(result.outcome) : "—"}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-ink-primary">{result.conclusion}</p>
          {result.concludedAt && (
            <p className="mt-1 text-[11px] text-ink-faint">
              Concluded {new Date(result.concludedAt).toLocaleString()}
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
            Complete Test
          </Button>
        </div>
      )}

      {running && concludeOpen && (
        <div className="mt-3 space-y-3 rounded-[8px] border border-mint-600/30 bg-mint-100/40 p-3">
          <p className="text-xs font-medium text-ink-primary">
            Review the observed results above. The evidence is saved with your
            conclusion when you confirm.
          </p>
          {result.readiness.forcedOutcome === "no_clear_result" && (
            <p className="rounded-[8px] border border-warning/30 bg-warning/5 p-2 text-[11px] text-ink-secondary">
              {result.readiness.reasons.join(" ")} Only No clear result is
              available.
            </p>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-secondary">
              Outcome
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
              Conclusion *
            </label>
            <textarea
              rows={3}
              maxLength={2000}
              className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600"
              placeholder="Describe what you observed, not what was proven."
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
              {busy ? "Concluding…" : "Confirm Conclusion"}
            </Button>
            <Button variant="ghost" size="sm" onClick={onCloseConclude}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
