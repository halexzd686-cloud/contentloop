"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SourcesPanel } from "@/components/studio/sources-panel";
import {
  BriefFields,
  type BriefFieldValues,
} from "@/components/studio/brief-fields";
import { ArrowLeft, Sparkles, RefreshCw, Check } from "lucide-react";

/**
 * Studio Workspace — /app/studio/[contentId]
 * design §34: Sources 22% | Workspace 53% | Loop AI 25%
 * M1.3 scope: Brief tab only. Master / Platforms / Review are disabled.
 *
 * Key rules:
 * - AI draft is a proposal: Apply / Discard before any persistence.
 * - Auto-save pauses while an AI proposal is pending.
 * - Approved brief is read-only; explicit Edit Brief returns it to draft.
 * - Incomplete draft can be saved, but cannot be approved.
 */

interface SignalContext {
  id: string;
  title: string;
  summary: string | null;
  sourceType: string | null;
  sourceUrl: string | null;
  selectedAngle: string | null;
  primaryPlatform: string | null;
  topicScore: number | null;
  analyzedAt: string | null;
}

interface BriefData extends BriefFieldValues {
  id: string;
  status: "draft" | "approved";
  approvedAt: string | null;
  approvedBy: string | null;
}

interface ContentData {
  id: string;
  title: string;
  status: string;
  ownerId: string | null;
  reviewerId: string | null;
  owner: { id: string; name: string } | null;
  reviewer: { id: string; name: string } | null;
}

const EMPTY_FIELDS: BriefFieldValues = {
  targetAudience: "",
  userProblem: "",
  coreQuestion: "",
  mainAngle: "",
  contentPromise: "",
  keyEvidence: "",
  differentiation: "",
  cta: "",
};

const STATUS_LABEL: Record<string, string> = {
  planning: "Planning",
  in_progress: "In Progress",
  review: "Review",
  scheduled: "Scheduled",
  published: "Published",
};

const TABS = ["Brief", "Master", "Platforms", "Review"] as const;

type SaveState = "idle" | "editing" | "saving" | "saved" | "failed";

const SAVE_LABEL: Record<SaveState, string> = {
  idle: "",
  editing: "Editing…",
  saving: "Saving…",
  saved: "Saved",
  failed: "Save failed",
};

