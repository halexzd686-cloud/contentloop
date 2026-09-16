"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { DemoBadge } from "@/components/ui/demo-badge";
import { Button } from "@/components/ui/button";
import { ThinkingOrbs } from "@/components/motion/thinking-orbs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SourcesPanel } from "@/components/studio/sources-panel";
import { MasterEditor } from "@/components/studio/master-editor";
import {
  usePlatformsPanel,
  type VersionRow,
} from "@/components/studio/platforms-panel";
import {
  ReviewPanel,
  type ReviewRow,
} from "@/components/studio/review-panel";
import type { PublicationSummary } from "@/lib/publication";
import type { PublicationResult } from "@/components/studio/publication-modal";
import type { SnapshotSummary } from "@/components/studio/snapshot-modal";
import {
  applyVersionsSnapshot,
  isLatestWorkflowRevision,
  type WorkflowSnapshot,
} from "@/lib/workflow-snapshot";
import {
  BriefFields,
  type BriefFieldValues,
} from "@/components/studio/brief-fields";
import { LearningsPanel } from "@/components/studio/learnings-panel";
import {
  normalizeModuleOrder,
  type MasterModule,
} from "@/lib/validation/master";
import { createSaveQueue, type SaveQueueState } from "@/lib/save-queue";
import { briefStatusLabel, contentStatusLabel, platformLabel } from "@/lib/labels";
import { ShinyText } from "@/components/reactbits/shiny-text";
import { studioAIVisual, shinyTextActive } from "@/lib/ai-visual";
import { ArrowLeft, Sparkles, RefreshCw, Check, Lock } from "lucide-react";

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

interface MasterData {
  id: string;
  modules: MasterModule[];
}

