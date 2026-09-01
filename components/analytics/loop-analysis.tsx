"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, X } from "lucide-react";
import type { ResolvedEvidence } from "@/lib/validation/diagnosis";

/**
 * Loop Analysis — M2.6 Structured Diagnosis panel.
 *
 * AI Suggest → Human Confirm. Generate never writes the DB; only Save
 * (create) / Confirm Replace (PUT) persists. Evidence numbers are
 * server-owned and read-only; humans edit text fields only. Stale
 * saved diagnoses stay visible with an explicit banner.
 */

const CONFIDENCE_LABEL: Record<string, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
  insufficient_evidence: "Insufficient evidence",
};

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
}

export function LoopAnalysis({
  publicationId,
  checkpoint,
  hasSnapshot,
  diagnosis,
  diagnosisStale,
  onSaved,
}: LoopAnalysisProps) {
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);

  // Editable proposal fields (human-in-the-loop: edit before save)
  const [editWhat, setEditWhat] = useState("");
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
      if (!res.ok) throw new Error(data.error || "Generation failed");
      const p: Proposal = {
        ...data.proposal,
        resolvedEvidence: data.resolvedEvidence,
        proposalContextFingerprint: data.proposalContextFingerprint,
      };
      setProposal(p);
      setEditWhat(p.whatHappened);
      setEditReasons(p.possibleReasons);
      setEditActions(p.nextActions);
      setEditConfidence(p.confidence);
      setKeepRefs(p.resolvedEvidence.map(() => true));
      setConfirmReplace(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
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
        whatHappened: editWhat,
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
      if (!res.ok) throw new Error(data.error || "Save failed");
      setProposal(null);
      setConfirmReplace(false);
      onSaved(data.diagnosis, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
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
                <span className="ml-1 text-ink-faint">vs {e.baselineScope}</span>
                <p className="mt-0.5 text-ink-secondary">{e.comparisonText}</p>
              </div>
              {removable && (
                <button
                  className="text-ink-faint hover:text-danger"
                  onClick={() =>
                    setKeepRefs((prev) => prev.map((v, j) => (j === i ? false : v)))
                  }
                  aria-label="Remove evidence"
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
        Loop Analysis
      </p>

      {!hasSnapshot && (
        <p className="text-xs text-ink-faint">
          No metric snapshot yet. Diagnosis becomes available after a checkpoint
          snapshot is saved.
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
            Retry
          </button>
        </div>
      )}

      {/* Saved diagnosis (stays visible while a proposal is pending) */}
      {diagnosis && !proposal && (
        <div className="space-y-3">
          {diagnosisStale && (
            <div className="rounded-[8px] border border-warning/30 bg-warning/5 p-3 text-xs text-ink-secondary">
              Snapshot or analysis context changed since this diagnosis.
              Regenerate to refresh.
            </div>
          )}
          <DiagnosisView diagnosis={diagnosis} renderEvidence={renderEvidenceRows} />
          <p className="text-[11px] text-ink-faint">
            Evidence captured at diagnosis time. Baseline values as of diagnosis
            time.
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={generate}
            disabled={generating}
          >
            <Sparkles className="mr-1 h-3 w-3" />
            {generating ? "Preparing diagnosis…" : "Regenerate"}
          </Button>
        </div>
      )}

      {/* No diagnosis yet */}
      {!diagnosis && !proposal && hasSnapshot && (
        <div className="space-y-3">
          <p className="text-xs text-ink-faint">
            Structured diagnosis: What happened → Evidence → Possible reasons →
            Confidence → Next actions. AI proposes; you confirm.
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={generate}
            disabled={generating}
          >
            <Sparkles className="mr-1 h-3 w-3" />
            {generating ? "Preparing diagnosis…" : "Generate Diagnosis"}
          </Button>
        </div>
      )}

      {/* Proposal (editable text, server-owned evidence) */}
      {proposal && (
        <div className="space-y-3">
          <div className="rounded-[8px] border border-mint-600/30 bg-mint-100/40 p-3">
            <p className="text-xs font-medium text-ink-primary">
              AI proposal — nothing is saved until you confirm.
            </p>
          </div>

          <section>
            <p className="text-xs font-semibold text-ink-secondary">What happened</p>
            <textarea
              className="mt-1 w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm text-ink-primary outline-none focus:border-mint-600"
              rows={3}
              maxLength={300}
              value={editWhat}
              onChange={(e) => setEditWhat(e.target.value)}
            />
          </section>

          <section>
            <p className="text-xs font-semibold text-ink-secondary">
              Evidence (server values — read-only)
            </p>
            <div className="mt-1">
              {renderEvidenceRows(
                proposal.resolvedEvidence.filter((_, i) => keepRefs[i]),
                true
              )}
              {proposal.resolvedEvidence.filter((_, i) => keepRefs[i]).length ===
                0 && (
                <p className="text-xs text-ink-faint">No evidence selected.</p>
              )}
            </div>
          </section>

          <section>
            <p className="text-xs font-semibold text-ink-secondary">
              Possible reasons (hypotheses, max 2)
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
              <p className="mt-1 text-xs text-ink-faint">None proposed.</p>
            )}
          </section>

          <section>
            <p className="text-xs font-semibold text-ink-secondary">Confidence</p>
            <select
              className="mt-1 w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600"
              value={editConfidence}
              onChange={(e) => setEditConfidence(e.target.value)}
            >
              {Object.entries(CONFIDENCE_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </section>

          <section>
            <p className="text-xs font-semibold text-ink-secondary">
              Next actions (max 3)
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
              <p className="mt-1 text-xs text-ink-faint">None proposed.</p>
            )}
          </section>

          {diagnosis && !confirmReplace && (
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => setConfirmReplace(true)}
            >
              Replace saved diagnosis…
            </Button>
          )}
          {diagnosis && confirmReplace && (
            <div className="rounded-[8px] border border-warning/30 bg-warning/5 p-3 text-xs text-ink-secondary">
              Replace the saved diagnosis with this proposal? The saved record will
              be overwritten.
              <div className="mt-2 flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={save}
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Confirm Replace"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmReplace(false)}
                >
                  Keep saved
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
                disabled={saving || editWhat.trim() === ""}
              >
                {saving ? "Saving…" : "Save Diagnosis"}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={discard}>
              Discard
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
        <p className="text-xs font-semibold text-ink-secondary">What happened</p>
        <p className="mt-1 text-sm text-ink-primary">{diagnosis.whatHappened}</p>
      </section>
      <section>
        <p className="text-xs font-semibold text-ink-secondary">Evidence</p>
        <div className="mt-1">{renderEvidence(diagnosis.evidence, false)}</div>
        {diagnosis.evidence.length === 0 && (
          <p className="text-xs text-ink-faint">No metric evidence recorded.</p>
        )}
      </section>
      <section>
        <p className="text-xs font-semibold text-ink-secondary">Possible reasons</p>
        {diagnosis.possibleReasons.length === 0 ? (
          <p className="mt-1 text-xs text-ink-faint">None — insufficient evidence.</p>
        ) : (
          <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-ink-primary">
            {diagnosis.possibleReasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <p className="text-xs font-semibold text-ink-secondary">Confidence</p>
        <Badge variant={diagnosis.confidence === "high" ? "mint" : "default"}>
          {CONFIDENCE_LABEL[diagnosis.confidence] ?? diagnosis.confidence}
        </Badge>
      </section>
      <section>
        <p className="text-xs font-semibold text-ink-secondary">Next actions</p>
        {diagnosis.nextActions.length === 0 ? (
          <p className="mt-1 text-xs text-ink-faint">None.</p>
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
