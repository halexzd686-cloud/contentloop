"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, X } from "lucide-react";
import type { ResolvedEvidence } from "@/lib/validation/diagnosis";
import { confidenceLabel } from "@/lib/labels";

/**
 * Loop Analysis — M2.6 Structured Diagnosis panel.
 *
 * AI Suggest → Human Confirm. Generate never writes the DB; only Save
 * (create) / Confirm Replace (PUT) persists. Evidence numbers are
 * server-owned and read-only; humans edit text fields only. Stale
 * saved diagnoses stay visible with an explicit banner.
 */

export interface DiagnosisRecord {
  id: string;
  whatHappened: string;
  evidence: ResolvedEvidence[];
  possibleReasons: string[];
  confidence: string;
  nextActions: string[];
  createdAt: string;
}

interface Proposal {
  whatHappened: string;
  evidenceRefs: { metricKey: string; baselineScope: "account" | "pillar" }[];
  possibleReasons: string[];
  confidence: string;
  nextActions: string[];
  resolvedEvidence: ResolvedEvidence[];
  proposalContextFingerprint: string;
}

interface LoopAnalysisProps {
  publicationId: string;
  checkpoint: string;
  hasSnapshot: boolean;
  diagnosis: DiagnosisRecord | null;
  diagnosisStale: boolean;
  onSaved: (d: DiagnosisRecord, stale: boolean) => void;
  /** M4.2: entry to the existing Create Test flow with safe prefill.
   *  Shown only for a saved, non-stale diagnosis — never for a proposal. */
  onCreateTest?: () => void;
}