interface ContentData {
  id: string;
  title: string;
  status: string;
  ownerId: string | null;
  reviewerId: string | null;
  primaryPlatform: string | null;
  isDemo: boolean;
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

const TABS = ["Brief", "Master", "Platforms", "Review"] as const;

const TAB_LABELS: Record<(typeof TABS)[number], string> = {
  Brief: "内容简报",
  Master: "内容母稿",
  Platforms: "平台版本",
  Review: "审核",
};

type SaveState = "idle" | "editing" | "saving" | "saved" | "failed";

const SAVE_LABEL: Record<SaveState, string> = {
  idle: "",
  editing: "编辑中…",
  saving: "保存中…",
  saved: "已保存",
  failed: "保存失败",
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

  // ─── Master state (M1.4) ──────────────────────────────
  const [activeTab, setActiveTab] = useState<"Brief" | "Master" | "Platforms" | "Review">("Brief");
  const [master, setMaster] = useState<MasterData | null>(null);
  const [modules, setModules] = useState<MasterModule[]>([]);
  const [masterSaveState, setMasterSaveState] = useState<SaveQueueState>("idle");
  const [creatingMaster, setCreatingMaster] = useState(false);
  const [masterError, setMasterError] = useState<string | null>(null);
  const masterQueueRef = useRef<ReturnType<typeof createSaveQueue<MasterModule[]>> | null>(null);
  const masterDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modulesRef = useRef<MasterModule[]>([]);

  // ─── Platform Versions state (M1.5) ───────────────────
  const [platformVersions, setPlatformVersions] = useState<VersionRow[]>([]);
  const [enabledPlatforms, setEnabledPlatforms] = useState<string[]>([]);
  const [playbookPlatforms, setPlaybookPlatforms] = useState<string[]>([]);

  // ─── Review state (M1.6) ──────────────────────────────
  const [contentReviews, setContentReviews] = useState<ReviewRow[]>([]);

  // ─── Publications (M2.1) ──────────────────────────────
  const [publications, setPublications] = useState<PublicationSummary[]>([]);
  const hasPublications = publications.length > 0;

  // ─── Metric Snapshots (M2.3) ──────────────────────────
  const [metricSnapshots, setMetricSnapshots] = useState<SnapshotSummary[]>([]);
  const handleSnapshot = useCallback((snap: SnapshotSummary) => {
    setMetricSnapshots((prev) => {
      const i = prev.findIndex(
        (p) => p.publicationId === snap.publicationId && p.checkpoint === snap.checkpoint
      );
      if (i === -1) return [...prev, snap];
      const next = [...prev];
      next[i] = snap;
      return next;
    });
  }, []);

  // ─── Workflow snapshot (M1.6 state-sync architecture) ──
  const workflowRevRef = useRef(0);
  const beginWorkflowAction = useCallback(() => ++workflowRevRef.current, []);
  const applyWorkflowSnapshot = useCallback((snap: WorkflowSnapshot, rev: number) => {
    if (!isLatestWorkflowRevision(rev, workflowRevRef.current)) return;
    workflowRevRef.current = rev;
    setContent((prev) => (prev ? { ...prev, status: snap.content.status } : prev));
    if (snap.brief) {
      const b = snap.brief;
      setBrief((prev) =>
        prev
          ? {
              ...prev,
              status: b.status as BriefData["status"],
              approvedAt: b.approvedAt,
              approvedBy: b.approvedBy,
            }
          : prev
      );
    }
    setPlatformVersions((prev) => applyVersionsSnapshot(prev, snap.versions));
    setContentReviews(snap.reviews.map((r) => ({ ...r })));
  }, []);

  const handleVersionChange = useCallback((v: VersionRow) => {
    setPlatformVersions((prev) => {
      const i = prev.findIndex((p) => p.id === v.id);
      if (i === -1) return [...prev, v];
      const next = [...prev];
      next[i] = v;
      return next;
    });
  }, []);

  /** Publication mutation result: snapshot + record upsert (no refetch). */
  const handlePublication = useCallback(
    (result: PublicationResult, rev: number) => {
      if (result.workflow) applyWorkflowSnapshot(result.workflow, rev);
      setPublications((prev) => {
        const i = prev.findIndex((p) => p.id === result.publication.id);
        if (i === -1) return [...prev, result.publication];
        const next = [...prev];
        next[i] = result.publication;
        return next;
      });
    },
    [applyWorkflowSnapshot]
  );

  // Platform → version data map (for finalTitle prefill).
  const versionDataMap = useMemo(() => {
    const map: Record<string, Record<string, unknown>> = {};
    for (const v of platformVersions) map[v.platform] = v.data;
    return map;
  }, [platformVersions]);

  useEffect(() => {
    modulesRef.current = modules;
  }, [modules]);

  useEffect(() => {
    params.then((p) => setContentId(p.contentId));
  }, [params]);

  const load = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/contents/${id}`);
      setLoadError(null);
      if (!res.ok) throw new Error("内容加载失败");
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
      if (data.master) {
        setMaster(data.master);
        setModules(normalizeModuleOrder(data.master.modules));
      } else {
        setMaster(null);
        setModules([]);
      }
      setMasterSaveState("idle");
      setMasterError(null);
      setPlatformVersions(data.platformVersions ?? []);
      setEnabledPlatforms(data.enabledPlatforms ?? []);
      setPlaybookPlatforms(data.playbookPlatforms ?? []);
      setContentReviews(data.contentReviews ?? []);
      setPublications(data.publications ?? []);
      setMetricSnapshots(data.metricSnapshots ?? []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "加载失败");
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

  // Memoized so unrelated page renders never reset ReviewPanel editors.
  const reviewVersions = useMemo(
    () =>
      platformVersions.map((v) => ({
        id: v.id,
        platform: v.platform,
        status: v.status,
      })),
    [platformVersions]
  );

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
        if (!res.ok) throw new Error(data.error || "保存失败");
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
      if (!res.ok) throw new Error(data.error || "草稿生成失败");
      preProposalFields.current = fields;
      setProposal(data.draft);
    } catch (err) {
      setGenerateError(
        err instanceof Error ? err.message : "草稿生成失败"
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
      if (!res.ok) throw new Error(data.error || "确认失败");
      setBrief(data.brief);
      applyWorkflowSnapshot(data.workflow, beginWorkflowAction());
      dirtyRef.current = false;
      setSaveState("idle");
    } catch (err) {
      setApproveError(err instanceof Error ? err.message : "确认失败");
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
      if (!res.ok) throw new Error(data.error || "重新打开简报失败");
      setBrief(data.brief);
      if (data.workflow) {
        applyWorkflowSnapshot(data.workflow, beginWorkflowAction());
      }
      setEditConfirmOpen(false);
    } catch (err) {
      setApproveError(
        err instanceof Error ? err.message : "重新打开简报失败"
      );
      setEditConfirmOpen(false);
    }
  }

  // ─── Master handlers (M1.4) ──────────────────────────

  function getMasterQueue() {
    if (!masterQueueRef.current && contentId) {
      masterQueueRef.current = createSaveQueue<MasterModule[]>(
        async (snapshot) => {
          const res = await fetch(`/api/contents/${contentId}/master`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ modules: snapshot }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "保存失败");
        },
        setMasterSaveState
      );
    }
    return masterQueueRef.current;
  }

  /** Text edits: debounced ~1.5s, then enqueue latest full state. */
  function handleModuleTextChange(id: string, contentValue: string) {
    const next = modulesRef.current.map((m) =>
      m.id === id ? { ...m, content: contentValue } : m
    );
    setModules(next);
    if (masterDebounce.current) clearTimeout(masterDebounce.current);
    masterDebounce.current = setTimeout(() => {
      getMasterQueue()?.enqueue(next);
    }, 1500);
  }

  /** Structural mutations (add/delete/reorder): enqueue immediately. */
  function handleStructuralChange(next: MasterModule[]) {
    setModules(next);
    if (masterDebounce.current) clearTimeout(masterDebounce.current);
    getMasterQueue()?.enqueue(next);
  }

  async function handleCreateMaster() {
    if (!contentId) return;
    setCreatingMaster(true);
    setMasterError(null);
    try {
      const res = await fetch(`/api/contents/${contentId}/master`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "创建母稿失败");
      setMaster(data.master);
      setModules(data.master.modules);
      setMasterSaveState("idle");
    } catch (err) {
      setMasterError(
        err instanceof Error ? err.message : "创建母稿失败"
      );
    } finally {
      setCreatingMaster(false);
    }
  }

  // ─── Platform Versions panel (M1.5) ──────────────────
  const platformsPanel = usePlatformsPanel({
    contentId: contentId ?? "",
    approved,
    hasMaster: master !== null,
    primaryPlatform: content?.primaryPlatform ?? null,
    versions: platformVersions,
    onVersionChange: handleVersionChange,
    enabledPlatforms,
    playbookPlatforms,
  });

  // ─── Workflow snapshot application (M1.6) ────────────
  // Single authoritative path: every workflow mutation returns a
  // WorkflowSnapshot; only the latest action's response is applied.
  // No second full-detail GET after a mutation.

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-ink-muted">正在加载内容…</p>
      </div>
    );
  }

  if (loadError || !content) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-sm text-danger">{loadError || "内容不存在"}</p>
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
          重试
        </Button>
      </div>
    );
  }

  const approverName = content.reviewer?.name ?? content.owner?.name ?? null;

  // M4.4/M5.6: Studio AI visual lifecycle — ShinyText only,
  // active during genuine generation; proposals render statically.
  const aiVisual = studioAIVisual({ generating, proposalPending });

  return (
    <div className="flex h-full flex-col">
      {/* Header — M5.6: title is primary object identity (up to 2 lines);
          owner/reviewer/save state demoted to a secondary metadata row. */}
      <div className="border-b border-border bg-workspace px-8 pb-0 pt-4">
        <div className="flex items-start gap-3">
          <Link
            href="/app/studio"
            className="mt-1.5 text-ink-muted hover:text-ink-primary"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-lg font-semibold leading-snug text-ink-primary [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden">
                {content.title}
              </h1>
              <span
                className={`shrink-0 pt-1 text-xs ${
                  saveState === "failed"
                    ? "text-danger"
                    : saveState === "saved"
                      ? "text-mint-600"
                      : "text-ink-muted"
                }`}
              >
                {SAVE_LABEL[saveState]}
                {saveState === "failed" && (
                  <button
                    className="ml-1 underline"
                    onClick={() => persistBrief(fields)}
                  >
                    重试
                  </button>
                )}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-secondary">
              <Badge variant={content.status === "in_progress" ? "warning" : "default"}>
                {contentStatusLabel(content.status)}
              </Badge>
              <DemoBadge isDemo={content.isDemo} />
              {content.primaryPlatform && (
                <span>{platformLabel(content.primaryPlatform)}</span>
              )}
              {content.owner && <span>负责人：{content.owner.name}</span>}
              {approverName && <span>审核人：{approverName}</span>}
            </div>
          </div>
        </div>

        {/* Tabs — all four active (M1.6) */}
        <div className="mt-3 flex gap-1">
          {TABS.map((tab) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  active
                    ? "bg-mint-100 font-medium text-ink-primary"
                    : "text-ink-muted hover:text-ink-primary"
                }`}
              >
                {TAB_LABELS[tab]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Three columns — M5.6: 20 / 56 / 24 */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sources 20% */}
        <div className="w-[20%] overflow-y-auto border-r border-border bg-canvas">
          <SourcesPanel signal={signal} />
        </div>