export default function StudioContentPage({
  params,
}: {
  params: Promise<{ contentId: string }>;
}) {
  const [contentId, setContentId] = useState<string | null>(null);
  const [content, setContent] = useState<ContentData | null>(null);
  const [signal, setSignal] = useState<SignalContext | null>(null);
  const [brief, setBrief] = useState<BriefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [fields, setFields] = useState<BriefFieldValues>(EMPTY_FIELDS);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const dirtyRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // AI proposal state — while pending, auto-save is paused and form is read-only
  const [proposal, setProposal] = useState<BriefFieldValues | null>(null);
  const preProposalFields = useRef<BriefFieldValues | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [editConfirmOpen, setEditConfirmOpen] = useState(false);

  useEffect(() => {
    params.then((p) => setContentId(p.contentId));
  }, [params]);

  const load = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/contents/${id}`);
      setLoadError(null);
      if (!res.ok) throw new Error("Failed to load content");
      const data = await res.json();
      setContent(data.content);
      setSignal(data.signal);
      setBrief(data.brief);
      if (data.brief) {
        setFields({
          targetAudience: data.brief.targetAudience,
          userProblem: data.brief.userProblem,
          coreQuestion: data.brief.coreQuestion,
          mainAngle: data.brief.mainAngle,
          contentPromise: data.brief.contentPromise,
          keyEvidence: data.brief.keyEvidence,
          differentiation: data.brief.differentiation,
          cta: data.brief.cta,
        });
      }
      dirtyRef.current = false;
      setSaveState("idle");
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!contentId) return;
    const t = setTimeout(() => load(contentId), 0);
    return () => clearTimeout(t);
  }, [contentId, load]);

  const approved = brief?.status === "approved";
  const proposalPending = proposal !== null;
  const readOnly = approved || proposalPending;

  // ─── Auto Save (1.5s debounce) ────────────────────────
  const persistBrief = useCallback(
    async (values: BriefFieldValues) => {
      if (!contentId) return;
      setSaveState("saving");
      try {
        const res = await fetch(`/api/contents/${contentId}/brief`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Save failed");
        setBrief(data.brief);
        setSaveState("saved");
        dirtyRef.current = false;
      } catch {
        // Never clear local input on failure; user can retry.
        setSaveState("failed");
      }
    },
    [contentId]
  );

  function scheduleSave(values: BriefFieldValues) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persistBrief(values), 1500);
  }

  function handleFieldChange(key: keyof BriefFieldValues, value: string) {
    if (readOnly) return;
    const next = { ...fields, [key]: value };
    setFields(next);
    dirtyRef.current = true;
    setSaveState("editing");
    scheduleSave(next);
  }

  // ─── AI Draft (proposal only — no persistence) ───────
  async function handleGenerate() {
    if (!contentId) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch(`/api/contents/${contentId}/brief/draft`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Draft generation failed");
      preProposalFields.current = fields;
      setProposal(data.draft);
    } catch (err) {
      setGenerateError(
        err instanceof Error ? err.message : "Draft generation failed"
      );
    } finally {
      setGenerating(false);
    }
  }

  function handleApplyDraft() {
    if (!proposal) return;
    // Apply → enters normal persistable form state; auto-save resumes.
    setFields(proposal);
    setProposal(null);
    dirtyRef.current = true;
    setSaveState("editing");
    scheduleSave(proposal);
  }

  function handleDiscardDraft() {
    // Discard → restore previous fields; no DB change from the proposal.
    if (preProposalFields.current) setFields(preProposalFields.current);
    setProposal(null);
  }

  // ─── Approve / Edit ──────────────────────────────────
  const allFilled = Object.values(fields).every((v) => v.trim().length > 0);

  async function handleApprove() {
    if (!contentId) return;
    setApproving(true);
    setApproveError(null);
    try {
      const res = await fetch(`/api/contents/${contentId}/brief/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Approve failed");
      setBrief(data.brief);
      setContent(data.content ? { ...content!, ...data.content } : content);
      dirtyRef.current = false;
      setSaveState("idle");
    } catch (err) {
      setApproveError(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setApproving(false);
    }
  }

  async function handleEditBrief() {
    if (!contentId) return;
    try {
      const res = await fetch(`/api/contents/${contentId}/brief/edit`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reopen brief");
      setBrief(data.brief);
      setEditConfirmOpen(false);
    } catch (err) {
      setApproveError(
        err instanceof Error ? err.message : "Failed to reopen brief"
      );
      setEditConfirmOpen(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-ink-muted">Loading content…</p>
      </div>
    );
  }

  if (loadError || !content) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-sm text-danger">{loadError || "Content not found"}</p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            if (!contentId) return;
            setLoading(true);
            load(contentId);
          }}
        >
          <RefreshCw className="mr-1 h-3 w-3" />
          Retry
        </Button>
      </div>
    );
  }

  const approverName = content.reviewer?.name ?? content.owner?.name ?? null;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border bg-workspace px-6 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/app/studio"
            className="text-ink-muted hover:text-ink-primary"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-base font-semibold text-ink-primary">
            {content.title}
          </h1>
          <Badge variant={content.status === "in_progress" ? "warning" : "default"}>
            {STATUS_LABEL[content.status] || content.status}
          </Badge>
          <div className="ml-auto flex items-center gap-4 text-xs text-ink-muted">
            {content.owner && <span>Owner: {content.owner.name}</span>}
            {approverName && <span>Approver: {approverName}</span>}
            <span
              className={
                saveState === "failed"
                  ? "text-danger"
                  : saveState === "saved"
                    ? "text-mint-600"
                    : ""
              }
            >
              {SAVE_LABEL[saveState]}
              {saveState === "failed" && (
                <button
                  className="ml-1 underline"
                  onClick={() => persistBrief(fields)}
                >
                  Retry
                </button>
              )}
            </span>
          </div>
        </div>

        {/* Tabs — Brief active; others disabled in M1.3 */}
        <div className="mt-3 flex gap-1">
          {TABS.map((tab) => (
            <span
              key={tab}
              className={`rounded-md px-3 py-1.5 text-sm ${
                tab === "Brief"
                  ? "bg-mint-100 font-medium text-ink-primary"
                  : "cursor-not-allowed text-ink-faint"
              }`}
              title={tab === "Brief" ? undefined : "Coming later"}
            >
              {tab}
            </span>
          ))}
        </div>
      </div>

      {/* Three columns */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sources 22% */}
        <div className="w-[22%] overflow-y-auto border-r border-border bg-canvas">
          <SourcesPanel signal={signal} />
        </div>

        {/* Workspace 53% */}
        <div className="w-[53%] overflow-y-auto bg-workspace p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-ink-primary">Brief</h2>
              {brief && (
                <Badge variant={approved ? "mint" : "default"}>
                  {approved ? "APPROVED" : "DRAFT"}
                </Badge>
              )}
            </div>
            {approved ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEditConfirmOpen(true)}
              >
                Edit Brief
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleApprove}
                disabled={
                  approving || !brief || !allFilled || proposalPending || generating
                }
              >
                <Check className="mr-1 h-3 w-3" />
                {approving ? "Approving…" : "Approve Brief"}
              </Button>
            )}
          </div>

          {approved && brief?.approvedAt && (
            <p className="mb-4 text-xs text-ink-muted">
              Approved {new Date(brief.approvedAt).toLocaleString()}
              {approverName ? ` by ${approverName}` : ""}. Read-only — use Edit
              Brief to make changes.
            </p>
          )}

          {approveError && (
            <div className="mb-4 rounded-[8px] border border-danger/20 bg-danger/5 p-3 text-xs text-danger">
              {approveError}
            </div>
          )}

          {proposalPending && (
            <div className="mb-4 rounded-[8px] border border-mint-600/30 bg-mint-100 p-3">
              <p className="text-xs font-medium text-ink-primary">
                AI Draft proposal — auto-save is paused. Review below, then
                Apply or Discard.
              </p>
              <div className="mt-2 flex gap-2">
                <Button variant="primary" size="sm" onClick={handleApplyDraft}>
                  Apply Draft
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDiscardDraft}>
                  Discard
                </Button>
              </div>
            </div>
          )}

          <BriefFields
            values={proposalPending ? proposal : fields}
            onChange={handleFieldChange}
            readOnly={readOnly}
          />

          {!brief && !proposalPending && (
            <p className="mt-4 text-xs text-ink-faint">
              No brief saved yet. Edit any field to create a draft, or generate
              an AI draft from the Loop AI panel.
            </p>
          )}
        </div>

        {/* Loop AI 25% */}
        <div className="w-[25%] overflow-y-auto border-l border-border bg-canvas p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Loop AI
          </p>
          <div className="mt-3 space-y-3">
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={handleGenerate}
              disabled={generating || approved || proposalPending}
            >
              <Sparkles className="mr-1 h-3 w-3" />
              {generating ? "Generating draft…" : "Generate Draft Brief"}
            </Button>
            {generateError && (
              <div className="rounded-[8px] border border-danger/20 bg-danger/5 p-3">
                <p className="text-xs text-danger">{generateError}</p>
                <button
                  onClick={handleGenerate}
                  className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-mint-600 hover:underline"
                >
                  <RefreshCw className="h-3 w-3" />
                  Retry
                </button>
              </div>
            )}
            <p className="text-xs text-ink-faint">
              AI proposes a draft based on the linked signal, brand context and
              playbook. Nothing is saved until you Apply and edit.
            </p>
          </div>
        </div>
      </div>

      {/* Edit Brief confirm */}
      <Dialog open={editConfirmOpen} onOpenChange={setEditConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit approved brief?</DialogTitle>
            <DialogDescription>
              Editing this brief will require approval again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleEditBrief}>
              Edit Brief
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
