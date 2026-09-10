"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { ProtoShell } from "../shell";
import { platformLabel, BASELINE_COHORT_HELPER } from "@/lib/labels";

/**
 * M5.6 Phase 1 — Analytics detail V2 prototype. Evidence-first:
 * FACT → COMPARISON → INTERPRETATION. Current values strongest
 * (tabular numerals), medians quiet, diagnosis visually secondary.
 * No charts, no good/bad color. Read-only against a real publication.
 */

const PUB = "8605dbed-6685-4106-8a07-7c7ebe4aa7d1"; // real xhs publication
const CP = "72h";

interface Metric {
  key: string;
  label: string;
  type: "raw" | "derived";
  format: string;
  value: number | null;
  formulaPreview: string | null;
}

interface Detail {
  fact: {
    finalTitle: string;
    platform: string;
    pillarName: string | null;
    checkpoint: string;
    publishedAt: string;
    targetAt: string;
    capturedAt: string | null;
    hasSnapshot: boolean;
    isDemo: boolean;
    metrics: Metric[];
  };
  accountBaseline: { metrics: Record<string, { median: number | null; sampleCount: number }> } | null;
  pillarBaseline: { metrics: Record<string, { median: number | null; sampleCount: number }> } | null;
  diagnosis: {
    whatHappened: string;
    evidence: { metricKey: string; comparisonText: string }[];
    possibleReasons: string[];
    confidence: string;
    nextActions: string[];
  } | null;
}

function fmt(m: Metric): string {
  if (m.value === null) return "N/A";
  if (m.format === "percentage") return `${m.value.toFixed(1)}%`;
  if (m.format === "ratio") return `${m.value.toFixed(1)}:1`;
  return m.value.toLocaleString();
}

function medianOf(
  scope: Detail["accountBaseline"],
  key: string
): { median: number | null; sampleCount: number } | null {
  return scope?.metrics[key] ?? null;
}

export default function AnalyticsV2() {
  const [detail, setDetail] = useState<Detail | null>(null);

  useEffect(() => {
    const t = setTimeout(async () => {
      const det = await fetch(`/api/analytics/${PUB}/${CP}`).then((r) => r.json());
      setDetail(det);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  if (!detail) {
    return (
      <ProtoShell active="analytics">
        <div className="p-8 text-sm text-ink-muted">Loading…</div>
      </ProtoShell>
    );
  }

  const f = detail.fact;
  const raws = f.metrics.filter((m) => m.type === "raw");
  const deriveds = f.metrics.filter((m) => m.type === "derived");

  return (
    <ProtoShell active="analytics">
      <div className="border-b border-border bg-workspace px-8 py-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
          Analytics
        </p>
        <div className="mt-1.5 flex items-baseline justify-between">
          <h1 className="text-[22px] font-semibold leading-tight">{f.finalTitle}</h1>
          <p className="text-xs text-ink-secondary">
            {platformLabel(f.platform)} · {f.pillarName ?? "No pillar"} ·{" "}
            {f.checkpoint} reading
          </p>
        </div>
        <p className="mt-1 text-xs text-ink-muted">
          Published {new Date(f.publishedAt).toLocaleDateString()} · target{" "}
          {new Date(f.targetAt).toLocaleDateString()}
          {f.capturedAt && ` · captured ${new Date(f.capturedAt).toLocaleDateString()}`}
        </p>
      </div>

      <div className="flex">
        {/* Evidence: metric comparison */}
        <div className="flex-1 px-8 py-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
            Metrics · {f.checkpoint}
          </p>
          <div className="mt-3 overflow-hidden rounded-[10px] border border-border bg-workspace">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.08em] text-ink-muted">
                  <th className="px-5 py-2.5 font-medium">Metric</th>
                  <th className="px-5 py-2.5 text-right font-medium">Current</th>
                  <th className="px-5 py-2.5 text-right font-medium">Account median</th>
                  <th className="px-5 py-2.5 text-right font-medium">Pillar median</th>
                </tr>
              </thead>
              <tbody>
                {raws.map((m) => (
                  <tr key={m.key} className="border-t border-border/60">
                    <td className="px-5 py-3 text-sm text-ink-secondary">{m.label}</td>
                    <td
                      className="px-5 py-3 text-right text-lg font-semibold tabular-nums text-ink-primary"
                    >
                      {fmt(m)}
                    </td>
                    <td className="px-5 py-3 text-right text-[13px] tabular-nums text-ink-secondary">
                      {(() => {
                        const b = medianOf(detail.accountBaseline, m.key);
                        if (!b || b.median === null) return "N/A";
                        return b.median.toLocaleString();
                      })()}
                    </td>
                    <td className="px-5 py-3 text-right text-[13px] tabular-nums text-ink-secondary">
                      {(() => {
                        const b = medianOf(detail.pillarBaseline, m.key);
                        if (!b || b.median === null) return "N/A";
                        return b.median.toLocaleString();
                      })()}
                    </td>
                  </tr>
                ))}
                {deriveds.length > 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="bg-surface-subtle px-5 py-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted"
                    >
                      Derived
                    </td>
                  </tr>
                )}
                {deriveds.map((m) => (
                  <tr key={m.key} className="border-t border-border/60">
                    <td className="px-5 py-3 text-sm text-ink-secondary">
                      {m.label}
                      {m.formulaPreview && (
                        <span className="ml-2 text-[11px] text-ink-muted">
                          {m.formulaPreview}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right text-lg font-semibold tabular-nums text-ink-primary">
                      {fmt(m)}
                    </td>
                    <td className="px-5 py-3 text-right text-[13px] tabular-nums text-ink-secondary">
                      {(() => {
                        const b = medianOf(detail.accountBaseline, m.key);
                        return b?.median != null ? `${b.median.toFixed(1)}%` : "N/A";
                      })()}
                    </td>
                    <td className="px-5 py-3 text-right text-[13px] tabular-nums text-ink-secondary">
                      {(() => {
                        const b = medianOf(detail.pillarBaseline, m.key);
                        return b?.median != null ? `${b.median.toFixed(1)}%` : "N/A";
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-ink-secondary">{BASELINE_COHORT_HELPER}</p>
        </div>

        {/* Interpretation: secondary by design */}
        <div className="w-[320px] shrink-0 border-l border-border bg-canvas px-5 py-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
            Loop Analysis
          </p>
          {detail.diagnosis ? (
            <div className="mt-3 space-y-3">
              <p className="text-sm leading-relaxed text-ink-primary">
                {detail.diagnosis.whatHappened}
              </p>
              {detail.diagnosis.evidence.length > 0 && (
                <div className="rounded-[8px] border border-border bg-workspace p-3 text-xs text-ink-secondary">
                  {detail.diagnosis.evidence.map((e, i) => (
                    <p key={i} className="tabular-nums">{e.comparisonText}</p>
                  ))}
                </div>
              )}
              {detail.diagnosis.possibleReasons.map((r, i) => (
                <p key={i} className="text-[13px] text-ink-secondary">· {r}</p>
              ))}
              <Badge variant="outline">{detail.diagnosis.confidence}</Badge>
            </div>
          ) : (
            <div className="mt-3">
              <p className="text-xs leading-relaxed text-ink-secondary">
                Structured diagnosis: What happened → Evidence → Possible
                reasons → Confidence → Next actions. AI proposes; you confirm.
              </p>
              <Button variant="secondary" size="sm" className="mt-3 w-full" disabled>
                <Sparkles className="mr-1 h-3 w-3" />
                Generate Diagnosis
              </Button>
            </div>
          )}
        </div>
      </div>
    </ProtoShell>
  );
}