        {/* Workspace 56% */}
        <div className="w-[56%] overflow-y-auto bg-workspace p-8">
          {activeTab === "Brief" ? (
          <>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-ink-primary">内容简报</h2>
              {brief && (
                <Badge variant={approved ? "mint" : "default"}>
                  {briefStatusLabel(brief.status)}
                </Badge>
              )}
            </div>
            {approved ? (
              hasPublications ? (
                <span
                  className="text-xs text-ink-faint"
                  title="这条内容已有发布的平台版本。简报和母稿不能再编辑。"
                >
                  已发布——简报已锁定
                </span>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditConfirmOpen(true)}
                >
                  编辑简报
                </Button>
              )
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
                {approving ? "确认中…" : "确认内容简报"}
              </Button>
            )}
          </div>

          <p className="-mt-2 mb-4 text-xs text-ink-secondary">
            这条内容为什么存在：写给谁、解决什么问题、用什么角度。
          </p>

          {approved && brief?.approvedAt && (
            <p className="mb-4 text-xs text-ink-muted">
              已于 {new Date(brief.approvedAt).toLocaleString()}
              {approverName ? ` 由 ${approverName}` : ""} 确认。只读状态——需要修改请点“编辑简报”。
            </p>
          )}

          {/* M4.2: persistent next action — approve never auto-creates the
              Master; the CTA only switches to the Master tab, where the
              explicit Create gate remains the authority. */}
          {approved && !master && (
            <div className="mb-4 flex items-center justify-between rounded-[8px] border border-mint-600/30 bg-mint-100/40 px-3 py-2.5">
              <p className="text-xs text-ink-secondary">
                简报已确认——下一步：创建内容母稿。
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setActiveTab("Master")}
              >
                继续写母稿
              </Button>
            </div>
          )}