export function LoopAnalysis({
  publicationId,
  checkpoint,
  hasSnapshot,
  diagnosis,
  diagnosisStale,
  onSaved,
  onCreateTest,
}: LoopAnalysisProps) {
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);

  // Editable proposal fields (human-in-the-loop: edit before save).
  // What Happened is canonical server-built — read-only by design.
  const [editReasons, setEditReasons] = useState<string[]>([]);
  const [editActions, setEditActions] = useState<string[]>([]);
  const [editConfidence, setEditConfidence] = useState("low");
  const [keepRefs, setKeepRefs] = useState<boolean[]>([]);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/publications/${publicationId}/metric-snapshots/${checkpoint}/diagnosis/proposal`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失败");
      const p: Proposal = {
        ...data.proposal,
        resolvedEvidence: data.resolvedEvidence,
        proposalContextFingerprint: data.proposalContextFingerprint,
      };
      setProposal(p);
      setEditReasons(p.possibleReasons);
      setEditActions(p.nextActions);
      setEditConfidence(p.confidence);
      setKeepRefs(p.resolvedEvidence.map(() => true));
      setConfirmReplace(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败");
    } finally {
      setGenerating(false);
    }
  }

  async function save() {
    if (!proposal) return;
    setSaving(true);
    setError(null);
    try {
      const refs = proposal.evidenceRefs.filter((_, i) => keepRefs[i]);
      const body = {
        evidenceRefs: refs,
        possibleReasons: editReasons.filter((r) => r.trim() !== ""),
        confidence: editConfidence,
        nextActions: editActions.filter((a) => a.trim() !== ""),
        proposalContextFingerprint: proposal.proposalContextFingerprint,
      };
      const res = await fetch(
        `/api/publications/${publicationId}/metric-snapshots/${checkpoint}/diagnosis`,
        {
          method: diagnosis ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失败");
      setProposal(null);
      setConfirmReplace(false);
      onSaved(data.diagnosis, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  function discard() {
    setProposal(null);
    setConfirmReplace(false);
  }

  function renderEvidenceRows(evidence: ResolvedEvidence[], removable: boolean) {
    if (evidence.length === 0) return null;
    return (
      <div className="space-y-1.5">
        {evidence.map((e, i) => {
          return (
            <div
              key={`${e.metricKey}-${e.baselineScope}`}
              className="flex items-start justify-between gap-2 rounded-[8px] border border-border bg-workspace px-2.5 py-1.5"
            >
              <div className="text-xs">
                <span className="font-medium text-ink-primary">{e.metricKey}</span>
                <span className="ml-1 text-ink-faint">
                  {e.baselineScope === "account" ? "对比账号" : "对比方向"}
                </span>
                <p className="mt-0.5 text-ink-secondary">{e.comparisonText}</p>
              </div>
              {removable && (
                <button
                  className="text-ink-faint hover:text-danger"
                  onClick={() =>
                    setKeepRefs((prev) => prev.map((v, j) => (j === i ? false : v)))
                  }
                  aria-label="移除证据"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Loop 分析
      </p>

      {!hasSnapshot && (
        <p className="text-xs text-ink-secondary">
          还没有指标数据。保存该数据点的数据后即可生成诊断。
        </p>
      )}

      {error && (
        <div className="rounded-[8px] border border-danger/20 bg-danger/5 p-3">
          <p className="text-xs text-danger">{error}</p>
          <button
            onClick={generate}
            className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-mint-600 hover:underline"
          >
            <RefreshCw className="h-3 w-3" />
            重试
          </button>
        </div>
      )}

      {/* Saved diagnosis (stays visible while a proposal is pending) */}
      {diagnosis && !proposal && (
        <div className="space-y-3">
          {diagnosisStale && (
            <div className="rounded-[8px] border border-warning/30 bg-warning/5 p-3 text-xs text-ink-secondary">
              保存诊断后，指标或分析上下文已变化。请重新分析以刷新。
            </div>
          )}
          <DiagnosisView diagnosis={diagnosis} renderEvidence={renderEvidenceRows} />
          <p className="text-[11px] text-ink-faint">
            证据采集于诊断时。基线值为诊断时的数值。
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={generate}
            disabled={generating}
          >
            <Sparkles className="mr-1 h-3 w-3" />
            {generating ? "AI 正在分析表现…" : "重新分析"}
          </Button>
          {onCreateTest && !diagnosisStale && (
            <Button
              variant="primary"
              size="sm"
              className="w-full"
              onClick={onCreateTest}
            >
              基于此诊断创建运营测试
            </Button>
          )}
        </div>
      )}

      {/* No diagnosis yet */}
      {!diagnosis && !proposal && hasSnapshot && (
        <div className="space-y-3">
          <p className="text-xs text-ink-secondary">
            结构化诊断：发生了什么 → 证据 → 可能原因 → 置信度 →
            下一步建议。AI 提供建议，由你确认。
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={generate}
            disabled={generating}
          >
            <Sparkles className="mr-1 h-3 w-3" />
            {generating ? "AI 正在分析表现…" : "AI 分析表现"}
          </Button>
        </div>
      )}

      {/* Proposal (editable text, server-owned evidence) */}
      {proposal && (
        <div className="space-y-3">
          <div className="rounded-[8px] border border-mint-600/30 bg-mint-100/40 p-3">
            <p className="text-xs font-medium text-ink-primary">
              这是 AI 提案——确认前不会保存任何内容。
            </p>
          </div>

          <section>
            <p className="text-xs font-semibold text-ink-secondary">
              发生了什么
            </p>
            <p className="mt-1 rounded-[8px] border border-border bg-canvas px-3 py-2 text-sm text-ink-primary">
              {proposal.whatHappened}
            </p>
            <p className="mt-1 text-[11px] text-ink-secondary">
              基于下方证据构建——始终与数字一致。
            </p>
          </section>

          <section>
            <p className="text-xs font-semibold text-ink-secondary">
              证据（实测数值——只读）
            </p>
            <div className="mt-1">
              {renderEvidenceRows(
                proposal.resolvedEvidence.filter((_, i) => keepRefs[i]),
                true
              )}
              {proposal.resolvedEvidence.filter((_, i) => keepRefs[i]).length ===
                0 && (
                <p className="text-xs text-ink-faint">未选择证据。</p>
              )}
            </div>
          </section>

          <section>
            <p className="text-xs font-semibold text-ink-secondary">
              可能原因（假设，最多 2 条）
            </p>
            {editReasons.map((r, i) => (
              <textarea
                key={i}
                className="mt-1 w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm text-ink-primary outline-none focus:border-mint-600"
                rows={2}
                maxLength={300}
                value={r}
                onChange={(e) =>
                  setEditReasons((prev) =>
                    prev.map((v, j) => (j === i ? e.target.value : v))
                  )
                }
              />
            ))}
            {editReasons.length === 0 && (
              <p className="mt-1 text-xs text-ink-secondary">
                {editConfidence === "insufficient_evidence"
                  ? "证据不足，无法推断可能原因。"
                  : "未提出。"}
              </p>
            )}
          </section>

          <section>
            <p className="text-xs font-semibold text-ink-secondary">置信度</p>
            <select
              className="mt-1 w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600"
              value={editConfidence}
              onChange={(e) => setEditConfidence(e.target.value)}
            >
              {["high", "medium", "low", "insufficient_evidence"].map((v) => (
                <option key={v} value={v}>
                  {confidenceLabel(v)}
                </option>
              ))}
            </select>
          </section>

          <section>
            <p className="text-xs font-semibold text-ink-secondary">
              下一步建议（最多 3 条）
            </p>
            {editActions.map((a, i) => (
              <textarea
                key={i}
                className="mt-1 w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm text-ink-primary outline-none focus:border-mint-600"
                rows={2}
                maxLength={300}
                value={a}
                onChange={(e) =>
                  setEditActions((prev) =>
                    prev.map((v, j) => (j === i ? e.target.value : v))
                  )
                }
              />
            ))}
            {editActions.length === 0 && (
              <p className="mt-1 text-xs text-ink-faint">未提出。</p>
            )}
          </section>

          {diagnosis && !confirmReplace && (
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => setConfirmReplace(true)}
            >
              替换已保存的诊断…
            </Button>
          )}
          {diagnosis && confirmReplace && (
            <div className="rounded-[8px] border border-warning/30 bg-warning/5 p-3 text-xs text-ink-secondary">
              用这次提案替换已保存的诊断？已保存的记录将被覆盖。
              <div className="mt-2 flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={save}
                  disabled={saving}
                >
                  {saving ? "保存中…" : "确认替换"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmReplace(false)}
                >
                  保留已有
                </Button>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {!diagnosis && (
              <Button
                variant="primary"
                size="sm"
                onClick={save}
                disabled={saving}
              >
                {saving ? "保存中…" : "保存诊断"}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={discard}>
              放弃
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DiagnosisView({
  diagnosis,
  renderEvidence,
}: {
  diagnosis: DiagnosisRecord;
  renderEvidence: (e: ResolvedEvidence[], removable: boolean) => React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <section>
        <p className="text-xs font-semibold text-ink-secondary">发生了什么</p>
        <p className="mt-1 text-sm text-ink-primary">{diagnosis.whatHappened}</p>
      </section>
      <section>
        <p className="text-xs font-semibold text-ink-secondary">证据</p>
        <div className="mt-1">{renderEvidence(diagnosis.evidence, false)}</div>
        {diagnosis.evidence.length === 0 && (
          // M5.3A D02: a saved diagnosis always sits on a real snapshot —
          // current metrics ARE recorded. An empty evidence list means no
          // comparable baseline evidence, not missing metrics.
          <p className="text-xs text-ink-secondary">
            当前指标已记录，但暂无可比的基线证据。
          </p>
        )}
      </section>
      <section>
        <p className="text-xs font-semibold text-ink-secondary">可能原因</p>
        {diagnosis.possibleReasons.length === 0 ? (
          <p className="mt-1 text-xs text-ink-secondary">
            {diagnosis.confidence === "insufficient_evidence"
              ? "证据不足，无法推断可能原因。"
              : "无。"}
          </p>
        ) : (
          <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-ink-primary">
            {diagnosis.possibleReasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        )}
        <p className="mt-1 text-[11px] text-ink-secondary">
          可能原因只是假设，不是已确认的结论。
        </p>
      </section>
      <section>
        <p className="text-xs font-semibold text-ink-secondary">置信度</p>
        <Badge variant={diagnosis.confidence === "high" ? "mint" : "default"}>
          {confidenceLabel(diagnosis.confidence)}
        </Badge>
      </section>
      <section>
        <p className="text-xs font-semibold text-ink-secondary">下一步建议</p>
        {diagnosis.nextActions.length === 0 ? (
          <p className="mt-1 text-xs text-ink-faint">无。</p>
        ) : (
          <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-ink-primary">
            {diagnosis.nextActions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
