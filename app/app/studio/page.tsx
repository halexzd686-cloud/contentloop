"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, RefreshCw } from "lucide-react";
import { contentStatusLabel, platformLabel } from "@/lib/labels";

/**
 * Studio index — content list for the current Brand.
 * Detail workspace lives at /app/studio/[contentId].
 *
 * M4.1: manual New Content, Active/Archived views, Archive/Restore,
 * and legacy "No platform set" correction.
 */

interface ContentListItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  ownerName: string | null;
  briefStatus: "draft" | "approved" | null;
  primaryPlatform: string | null;
  isDemo: boolean;
  updatedAt: string;
}

const STATUS_VARIANT: Record<string, "default" | "mint" | "warning" | "danger"> = {
  planning: "default",
  in_progress: "warning",
  review: "warning",
  scheduled: "default",
  published: "mint",
};

const PLATFORM_KEYS = ["xiaohongshu", "bilibili", "douyin"];

const CORRECTABLE_STATUSES = ["planning", "in_progress", "review", "scheduled"];

export default function StudioPage() {
  const [view, setView] = useState<"active" | "archived">("active");
  const [contents, setContents] = useState<ContentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<ContentListItem | null>(null);
  const [platformTarget, setPlatformTarget] = useState<ContentListItem | null>(null);
  const [busy, setBusy] = useState(false);

  const archived = view === "archived";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/contents${archived ? "?archived=true" : ""}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load contents");
      setContents(data.contents);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contents");
    } finally {
      setLoading(false);
    }
  }, [archived]);

  useEffect(() => {
    const t = setTimeout(() => load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  async function archive() {
    if (!archiveTarget || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/contents/${archiveTarget.id}/archive`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Archive failed");
      setArchiveTarget(null);
      await load();
    } catch (err) {
      setArchiveTarget(null);
      setError(err instanceof Error ? err.message : "Archive failed");
    } finally {
      setBusy(false);
    }
  }

  async function restore(id: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/contents/${id}/restore`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Restore failed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-workspace px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-ink-primary">Studio</h1>
            <p className="mt-0.5 text-sm text-ink-muted">
              Produce content from Brief to platform versions.
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-3 w-3" />
            New Content
          </Button>
        </div>
        <div className="mt-3 flex gap-1">
          {(["active", "archived"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-[8px] px-3 py-1.5 text-xs font-medium transition-colors ${
                view === v
                  ? "bg-mint-100 text-mint-700"
                  : "text-ink-muted hover:bg-surface-subtle"
              }`}
            >
              {v === "active" ? "Active" : "Archived"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading && contents.length === 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-[10px] border border-border bg-workspace p-5"
              >
                <div className="mb-2 h-4 w-1/2 rounded bg-surface-subtle" />
                <div className="h-3 w-1/4 rounded bg-surface-subtle" />
              </div>
            ))}
          </div>
        ) : error && contents.length === 0 ? (
          <div className="rounded-[10px] border border-danger/20 bg-danger/5 p-6 text-center">
            <p className="text-sm text-danger">{error}</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={load}>
              <RefreshCw className="mr-1 h-3 w-3" />
              Retry
            </Button>
          </div>
        ) : contents.length === 0 ? (
          <div className="py-16 text-center">
            {archived ? (
              <p className="text-sm text-ink-secondary">No archived content.</p>
            ) : (
              <>
                <p className="text-sm text-ink-secondary">
                  No content yet. Create one directly, or select a signal in
                  Radar and create content from it.
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setCreateOpen(true)}
                  >
                    New Content
                  </Button>
                  <Link href="/app/radar">
                    <Button variant="secondary" size="sm">
                      Go to Radar
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {error && (
              <div className="rounded-[8px] border border-danger/20 bg-danger/5 p-3 text-xs text-danger">
                {error}
              </div>
            )}
            {contents.map((c) => (
              <Link key={c.id} href={`/app/studio/${c.id}`}>
                <Card className="transition-colors hover:border-border-strong">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate text-sm font-medium text-ink-primary">
                          {c.title}
                        </p>
                        {c.isDemo && <Badge variant="default">DEMO</Badge>}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant={STATUS_VARIANT[c.status] || "default"}>
                          {contentStatusLabel(c.status)}
                        </Badge>
                        {archived ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={busy}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              restore(c.id);
                            }}
                          >
                            Restore
                          </Button>
                        ) : (
                          c.status !== "published" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busy}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setArchiveTarget(c);
                              }}
                            >
                              Archive
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-3 text-xs text-ink-muted">
                      {c.ownerName && <span>Owner: {c.ownerName}</span>}
                      {c.primaryPlatform ? (
                        <span>{platformLabel(c.primaryPlatform)}</span>
                      ) : archived ? null : CORRECTABLE_STATUSES.includes(c.status) ? (
                        <button
                          className="font-medium text-warning hover:underline"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setPlatformTarget(c);
                          }}
                        >
                          No platform — Set one
                        </button>
                      ) : (
                        <span className="text-ink-faint">No platform set</span>
                      )}
                      <span>
                        Brief:{" "}
                        {c.briefStatus === "approved"
                          ? "Approved"
                          : c.briefStatus === "draft"
                            ? "Draft"
                            : "Not started"}
                      </span>
                      <span>
                        Updated {new Date(c.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {createOpen && (
        <NewContentDialog
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            setView("active");
            load();
          }}
        />
      )}

      {archiveTarget && (
        <Dialog open onOpenChange={(o) => !o && setArchiveTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Archive Content</DialogTitle>
              <DialogDescription>
                This removes &ldquo;{archiveTarget.title}&rdquo; from the active
                workflow. Its brief, master and platform versions are kept, and
                you can restore it at any time.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setArchiveTarget(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={archive} disabled={busy}>
                {busy ? "Archiving…" : "Archive"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {platformTarget && (
        <SetPlatformDialog
          content={platformTarget}
          onClose={() => setPlatformTarget(null)}
          onSaved={() => {
            setPlatformTarget(null);
            load();
          }}
        />
      )}
    </div>
  );
}

// ─── New Content (manual, M4.1) ────────────────────────

function NewContentDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [primaryPlatform, setPrimaryPlatform] = useState("xiaohongshu");
  const [pillarId, setPillarId] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [pillars, setPillars] = useState<{ id: string; name: string }[]>([]);
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings/pillars")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.pillars) setPillars(d.pillars);
      })
      .catch(() => {});
    fetch("/api/team-members")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.members) setMembers(d.members);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const valid = title.trim() && primaryPlatform && ownerId;

  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/contents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          primaryPlatform,
          pillarId: pillarId || null,
          ownerId,
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
          <DialogTitle>New Content</DialogTitle>
          <DialogDescription>
            Create a content project directly — no signal required. It starts
            in Planning; brief and master stay untouched until you start them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-secondary">
              Title *
            </label>
            <input
              className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-secondary">
                Primary Platform *
              </label>
              <select
                className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600"
                value={primaryPlatform}
                onChange={(e) => setPrimaryPlatform(e.target.value)}
              >
                {PLATFORM_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {platformLabel(k)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-secondary">
                Pillar
              </label>
              <select
                className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600"
                value={pillarId}
                onChange={(e) => setPillarId(e.target.value)}
              >
                <option value="">— none —</option>
                {pillars.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-secondary">
              Owner *
            </label>
            <select
              className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600"
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
            >
              <option value="">— select —</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="rounded-[8px] border border-danger/20 bg-danger/5 p-3 text-xs text-danger">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={!valid || busy}>
            {busy ? "Creating…" : "Create Content"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Legacy platform correction (null → value once) ────

function SetPlatformDialog({
  content,
  onClose,
  onSaved,
}: {
  content: ContentListItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [platform, setPlatform] = useState("xiaohongshu");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/contents/${content.id}/primary-platform`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primaryPlatform: platform }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Primary Platform</DialogTitle>
          <DialogDescription>
            &ldquo;{content.title}&rdquo; has no primary platform. Set it once
            so platform-scoped learnings can match this content. It cannot be
            changed afterwards.
          </DialogDescription>
        </DialogHeader>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-secondary">
            Primary Platform
          </label>
          <select
            className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
          >
            {PLATFORM_KEYS.map((k) => (
              <option key={k} value={k}>
                {platformLabel(k)}
              </option>
            ))}
          </select>
          {error && (
            <div className="mt-3 rounded-[8px] border border-danger/20 bg-danger/5 p-3 text-xs text-danger">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={busy}>
            {busy ? "Saving…" : "Set Platform"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