          {approveError && (
            <div className="mb-4 rounded-[8px] border border-danger/20 bg-danger/5 p-3 text-xs text-danger">
              {approveError}
            </div>
          )}

          {proposalPending && (
            <div className="mb-4 rounded-[8px] border border-mint-600/30 bg-mint-100 p-3">
              {/* M5.6: proposal arrival is static text — BlurText was
                  removed from the V1 React Bits set. */}
              <p className="text-xs font-medium text-ink-primary">
                这是 AI 草稿——自动保存已暂停。请在下方审核，然后应用或放弃。
              </p>
              <div className="mt-2 flex gap-2">
                <Button variant="primary" size="sm" onClick={handleApplyDraft}>
                  应用草稿
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDiscardDraft}>
                  放弃
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
              还没有保存简报。编辑任意字段即可创建草稿，或在 Loop AI 面板生成 AI 草稿。
            </p>
          )}

          {/* Learnings — M3.4 guidance/provenance only */}
          <LearningsPanel contentId={content.id} />
          </>
          ) : activeTab === "Master" ? (
            <MasterWorkspace
              approved={approved}
              contentStatus={content.status}
              hasPublications={hasPublications}
              master={master}
              modules={modules}
              saveState={masterSaveState}
              creating={creatingMaster}
              error={masterError}
              onCreate={handleCreateMaster}
              onTextChange={handleModuleTextChange}
              onStructuralChange={handleStructuralChange}
              onRetrySave={() => getMasterQueue()?.retry()}
              onReturnToEditing={async () => {
                if (!contentId) return;
                const rev = beginWorkflowAction();
                const res = await fetch(`/api/contents/${contentId}/return-to-editing`, {
                  method: "POST",
                });
                const data = await res.json();
                if (!res.ok) {
                  setMasterError(data.error || "返回编辑失败");
                  return;
                }
                applyWorkflowSnapshot(data.workflow, rev);
              }}
            />
          ) : activeTab === "Platforms" ? (
            platformsPanel.workspace
          ) : (
            <ReviewPanel
              contentId={content.id}
              contentStatus={content.status}
              briefApproved={approved}
              hasMaster={master !== null}
              versions={reviewVersions}
              reviews={contentReviews}
              approverName={approverName}
              beginAction={beginWorkflowAction}
              onWorkflow={applyWorkflowSnapshot}
              publications={publications}
              versionData={versionDataMap}
              contentTitle={content.title}
              onPublication={handlePublication}
              metricSnapshots={metricSnapshots}
              onSnapshot={handleSnapshot}
            />
          )}
        </div>

        {/* Loop AI 24% — supportive mint-inset, quieter than the editor */}
        <div className="w-[24%] overflow-y-auto border-l border-border bg-canvas p-5">
          <div className="rounded-[10px] border border-mint-600/25 bg-mint-100/40 p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
              Loop AI
            </p>
            {/* M4.4: ShinyText identity — shimmer active ONLY during a
                genuine AI request; static at all other times. */}
            <p className="mt-1.5 text-xs text-ink-secondary">
              <ShinyText
                text="AI 提供建议，最终由你确认。"
                disabled={!shinyTextActive(aiVisual)}
                speed={1.6}
                color="#5F625D"
                shineColor="#4E9F84"
              />
            </p>
          </div>
          {activeTab === "Platforms" ? (
            <div className="mt-4">{platformsPanel.aiPanel}</div>
          ) : activeTab === "Review" ? (
            <div className="mt-4">
              <p className="text-xs text-ink-secondary">
                审核只能由人完成。AI 不会替你勾选清单或批准内容。
              </p>
            </div>
          ) : activeTab === "Master" ? (
            <div className="mt-3">
              <p className="text-xs text-ink-faint">
                母稿的 AI 操作暂未开放。
              </p>
            </div>
          ) : (
          <div className="mt-3 space-y-3">
            {/* M7: click → button hides, only Thinking Orbs remains */}
            {!generating && (
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={handleGenerate}
                disabled={approved || proposalPending}
              >
                <Sparkles className="mr-1 h-3 w-3" />
                AI 生成简报草稿
              </Button>
            )}
            {/* M7: AI reasoning = Thinking Orbs (approved V2) */}
            {generating && (
              <div className="flex flex-col items-center gap-2 py-2">
                <ThinkingOrbs size={48} />
                <p className="text-xs text-ink-secondary">正在生成简报草稿…</p>
              </div>
            )}
            {generateError && (
              <div className="rounded-[8px] border border-danger/20 bg-danger/5 p-3">
                <p className="text-xs text-danger">{generateError}</p>
                <button
                  onClick={handleGenerate}
                  className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-mint-600 hover:underline"
                >
                  <RefreshCw className="h-3 w-3" />
                  重试
                </button>
              </div>
            )}
            <p className="text-xs text-ink-faint">
              {signal
                ? "AI 会根据关联线索、品牌信息和平台规范起草。不应用就不会保存任何内容。"
                : "AI 会根据这条内容、品牌信息和平台规范起草。不应用就不会保存任何内容。"}
            </p>
          </div>
          )}
        </div>
      </div>

      {/* Edit Brief confirm */}
      <Dialog open={editConfirmOpen} onOpenChange={setEditConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑已确认的简报？</DialogTitle>
            <DialogDescription>
              编辑简报后需要重新确认。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditConfirmOpen(false)}>
              取消
            </Button>
            <Button variant="primary" onClick={handleEditBrief}>
              编辑简报
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


