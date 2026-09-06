"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, Lock, Plus, X, FileText } from "lucide-react";
import {
  PLATFORMS,
  emptyPlatformData,
  isVersionEditable,
  normalizePlatformData,
  type Platform,
  type PlatformData,
} from "@/lib/validation/platform-version";
import { createSaveQueue, type SaveQueueState } from "@/lib/save-queue";
import { platformLabel, versionStatusLabel } from "@/lib/labels";

/**
 * Platforms tab — M1.5 Platform Versions.
 *
 * Used as a hook from the Studio page so the workspace column and the
 * Loop AI column can both be driven by one cohesive state:
 *
 *   const platforms = usePlatformsPanel({ ... });
 *   {platforms.workspace}  → center column
 *   {platforms.aiPanel}    → right Loop AI column
 *
 * Frozen rules:
 * - Master must exist and Brief must be approved; otherwise versions
 *   are readable but locked (no create / edit / adapt).
 * - Create is always an explicit human action: Create Empty Draft or
 *   Apply of an AI proposal. Auto-save (PUT) never creates rows.
 * - AI proposal ≠ DB state. Apply / Accept / Discard / Reject only.
 * - Re-adapt shows field-level OLD / NEW; whole-proposal granularity.
 */

export interface VersionRow {
  id: string;
  platform: Platform;
  status: string;
  data: Record<string, unknown>;
}

interface PlatformsPanelInput {
  contentId: string;
  approved: boolean;
  hasMaster: boolean;
  primaryPlatform: string | null;
  /** Single source of truth: page-level platform versions. */
  versions: VersionRow[];
  /** Report a created/updated version up to the page state. */
  onVersionChange: (v: VersionRow) => void;
  enabledPlatforms: string[];
  playbookPlatforms: string[];
}

type FieldKind = "input" | "textarea" | "list";

interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  rows?: number;
}

const PLATFORM_FIELDS: Record<Platform, FieldDef[]> = {
  xiaohongshu: [
    { key: "title", label: "Title", kind: "input" },
    { key: "coverCopy", label: "Cover Copy", kind: "input" },
    { key: "opening", label: "Opening", kind: "textarea", rows: 2 },
    { key: "body", label: "Body", kind: "textarea", rows: 8 },
    { key: "cta", label: "CTA", kind: "input" },
    { key: "tags", label: "Tags", kind: "list" },
  ],
  bilibili: [
    { key: "title", label: "Title", kind: "input" },
    { key: "coverCopy", label: "Cover Copy", kind: "input" },
    { key: "openingHook", label: "Opening Hook", kind: "textarea", rows: 2 },
    { key: "script", label: "Script", kind: "textarea", rows: 10 },
    { key: "chapters", label: "Chapters", kind: "list" },
    { key: "description", label: "Description", kind: "textarea", rows: 4 },
  ],
  douyin: [
    { key: "hook", label: "Hook", kind: "input" },
    { key: "script", label: "Script", kind: "textarea", rows: 10 },
    { key: "rhythmNotes", label: "Rhythm Notes", kind: "textarea", rows: 3 },
    { key: "cta", label: "CTA", kind: "input" },
  ],
};

const SAVE_LABEL: Record<SaveQueueState, string> = {
  idle: "",
  pending: "Editing…",
  saving: "Saving…",
  saved: "Saved",
  failed: "Save failed",
};

interface Proposal {
  data: PlatformData;
  isReAdapt: boolean;
}

