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

/**
 * Tests section — M3.1 Test Core (Analytics → Tests).
 *
 * Create modal IS the review gate: confirm writes the test with
 * status=running (server-owned). Core definition is locked at create.
 * Running tests: edit descriptive fields, attach/detach publications.
 * No result/conclude UI here (M3.2), no AI, no learning.
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

const PLATFORM_LABEL: Record<string, string> = {
  xiaohongshu: "Xiaohongshu",
  bilibili: "Bilibili",
  douyin: "Douyin",
};

const METHOD_LABEL: Record<string, string> = {
  ab: "A/B",
  sequential: "Sequential",
  before_after: "Before / After",
  content_comparison: "Content Comparison",
};

export function TestsSection({
  publications,
}: {
  publications: { publicationId: string; finalTitle: string; platform: string }[];
}) {
  const [tests, setTests] = useState<TestRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
                  {t.status}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-ink-muted">
                {PLATFORM_LABEL[t.platform]} · {t.checkpoint} ·{" "}
                {METHOD_LABEL[t.method] ?? t.method} · {t.primaryMetricKey} ·{" "}
                {t.publicationCount} publication{t.publicationCount === 1 ? "" : "s"}
              </p>
            </button>
          ))}
        </div>
      )}

      {createOpen && (
        <CreateTestDialog
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
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
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [platform, setPlatform] = useState("xiaohongshu");
  const [method, setMethod] = useState("content_comparison");
  const [checkpoint, setCheckpoint] = useState("24h");
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

  const valid =
    title.trim() && hypothesis.trim() && change.trim() && primaryMetricKey;

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

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-secondary">Platform *</label>
              <select className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600" value={platform} onChange={(e) => { setPlatform(e.target.value); setPrimaryMetricKey(""); }}>
                {Object.entries(PLATFORM_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-secondary">Checkpoint *</label>
              <select className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600" value={checkpoint} onChange={(e) => setCheckpoint(e.target.value)}>
                <option value="24h">24h</option>
                <option value="72h">72h</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-secondary">Method *</label>
              <select className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600" value={method} onChange={(e) => setMethod(e.target.value)}>
                {Object.entries(METHOD_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
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

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/tests/${testId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setDetail(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }, [testId]);

  useEffect(() => {
    const t = setTimeout(() => load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  async function attach() {
    if (!attachId || busy) return;
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
              <DrawerTitle>{detail.test.title}</DrawerTitle>
              <DrawerDescription>
                {PLATFORM_LABEL[detail.test.platform]} · {detail.test.checkpoint} ·{" "}
                {METHOD_LABEL[detail.test.method]} · {detail.test.primaryMetricKey} ·{" "}
                {detail.test.status}
              </DrawerDescription>
            </DrawerHeader>

            <div className="space-y-4 text-sm">
              <section>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Hypothesis</p>
                <p className="mt-1 text-ink-primary">{detail.test.hypothesis}</p>
              </section>
              <section>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Change</p>
                <p className="mt-1 text-ink-primary">{detail.test.change}</p>
              </section>
              {(detail.test.keepConsistent || detail.test.compareWith) && (
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
                          {p.role} · {p.hasCheckpointData ? `${detail.test.checkpoint} data available` : `Awaiting ${detail.test.checkpoint} data`}
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
                  <div className="mt-3 flex items-center gap-2">
                    <select
                      className="flex-1 rounded-[8px] border border-border bg-workspace px-2 py-1.5 text-xs outline-none focus:border-mint-600"
                      value={attachId}
                      onChange={(e) => setAttachId(e.target.value)}
                    >
                      <option value="">Select publication…</option>
                      {candidates.map((p) => (
                        <option key={p.publicationId} value={p.publicationId}>{p.finalTitle}</option>
                      ))}
                    </select>
                    <select
                      className="rounded-[8px] border border-border bg-workspace px-2 py-1.5 text-xs outline-none focus:border-mint-600"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    >
                      <option value="comparison">comparison</option>
                      <option value="control">control</option>
                      <option value="variant">variant</option>
                    </select>
                    <Button variant="secondary" size="sm" onClick={attach} disabled={!attachId || busy}>
                      Attach
                    </Button>
                  </div>
                )}
              </section>

              <section className="rounded-[8px] border border-border bg-canvas p-3">
                <p className="text-xs text-ink-faint">
                  Observed results and conclusion become available in the next
                  stage (M3.2).
                </p>
              </section>

              {error && (
                <div className="rounded-[8px] border border-danger/20 bg-danger/5 p-3 text-xs text-danger">{error}</div>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-ink-muted">Loading test…</p>
        )}
      </DrawerContent>
    </Drawer>
  );
}