// ─── Master Workspace (tab content) ────────────────────

interface MasterWorkspaceProps {
  approved: boolean;
  contentStatus: string;
  hasPublications: boolean;
  master: MasterData | null;
  modules: MasterModule[];
  saveState: SaveQueueState;
  creating: boolean;
  error: string | null;
  onCreate: () => void;
  onTextChange: (id: string, content: string) => void;
  onStructuralChange: (modules: MasterModule[]) => void;
  onRetrySave: () => void;
  onReturnToEditing: () => void;
}

function MasterWorkspace({
  approved,
  contentStatus,
  hasPublications,
  master,
  modules,
  saveState,
  creating,
  error,
  onCreate,
  onTextChange,
  onStructuralChange,
  onRetrySave,
  onReturnToEditing,
}: MasterWorkspaceProps) {
  const inReview = contentStatus === "review" || contentStatus === "scheduled";

  // Gate 1: no approved Brief and no Master yet → locked
  if (!approved && !master) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Lock className="h-5 w-5 text-ink-faint" />
        <p className="mt-3 text-sm text-ink-secondary">
          请先确认内容简报，再创建内容母稿。
        </p>
      </div>
    );
  }

  // Gate 2: Content in review / scheduled → Master read-only until the
  // human explicitly Returns to Editing (Global Upstream Invalidation).
  // Once a real Publication exists, global editing is permanently locked.
  if (inReview && master) {
    return (
      <div>
        <div className="mb-4 rounded-[8px] border border-warning/30 bg-warning/5 p-3">
          <p className="text-xs text-ink-secondary">
            {hasPublications
              ? "这条内容已有发布的平台版本。简报和母稿不能再编辑。"
              : `内容当前${contentStatus === "scheduled" ? "已通过待发布" : "在审核中"}。母稿为只读。返回编辑将使当前审核失效，并把内容退回制作中。`}
          </p>
          {!hasPublications && (
            <Button
              variant="secondary"
              size="sm"
              className="mt-2"
              onClick={onReturnToEditing}
            >
              返回编辑
            </Button>
          )}
          {error && <p className="mt-2 text-xs text-danger">{error}</p>}
        </div>
        <MasterEditor
          modules={modules}
          readOnly
          saveState="idle"
          onTextChange={() => {}}
          onStructuralChange={() => {}}
          onRetrySave={() => {}}
        />
      </div>
    );
  }

  // Gate 2: Brief re-opened for edits → existing Master read-only (data kept)
  if (!approved && master) {
    return (
      <div>
        <div className="mb-4 rounded-[8px] border border-warning/30 bg-warning/5 p-3">
          <p className="text-xs text-ink-secondary">
            简报已变更。重新确认后才能继续编辑内容母稿。
          </p>
        </div>
        <MasterEditor
          modules={modules}
          readOnly
          saveState="idle"
          onTextChange={() => {}}
          onStructuralChange={() => {}}
          onRetrySave={() => {}}
        />
      </div>
    );
  }

  // Gate 3: approved but no Master → explicit human creation
  if (!master) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-ink-secondary">
          还没有内容母稿。创建一个，开始结构化生产。
        </p>
        <p className="mt-1 text-xs text-ink-secondary">
          用于生成各平台版本的母稿。
        </p>
        <Button
          variant="primary"
          size="sm"
          className="mt-4"
          onClick={onCreate}
          disabled={creating}
        >
          {creating ? "创建中…" : "创建内容母稿"}
        </Button>
        {error && <p className="mt-3 text-xs text-danger">{error}</p>}
      </div>
    );
  }

  // Editable
  return (
    <div>
      <p className="mb-4 text-xs text-ink-secondary">
        用于生成各平台版本的母稿。
      </p>
      <MasterEditor
        modules={modules}
        readOnly={false}
        saveState={saveState}
        onTextChange={onTextChange}
        onStructuralChange={onStructuralChange}
        onRetrySave={onRetrySave}
      />
    </div>
  );
}