export function usePlatformsPanel({
  contentId,
  approved,
  hasMaster,
  primaryPlatform,
  versions: versionRows,
  onVersionChange,
  enabledPlatforms,
  playbookPlatforms,
}: PlatformsPanelInput) {
  // V1 platforms ∩ brand-enabled, primary platform first (ordering only —
  // never restricts creation on other platforms).
  const platforms: Platform[] = (() => {
    const allowed = PLATFORMS.filter((p) => enabledPlatforms.includes(p));
    const list = allowed.length > 0 ? allowed : [...PLATFORMS];
    if (primaryPlatform && list.includes(primaryPlatform as Platform)) {
      return [
        primaryPlatform as Platform,
        ...list.filter((p) => p !== primaryPlatform),
      ];
    }
    return list;
  })();

  const versions = useMemo(() => {
    const map: Partial<Record<Platform, VersionRow>> = {};
    for (const v of versionRows) map[v.platform] = v;
    return map;
  }, [versionRows]);
  const [drafts, setDrafts] = useState<Partial<Record<Platform, PlatformData>>>(
    {}
  );
  const [selected, setSelected] = useState<Platform>(platforms[0]);
  const [saveStates, setSaveStates] = useState<
    Partial<Record<Platform, SaveQueueState>>
  >({});
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [adapting, setAdapting] = useState(false);
  const [adaptError, setAdaptError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const queuesRef = useRef<
    Partial<Record<Platform, ReturnType<typeof createSaveQueue<PlatformData>>>>
  >({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef<Set<Platform>>(new Set());
  const draftsRef = useRef(drafts);

  useEffect(() => {
    draftsRef.current = drafts;
  }, [drafts]);

  // Hydrate local editing drafts from page state (merge-only: never
  // overwrite a platform the user is already editing).
  useEffect(() => {
    const t = setTimeout(() => {
      setDrafts((prev) => {
        const next = { ...prev };
        for (const row of versionRows) {
          if (!next[row.platform]) {
            next[row.platform] = normalizePlatformData(row.platform, row.data);
          }
        }
        return next;
      });
    }, 0);
    return () => clearTimeout(t);
  }, [versionRows]);

  // Align selection with the ordered platform list once brand data loads.
  useEffect(() => {
    const allowed = PLATFORMS.filter((p) => enabledPlatforms.includes(p));
    const list = allowed.length > 0 ? allowed : [...PLATFORMS];
    const first =
      primaryPlatform && list.includes(primaryPlatform as Platform)
        ? (primaryPlatform as Platform)
        : list[0];
    const t = setTimeout(() => setSelected(first), 0);
    return () => clearTimeout(t);
  }, [enabledPlatforms, primaryPlatform]);

  const locked = !hasMaster || !approved;
  const version = versions[selected] ?? null;
  const draft = drafts[selected] ?? null;
  const saveState = saveStates[selected] ?? "idle";
  const proposalPending = proposal !== null;

  // Formal editability rule (M2.1): ONLY draft is editable.
  const editable = isVersionEditable(version?.status);

  // Live status map for save-queue guards (transition cleanup).
  const statusRef = useRef<Partial<Record<Platform, string>>>({});
  useEffect(() => {
    statusRef.current = Object.fromEntries(
      versionRows.map((v) => [v.platform, v.status])
    );
  }, [versionRows]);

  // Transition cleanup: when a version leaves draft (e.g. Send to Review or
  // Mark as Published), cancel pending debounce, drop dirty state and reset
  // any stale save error. In-flight saves self-neutralize via statusRef.
  useEffect(() => {
    const t = setTimeout(() => {
      let changed = false;
      const next: Partial<Record<Platform, SaveQueueState>> = {};
      for (const p of PLATFORMS) {
        const st = statusRef.current[p];
        if (st && st !== "draft") {
          dirtyRef.current.delete(p);
          if (saveStates[p] && saveStates[p] !== "idle") {
            next[p] = "idle";
            changed = true;
          }
        }
      }
      if (!editable && debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      if (changed) setSaveStates((prev) => ({ ...prev, ...next }));
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versionRows, editable]);

  function setPlatformSaveState(p: Platform, s: SaveQueueState) {
    setSaveStates((prev) => ({ ...prev, [p]: s }));
  }

  function getQueue(p: Platform) {
    if (!queuesRef.current[p]) {
      queuesRef.current[p] = createSaveQueue<PlatformData>(
        async (snapshot) => {
          // Transition guard: a save that became obsolete (version left
          // draft — review/approved/published) is dropped silently, never
          // sent. The server remains the final authority regardless.
          if (!isVersionEditable(statusRef.current[p])) return;
          const res = await fetch(
            `/api/contents/${contentId}/versions/${p}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ data: snapshot }),
            }
          );
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Save failed");
        },
        (s) => {
          // Obsolete ack after transition: never surface Saving/Failed/Retry.
          if (!isVersionEditable(statusRef.current[p])) {
            setPlatformSaveState(p, "idle");
            return;
          }
          setPlatformSaveState(p, s);
        }
      );
    }
    return queuesRef.current[p];
  }

  /** Persist latest draft for a platform (clears its dirty flag on enqueue). */
  function enqueue(p: Platform, data: PlatformData) {
    if (!isVersionEditable(statusRef.current[p])) return;
    getQueue(p)?.enqueue(data);
    dirtyRef.current.delete(p);
  }

  function commitDraft(
    p: Platform,
    data: PlatformData,
    opts: { structural: boolean }
  ) {
    setDrafts((prev) => ({ ...prev, [p]: data }));
    dirtyRef.current.add(p);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (opts.structural) {
      enqueue(p, data);
    } else {
      debounceRef.current = setTimeout(() => enqueue(p, data), 1500);
    }
  }

  function switchPlatform(p: Platform) {
    if (p === selected) return;
    // Flush pending debounced save for the platform we are leaving.
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (dirtyRef.current.has(selected)) {
      const pending = draftsRef.current[selected];
      if (pending && versions[selected]) enqueue(selected, pending);
    }
    setProposal(null);
    setAdaptError(null);
    setActionError(null);
    setSelected(p);
  }

  function fieldChange(key: string, value: string) {
    if (!draft || locked || proposalPending || !editable) return;
    commitDraft(selected, { ...draft, [key]: value }, { structural: false });
  }

  function listItemChange(key: string, index: number, value: string) {
    if (!draft || locked || proposalPending || !editable) return;
    const list = [...((draft as Record<string, unknown>)[key] as string[])];
    list[index] = value;
    commitDraft(selected, { ...draft, [key]: list }, { structural: false });
  }

  function listAdd(key: string) {
    if (!draft || locked || proposalPending || !editable) return;
    const list = [...((draft as Record<string, unknown>)[key] as string[])];
    list.push("");
    commitDraft(selected, { ...draft, [key]: list }, { structural: true });
  }

  function listRemove(key: string, index: number) {
    if (!draft || locked || proposalPending || !editable) return;
    const list = [...((draft as Record<string, unknown>)[key] as string[])];
    list.splice(index, 1);
    commitDraft(selected, { ...draft, [key]: list }, { structural: true });
  }

  // ─── Create Empty Draft (explicit human action, no AI) ──

  async function createEmpty() {
    if (locked) return;
    setCreating(true);
    setActionError(null);
    try {
      const res = await fetch(
        `/api/contents/${contentId}/versions/${selected}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: emptyPlatformData(selected) }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create draft");
      onVersionChange(data.version);
      setDrafts((prev) => ({
        ...prev,
        [selected]: normalizePlatformData(selected, data.version.data),
      }));
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to create draft"
      );
    } finally {
      setCreating(false);
    }
  }

  // ─── AI Adapt / Re-adapt (proposal only — no DB write) ──

  async function adapt() {
    if (locked || (version && !editable)) return;
    setAdapting(true);
    setAdaptError(null);
    try {
      const res = await fetch(
        `/api/contents/${contentId}/versions/${selected}/adapt`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Adaptation failed");
      setProposal({ data: data.proposal, isReAdapt: data.isReAdapt });
    } catch (err) {
      setAdaptError(
        err instanceof Error ? err.message : "Adaptation failed"
      );
    } finally {
      setAdapting(false);
    }
  }

  /** Initial adapt → POST create. Re-adapt → PUT update. */
  async function applyProposal() {
    if (!proposal) return;
    setActionError(null);
    try {
      const isReAdapt = proposal.isReAdapt;
      const res = await fetch(
        `/api/contents/${contentId}/versions/${selected}`,
        {
          method: isReAdapt ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: proposal.data }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to apply proposal");
      onVersionChange(data.version);
      setDrafts((prev) => ({
        ...prev,
        [selected]: normalizePlatformData(selected, data.version.data),
      }));
      setProposal(null);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to apply proposal"
      );
    }
  }

  function discardProposal() {
    setProposal(null);
  }

  // ─── Render helpers ──────────────────────────────────

  function renderValue(v: unknown): string {
    if (Array.isArray(v)) return v.length > 0 ? v.join(", ") : "(empty)";
    return typeof v === "string" && v.trim() !== "" ? v : "(empty)";
  }

  function renderEditor(data: PlatformData, readOnly: boolean) {
    const record = data as Record<string, unknown>;
    return (
      <div className="space-y-4">
        {PLATFORM_FIELDS[selected].map((f) => (
          <div key={f.key}>
            <label className="mb-1 block text-xs font-medium text-ink-secondary">
              {f.label}
            </label>
            {f.kind === "input" && (
              <input
                className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm text-ink-primary outline-none focus:border-mint-600 disabled:opacity-60"
                value={(record[f.key] as string) ?? ""}
                onChange={(e) => fieldChange(f.key, e.target.value)}
                disabled={readOnly}
              />
            )}
            {f.kind === "textarea" && (
              <textarea
                className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm text-ink-primary outline-none focus:border-mint-600 disabled:opacity-60"
                rows={f.rows ?? 4}
                value={(record[f.key] as string) ?? ""}
                onChange={(e) => fieldChange(f.key, e.target.value)}
                disabled={readOnly}
              />
            )}
            {f.kind === "list" && (
              <div className="space-y-1.5">
                {((record[f.key] as string[]) ?? []).map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <input
                      className="flex-1 rounded-[8px] border border-border bg-workspace px-3 py-1.5 text-sm text-ink-primary outline-none focus:border-mint-600 disabled:opacity-60"
                      value={item}
                      onChange={(e) => listItemChange(f.key, i, e.target.value)}
                      disabled={readOnly}
                    />
                    {!readOnly && (
                      <button
                        onClick={() => listRemove(f.key, i)}
                        className="text-ink-faint hover:text-danger"
                        aria-label="Remove item"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                {!readOnly && (
                  <button
                    onClick={() => listAdd(f.key)}
                    className="inline-flex items-center gap-1 text-xs text-mint-600 hover:underline"
                  >
                    <Plus className="h-3 w-3" />
                    Add
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  function renderProposalPreview(data: PlatformData) {
    const record = data as Record<string, unknown>;
    return (
      <div className="space-y-3">
        {PLATFORM_FIELDS[selected].map((f) => (
          <div key={f.key}>
            <p className="text-xs font-medium text-ink-secondary">{f.label}</p>
            <p className="mt-0.5 whitespace-pre-wrap rounded-[8px] border border-mint-600/30 bg-mint-100/50 px-3 py-2 text-sm text-ink-primary">
              {renderValue(record[f.key])}
            </p>
          </div>
        ))}
      </div>
    );
  }

  function renderDiff(oldData: PlatformData, newData: PlatformData) {
    const oldR = oldData as Record<string, unknown>;
    const newR = newData as Record<string, unknown>;
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          <span>Field</span>
          <span>OLD</span>
          <span>NEW</span>
        </div>
        {PLATFORM_FIELDS[selected].map((f) => {
          const changed =
            JSON.stringify(oldR[f.key]) !== JSON.stringify(newR[f.key]);
          return (
            <div
              key={f.key}
              className={`grid grid-cols-[1fr_1fr_1fr] gap-2 rounded-[8px] border p-2 ${
                changed
                  ? "border-mint-600/30 bg-mint-100/40"
                  : "border-border bg-workspace"
              }`}
            >
              <span className="text-xs font-medium text-ink-secondary">
                {f.label}
              </span>
              <p className="whitespace-pre-wrap text-xs text-ink-muted">
                {renderValue(oldR[f.key])}
              </p>
              <p className="whitespace-pre-wrap text-xs text-ink-primary">
                {renderValue(newR[f.key])}
              </p>
            </div>
          );
        })}
      </div>
    );
  }

  // ─── Workspace (center column) ───────────────────────

  let workspace: React.ReactNode;

  if (!hasMaster) {
    workspace = (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Lock className="h-5 w-5 text-ink-faint" />
        <p className="mt-3 text-sm text-ink-secondary">
          Create the Content Master before adapting platform versions.
        </p>
      </div>
    );
  } else {
    workspace = (
      <div>
        {/* Platform cards */}
        <div className="mb-5 flex gap-2">
          {platforms.map((p) => {
            const v = versions[p];
            const isPrimary = primaryPlatform === p;
            return (
              <button
                key={p}
                onClick={() => switchPlatform(p)}
                className={`flex-1 rounded-[8px] border p-3 text-left transition-colors ${
                  selected === p
                    ? "border-mint-600 bg-mint-100/60"
                    : "border-border bg-workspace hover:border-ink-faint"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-ink-primary">
                    {platformLabel(p)}
                  </span>
                  {isPrimary && <Badge variant="mint">Primary</Badge>}
                </div>
                <p className="mt-1 text-xs text-ink-muted">
                  {v ? versionStatusLabel(v.status) : "Not created"}
                </p>
              </button>
            );
          })}
        </div>

        {!approved && (
          <div className="mb-4 rounded-[8px] border border-warning/30 bg-warning/5 p-3">
            <p className="text-xs text-ink-secondary">
              Brief has changed. Re-approve it to continue editing platform
              versions.
            </p>
          </div>
        )}

        {actionError && (
          <div className="mb-4 rounded-[8px] border border-danger/20 bg-danger/5 p-3 text-xs text-danger">
            {actionError}
          </div>
        )}

        {/* States: not created / proposal / editor */}
        {!version && !proposalPending && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-5 w-5 text-ink-faint" />
            <p className="mt-3 text-sm text-ink-secondary">
              No {platformLabel(selected)} version yet.
            </p>
            {!locked && (
              <div className="mt-4 flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={adapt}
                  disabled={adapting}
                >
                  <Sparkles className="mr-1 h-3 w-3" />
                  {adapting ? "Adapting…" : "Adapt from Master with AI"}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={createEmpty}
                  disabled={creating}
                >
                  {creating ? "Creating…" : "Create Empty Draft"}
                </Button>
              </div>
            )}
          </div>
        )}

        {proposalPending && !proposal.isReAdapt && (
          <div>
            <div className="mb-4 rounded-[8px] border border-mint-600/30 bg-mint-100 p-3">
              <p className="text-xs font-medium text-ink-primary">
                AI adaptation proposal — nothing is saved yet. Review, then
                Apply or Discard.
              </p>
              <div className="mt-2 flex gap-2">
                <Button variant="primary" size="sm" onClick={applyProposal}>
                  Apply
                </Button>
                <Button variant="ghost" size="sm" onClick={discardProposal}>
                  Discard
                </Button>
              </div>
            </div>
            {renderProposalPreview(proposal.data)}
          </div>
        )}

        {proposalPending && proposal.isReAdapt && draft && (
          <div>
            <div className="mb-4 rounded-[8px] border border-mint-600/30 bg-mint-100 p-3">
              <p className="text-xs font-medium text-ink-primary">
                AI re-adapt proposal — auto-save is paused. Accept replaces
                this platform&apos;s draft; Reject keeps the current version.
              </p>
              <div className="mt-2 flex gap-2">
                <Button variant="primary" size="sm" onClick={applyProposal}>
                  Accept
                </Button>
                <Button variant="ghost" size="sm" onClick={discardProposal}>
                  Reject
                </Button>
              </div>
            </div>
            {renderDiff(draft, proposal.data)}
          </div>
        )}

        {version && !proposalPending && draft && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <Badge variant={version.status === "published" ? "mint" : "default"}>
                {versionStatusLabel(version.status)}
              </Badge>
              {editable && (
                <span
                  className={`text-xs ${
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
                      onClick={() => getQueue(selected)?.retry()}
                    >
                      Retry
                    </button>
                  )}
                </span>
              )}
            </div>
            {version.status === "published" && (
              <p className="mb-4 rounded-[8px] border border-mint-600/30 bg-mint-100/40 px-3 py-2 text-xs text-ink-secondary">
                Published version is read-only. Use Edit Publication in the
                Review tab to correct the publication record.
              </p>
            )}
            {(version.status === "review" || version.status === "approved") && (
              <p className="mb-4 rounded-[8px] border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-ink-secondary">
                This version is currently {versionStatusLabel(version.status)}.
                Read-only — use Return to Draft in the Review tab to edit it.
              </p>
            )}
            {renderEditor(draft, locked || !editable)}
          </div>
        )}
      </div>
    );
  }

  // ─── Loop AI panel (right column) ────────────────────

  const hasPlaybook = playbookPlatforms.includes(selected);

  const canAdapt = !locked && (!version || editable);

  const aiPanel = !hasMaster ? null : (
    <div className="space-y-3">
      {canAdapt ? (
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={adapt}
          disabled={adapting || proposalPending}
        >
          <Sparkles className="mr-1 h-3 w-3" />
          {adapting
            ? "Adapting…"
            : version
              ? "Re-adapt from Master with AI"
              : "Adapt from Master with AI"}
        </Button>
      ) : (
        <p className="rounded-[8px] border border-border bg-workspace p-3 text-xs text-ink-muted">
          {version?.status === "published"
            ? "Published version is read-only. AI adaptation is unavailable after publication."
            : `This version is currently ${versionStatusLabel(version?.status)}. AI adaptation is only available for drafts.`}
        </p>
      )}
      {adaptError && (
        <div className="rounded-[8px] border border-danger/20 bg-danger/5 p-3">
          <p className="text-xs text-danger">{adaptError}</p>
          <button
            onClick={adapt}
            className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-mint-600 hover:underline"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </div>
      )}
      <p className="text-xs text-ink-faint">
        {hasPlaybook
          ? "Custom playbook loaded for this platform."
          : "No custom playbook — generic platform structure is used."}
      </p>
      <p className="text-xs text-ink-faint">
        AI adapts the approved Content Master into a structured{" "}
        {platformLabel(selected)} version. Nothing is saved until you Apply
        or Accept.
      </p>
    </div>
  );

  return { workspace, aiPanel };
}
