"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { FlaskConical, Plus, X } from "lucide-react";
import { ResultSection, type ResultData } from "@/components/analytics/test-result-section";
import { LearningSection } from "@/components/analytics/learning-section";
import { createTestFormSubmittable } from "@/lib/validation/test";
import {
  platformLabel,
  testMethodLabel,
  testStatusLabel,
  testRoleLabel,
  TEST_METHOD_HELPERS,
  TEST_METHODS_FOOTNOTE,
  TEST_SECTION_HELPER,
  TEST_ROLE_HELPER,
  CHECKPOINT_HELPER,
  PRIMARY_METRIC_HELPER,
} from "@/lib/labels";

/**
 * Tests section — M3.1 Test Core (Analytics → Tests).
 *
 * Create modal IS the review gate: confirm writes the test with
 * status=running (server-owned). Core definition is locked at create.
 * Running tests: edit descriptive fields, attach/detach publications,
 * or Discard (M4.1 — removes the test and its links only).
 */

interface TestRow {
  id: string;
  title: string;
  platform: string;
  checkpoint: string;
  method: string;
  status: string;
  primaryMetricKey: string;
  publicationCount: number;
  createdAt: string;
}

interface TestDetail {
  test: {
    id: string;
    title: string;
    hypothesis: string;
    change: string;
    primaryMetricKey: string;
    platform: string;
    checkpoint: string;
    method: string;
    status: string;
    keepConsistent: string | null;
    compareWith: string | null;
  };
  publications: {
    id: string;
    publicationId: string;
    role: string;
    finalTitle: string;
    hasCheckpointData: boolean;
  }[];
}

const PLATFORM_KEYS = ["xiaohongshu", "bilibili", "douyin"] as const;

export interface TestCreateRequest {
  platform: string;
  checkpoint: string;
  contextLabel: string;
}

export function TestsSection({
  publications,
  createRequest,
  onCreateRequestHandled,
}: {
  publications: { publicationId: string; finalTitle: string; platform: string }[];
  /** M4.2: external entry (e.g. from a saved diagnosis). Opens the same
   *  Create Test dialog with safe prefill — never a second mutation path. */
  createRequest?: TestCreateRequest | null;
  onCreateRequestHandled?: () => void;
}) {
  const [tests, setTests] = useState<TestRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // External create request opens the same dialog — derived, no effect.
  const createVisible = createOpen || !!createRequest;

  function closeCreate() {
    setCreateOpen(false);
    onCreateRequestHandled?.();
  }

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/tests");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load tests");
      setTests(data.tests);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tests");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="mt-6 rounded-[8px] border border-border bg-workspace">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-ink-muted" />
          <span className="text-sm font-semibold text-ink-primary">Tests</span>
          <span className="text-xs text-ink-faint">{tests.length}</span>
          <span className="text-xs text-ink-faint">{TEST_SECTION_HELPER}</span>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 h-3 w-3" />
          Create Test
        </Button>
      </div>

      {error && (
        <div className="px-4 py-2 text-xs text-danger">{error}</div>
      )}

      {loaded && tests.length === 0 ? (
        <p className="px-4 py-4 text-xs text-ink-faint">
          No tests yet. Create one from a real question about your published
          content.
        </p>
      ) : (
        <div className="divide-y divide-border">
          {tests.map((t) => (
            <button
              key={t.id}
              className="w-full px-4 py-2.5 text-left hover:bg-canvas"
              onClick={() => setSelectedId(t.id)}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink-primary">{t.title}</span>
                <Badge variant={t.status === "running" ? "warning" : "default"}>
                  {testStatusLabel(t.status)}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-ink-muted">
                {platformLabel(t.platform)} · {t.checkpoint} ·{" "}
                {testMethodLabel(t.method)} · {t.primaryMetricKey} ·{" "}
                {t.publicationCount} publication{t.publicationCount === 1 ? "" : "s"}
              </p>
            </button>
          ))}
        </div>
      )}

      {createVisible && (
        <CreateTestDialog
          initialPlatform={createRequest?.platform}
          initialCheckpoint={createRequest?.checkpoint}
          contextLabel={createRequest?.contextLabel}
          onClose={closeCreate}
          onCreated={() => {
            closeCreate();
            load();
          }}
        />
      )}

      {selectedId && (
        <TestDetailDrawer
          testId={selectedId}
          publications={publications}
          onClose={() => setSelectedId(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}

// ─── Create Test (modal = the review gate) ─────────────

function CreateTestDialog({
  initialPlatform,
  initialCheckpoint,
  contextLabel,
  onClose,
  onCreated,
}: {
  /** M4.2 safe prefill — presentation only. Platform/checkpoint stay
   *  editable; every other field is always human-chosen. The submit
   *  path and server validation are unchanged. */
  initialPlatform?: string;
  initialCheckpoint?: string;
  contextLabel?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [platform, setPlatform] = useState(initialPlatform ?? "xiaohongshu");
  const [method, setMethod] = useState("");
  const [checkpoint, setCheckpoint] = useState(initialCheckpoint ?? "24h");
  const [title, setTitle] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [change, setChange] = useState("");
  const [primaryMetricKey, setPrimaryMetricKey] = useState("");
  const [keepConsistent, setKeepConsistent] = useState("");
  const [compareWith, setCompareWith] = useState("");
  const [metricOptions, setMetricOptions] = useState<{ key: string; label: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings/metrics")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const defs = (data.definitions as { platform: string; isActive: boolean; key: string; alias: string | null; displayName: string }[])
          .filter((d) => d.platform === platform && d.isActive);
        setMetricOptions(defs.map((d) => ({ key: d.key, label: d.alias ?? d.displayName })));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [platform]);

  const valid = createTestFormSubmittable({
    method,
    title,
    hypothesis,
    change,
    primaryMetricKey,
  });

  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          checkpoint,
          method,
          title,
          hypothesis,
          change,
          primaryMetricKey,
          keepConsistent: keepConsistent || null,
          compareWith: compareWith || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Create failed");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Test</DialogTitle>
          <DialogDescription>
            A test starts running on creation. Platform, checkpoint, method,
            hypothesis and primary metric are locked afterwards.
          </DialogDescription>
        </DialogHeader>

        {contextLabel && (
          <p className="rounded-[8px] border border-border bg-canvas px-3 py-2 text-xs text-ink-muted">
            Creating a Test from: {contextLabel}
          </p>
        )}

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-secondary">Platform *</label>
              <select className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600" value={platform} onChange={(e) => { setPlatform(e.target.value); setPrimaryMetricKey(""); }}>
                {PLATFORM_KEYS.map((k) => <option key={k} value={k}>{platformLabel(k)}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-secondary">Checkpoint *</label>
              <select className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600" value={checkpoint} onChange={(e) => setCheckpoint(e.target.value)}>
                <option value="24h">24h</option>
                <option value="72h">72h</option>
              </select>
              <p className="mt-1 text-xs text-ink-faint">{CHECKPOINT_HELPER}</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-secondary">Method *</label>
              <select className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600" value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="">— select —</option>
                {Object.keys(TEST_METHOD_HELPERS).map((k) => <option key={k} value={k}>{testMethodLabel(k)}</option>)}
              </select>
              {method && TEST_METHOD_HELPERS[method] && (
                <p className="mt-1 text-xs text-ink-faint">{TEST_METHOD_HELPERS[method]}</p>
              )}
              <p className="mt-1 text-xs text-ink-faint">{TEST_METHODS_FOOTNOTE}</p>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-secondary">Title *</label>
            <input className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-secondary">Hypothesis *</label>
            <textarea rows={2} className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600" value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-secondary">Change *</label>
            <textarea rows={2} className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600" value={change} onChange={(e) => setChange(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-secondary">Primary Metric *</label>
            <select className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600" value={primaryMetricKey} onChange={(e) => setPrimaryMetricKey(e.target.value)}>
              <option value="">— select —</option>
              {metricOptions.map((m) => <option key={m.key} value={m.key}>{m.label} ({m.key})</option>)}
            </select>
            <p className="mt-1 text-xs text-ink-faint">{PRIMARY_METRIC_HELPER}</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-secondary">Keep Consistent</label>
            <input className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600" value={keepConsistent} onChange={(e) => setKeepConsistent(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-secondary">Compare With</label>
            <input className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600" value={compareWith} onChange={(e) => setCompareWith(e.target.value)} />
          </div>

          {error && (
            <div className="rounded-[8px] border border-danger/20 bg-danger/5 p-3 text-xs text-danger">{error}</div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={!valid || busy}>
            {busy ? "Creating…" : "Confirm Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Test detail drawer ────────────────────────────────

function TestDetailDrawer({
  testId,
  publications,
  onClose,
  onChanged,
}: {
  testId: string;
  publications: { publicationId: string; finalTitle: string; platform: string }[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<TestDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attachId, setAttachId] = useState("");
  const [role, setRole] = useState("comparison");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editKeep, setEditKeep] = useState("");
  const [editCompare, setEditCompare] = useState("");
  const [result, setResult] = useState<ResultData | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);
  const [concludeOpen, setConcludeOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [outcome, setOutcome] = useState("no_clear_result");
  const [conclusion, setConclusion] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/tests/${testId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setDetail(data);
      setError(null);
      const rres = await fetch(`/api/tests/${testId}/result`);
      const rdata = await rres.json();
      if (rres.ok) {
        setResult(rdata);
        setResultError(null);
      } else {
        setResultError(rdata.error || "Failed to load result");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }, [testId]);

  useEffect(() => {
    const t = setTimeout(() => load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  function startEdit() {
    if (!detail) return;
    setEditTitle(detail.test.title);
    setEditKeep(detail.test.keepConsistent ?? "");
    setEditCompare(detail.test.compareWith ?? "");
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  async function saveEdit() {
    if (!detail || busy || editTitle.trim() === "") return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/tests/${testId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          keepConsistent: editKeep || null,
          compareWith: editCompare || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setEditing(false);
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function conclude() {
    if (!result || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/tests/${testId}/conclude`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outcome,
          conclusion,
          previewFingerprint: result.previewFingerprint,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Fingerprint conflict: close the panel, refetch the latest
        // authoritative result — the human must re-review before
        // concluding. The error never touches the result state.
        if (res.status === 409) {
          setConcludeOpen(false);
          await load();
        }
        throw new Error(data.error || "Conclude failed");
      }
      setConcludeOpen(false);
      setConclusion("");
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conclude failed");
    } finally {
      setBusy(false);
    }
  }

  async function discard() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/tests/${testId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Discard failed");
      setDiscardOpen(false);
      onChanged();
      onClose();
    } catch (err) {
      setDiscardOpen(false);
      setError(err instanceof Error ? err.message : "Discard failed");
    } finally {
      setBusy(false);
    }
  }

  async function attach() {    if (!attachId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/tests/${testId}/publications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicationId: attachId, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Attach failed");
      setAttachId("");
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Attach failed");
    } finally {
      setBusy(false);
    }
  }

  async function detach(publicationId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/tests/${testId}/publications?publicationId=${publicationId}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Detach failed");
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Detach failed");
    } finally {
      setBusy(false);
    }
  }

  const candidates = useMemo(() => {
    if (!detail) return [];
    const attached = new Set(detail.publications.map((p) => p.publicationId));
    return publications.filter(
      (p) => p.platform === detail.test.platform && !attached.has(p.publicationId)
    );
  }, [detail, publications]);

  const running = detail?.test.status === "running";

  return (
    <Drawer open onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        {detail ? (
          <>
            <DrawerHeader>
              {editing ? (
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-secondary">Title</label>
                  <input
                    className="w-full rounded-[8px] border border-border bg-canvas px-3 py-2 text-sm text-ink-primary outline-none focus:border-mint-600"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />
                </div>
              ) : (
                <DrawerTitle>{detail.test.title}</DrawerTitle>
              )}
              <DrawerDescription>
                {platformLabel(detail.test.platform)} · {detail.test.checkpoint} ·{" "}
                {testMethodLabel(detail.test.method)} · {detail.test.primaryMetricKey} ·{" "}
                {testStatusLabel(detail.test.status)}
              </DrawerDescription>
            </DrawerHeader>

            <div className="space-y-4 text-sm">
              {running && !editing && (
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" onClick={startEdit}>
                    Edit
                  </Button>
                </div>
              )}
              {editing && (
                <div className="space-y-3 rounded-[8px] border border-mint-600/30 bg-mint-100/40 p-3">
                  <p className="text-xs font-medium text-ink-primary">
                    Editing — only Title, Keep Consistent and Compare With can
                    change. The test definition is locked.
                  </p>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink-secondary">Keep Consistent</label>
                    <input
                      className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600"
                      value={editKeep}
                      onChange={(e) => setEditKeep(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink-secondary">Compare With</label>
                    <input
                      className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600"
                      value={editCompare}
                      onChange={(e) => setEditCompare(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="primary" size="sm" onClick={saveEdit} disabled={busy || editTitle.trim() === ""}>
                      {busy ? "Saving…" : "Save"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={cancelEdit}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
              <section>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Hypothesis</p>
                <p className="mt-1 text-ink-primary">{detail.test.hypothesis}</p>
              </section>
              <section>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Change</p>
                <p className="mt-1 text-ink-primary">{detail.test.change}</p>
              </section>
              {!editing && (detail.test.keepConsistent || detail.test.compareWith) && (
                <section className="text-xs text-ink-muted">
                  {detail.test.keepConsistent && <p>Keep consistent: {detail.test.keepConsistent}</p>}
                  {detail.test.compareWith && <p>Compare with: {detail.test.compareWith}</p>}
                </section>
              )}

              <section>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Publications ({detail.publications.length})
                </p>
                <div className="mt-2 space-y-1.5">
                  {detail.publications.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-[8px] border border-border bg-canvas px-3 py-2">
                      <div>
                        <p className="text-xs font-medium text-ink-primary">{p.finalTitle}</p>
                        <p className="text-[11px] text-ink-muted">
                          {testRoleLabel(p.role)} · {p.hasCheckpointData ? `${detail.test.checkpoint} data available` : `No ${detail.test.checkpoint} data yet`}
                        </p>
                      </div>
                      {running && (
                        <button className="text-ink-faint hover:text-danger" onClick={() => detach(p.publicationId)} disabled={busy}>
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {detail.publications.length === 0 && (
                    <p className="text-xs text-ink-faint">No publications attached yet.</p>
                  )}
                </div>

                {running && (
                  <div className="mt-3 space-y-2">
                    {/* Row 1: publication selector takes the full width —
                        long titles can never push the action out. */}
                    <select
                      className="w-full min-w-0 rounded-[8px] border border-border bg-workspace px-2 py-1.5 text-xs outline-none focus:border-mint-600"
                      value={attachId}
                      onChange={(e) => setAttachId(e.target.value)}
                    >
                      <option value="">Select publication…</option>
                      {candidates.map((p) => (
                        <option key={p.publicationId} value={p.publicationId}>{p.finalTitle}</option>
                      ))}
                    </select>
                    {/* Row 2: role flexible, Add never shrinks away. */}
                    <div className="flex items-center gap-2">
                      <select
                        className="min-w-0 flex-1 rounded-[8px] border border-border bg-workspace px-2 py-1.5 text-xs outline-none focus:border-mint-600"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                      >
                        <option value="comparison">{testRoleLabel("comparison")}</option>
                        <option value="control">{testRoleLabel("control")}</option>
                        <option value="variant">{testRoleLabel("variant")}</option>
                      </select>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="shrink-0"
                        onClick={attach}
                        disabled={!attachId || busy}
                      >
                        Add
                      </Button>
                    </div>
                    <p className="text-xs text-ink-faint">{TEST_ROLE_HELPER}</p>
                  </div>
                )}
              </section>

              {!running && <LearningSection testId={testId} />}

              <ResultSection
                running={running}
                result={result}
                resultError={resultError}
                onRetryResult={load}
                concludeOpen={concludeOpen}
                onOpenConclude={() => setConcludeOpen(true)}
                onCloseConclude={() => setConcludeOpen(false)}
                outcome={outcome}
                setOutcome={setOutcome}
                conclusion={conclusion}
                setConclusion={setConclusion}
                onConclude={conclude}
                busy={busy}
              />

              {running && (
                <div className="border-t border-border pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger hover:bg-danger/5 hover:text-danger"
                    onClick={() => setDiscardOpen(true)}
                  >
                    Discard Test
                  </Button>
                </div>
              )}

              {error && (
                <div className="rounded-[8px] border border-danger/20 bg-danger/5 p-3 text-xs text-danger">{error}</div>
              )}
            </div>

            {discardOpen && (
              <Dialog open onOpenChange={(o) => !o && setDiscardOpen(false)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Discard Test</DialogTitle>
                    <DialogDescription>
                      This removes this running Test and its publication links.
                      It does not delete published content or metric data.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setDiscardOpen(false)}>
                      Cancel
                    </Button>
                    <Button variant="danger" onClick={discard} disabled={busy}>
                      {busy ? "Discarding…" : "Discard Test"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </>
        ) : (
          <p className="text-sm text-ink-muted">Loading test…</p>
        )}
      </DrawerContent>
    </Drawer>
  );
}
