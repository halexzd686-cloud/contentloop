"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { DemoBadge } from "@/components/ui/demo-badge";
import { Button } from "@/components/ui/button";
import { FountainLoader } from "@/components/motion/fountain-loader";
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
      if (!res.ok) throw new Error(data.error || "内容加载失败");
      setContents(data.contents);
    } catch (err) {
      setError(err instanceof Error ? err.message : "内容加载失败");
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
      if (!res.ok) throw new Error(data.error || "归档失败");
      setArchiveTarget(null);
      await load();
    } catch (err) {
      setArchiveTarget(null);
      setError(err instanceof Error ? err.message : "归档失败");
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
      if (!res.ok) throw new Error(data.error || "恢复失败");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "恢复失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header — M7 P5: title + summary + primary action */}
      <div
        className="flex items-end justify-between px-8 pb-[18px] pt-6"
        style={{ borderBottom: "1px solid rgba(200,201,203,0.65)" }}
      >
        <div>
          <h1 className="text-[24px] font-semibold leading-tight text-ink-primary">
            内容工作台
          </h1>
          <p className="mt-1.5 text-[12.5px]" style={{ color: "#626660" }}>
            {archived
              ? `${contents.length} 条已归档`
              : `${contents.length} 条内容 · ${
                  contents.filter((c) => c.status === "in_progress").length
                } 条制作中`}
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 h-3 w-3" />
          新建内容
        </Button>
      </div>

      {/* Index Tabs */}
      <div className="px-8">
        <div
          className="flex gap-6"
          style={{ borderBottom: "1px solid rgba(200,201,203,0.65)" }}
        >
          {(["active", "archived"] as const).map((v) => {
            const on = view === v;
            return (
              <button
                key={v}
                onClick={() => setView(v)}
                className="relative pb-2 pt-3 text-[13px]"
                style={{
                  color: on ? "#20231F" : "#626660",
                  fontWeight: on ? 600 : 400,
                }}
              >
                {v === "active" ? "进行中" : "已归档"}
                {on && (
                  <span
                    className="absolute inset-x-0 bottom-0 h-[2px]"
                    style={{ background: "#7C9482" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-8">
        {loading && contents.length === 0 ? (
          // M7: fountain transition indicator (喷泉动效 + 页面名)
          <div className="flex min-h-[50vh] items-center justify-center">
            <FountainLoader size={30} label="正在加载内容工作台" />
          </div>
        ) : error && contents.length === 0 ? (
          <div className="rounded-[10px] border border-danger/20 bg-danger/5 p-6 text-center">
            <p className="text-sm text-danger">{error}</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={load}>
              <RefreshCw className="mr-1 h-3 w-3" />
              重试
            </Button>
          </div>
        ) : contents.length === 0 ? (
          <div className="py-16 text-center">
            {archived ? (
              <p className="text-sm text-ink-secondary">暂无已归档内容。</p>
            ) : (
              <>
                <p className="text-sm text-ink-secondary">
                  还没有内容。直接新建，或去选题雷达选用一条线索来创建。
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setCreateOpen(true)}
                  >
                    新建内容
                  </Button>
                  <Link href="/app/radar">
                    <Button variant="secondary" size="sm">
                      去选题雷达
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </div>
        ) : (
          <div>
            {error && (
              <div className="mt-4 rounded-[8px] border border-danger/20 bg-danger/5 p-3 text-xs text-danger">
                {error}
              </div>
            )}
            {contents.map((c) => (
              <Link
                key={c.id}
                href={`/app/studio/${c.id}`}
                className="group flex items-center gap-4 px-2.5 py-[15px] transition-colors duration-150 hover:bg-[rgba(124,148,130,0.05)]"
                style={{ borderBottom: "1px solid rgba(200,201,203,0.4)" }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[15px] font-semibold text-ink-primary">
                      {c.title}
                    </p>
                    <DemoBadge isDemo={c.isDemo} />
                  </div>
                  <div
                    className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs"
                    style={{ color: "#626660" }}
                  >
                    {c.ownerName && <span>负责人：{c.ownerName}</span>}
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
                        未设平台——去设置
                      </button>
                    ) : (
                      <span className="text-ink-faint">未设平台</span>
                    )}
                    <span>
                      简报：
                      {c.briefStatus === "approved"
                        ? "已确认"
                        : c.briefStatus === "draft"
                          ? "草稿"
                          : "未开始"}
                    </span>
                    <span style={{ color: "#8B8E87" }}>
                      更新于 {new Date(c.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {/* Fixed action slot keeps the status badge column
                      aligned whether or not a hover action exists. */}
                  <span className="flex w-[60px] justify-end">
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
                        恢复
                      </Button>
                    ) : (
                      c.status !== "published" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          className="opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setArchiveTarget(c);
                          }}
                        >
                          归档
                        </Button>
                      )
                    )}
                  </span>
                  <Badge variant={STATUS_VARIANT[c.status] || "default"}>
                    {contentStatusLabel(c.status)}
                  </Badge>
                </div>
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
              <DialogTitle>归档这条内容？</DialogTitle>
              <DialogDescription>
                会把“{archiveTarget.title}”移出进行中的工作。简报、母稿和平台版本都会保留，随时可以恢复。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setArchiveTarget(null)}>
                取消
              </Button>
              <Button variant="danger" onClick={archive} disabled={busy}>
                {busy ? "归档中…" : "归档"}
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
      if (!res.ok) throw new Error(data.error || "创建失败");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新建内容</DialogTitle>
          <DialogDescription>
            直接创建内容项目——不需要先有线索。从“策划中”开始；简报和母稿由你后续创建。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-secondary">
              标题 *
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
                主要平台 *
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
                内容方向
              </label>
              <select
                className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600"
                value={pillarId}
                onChange={(e) => setPillarId(e.target.value)}
              >
                <option value="">— 无 —</option>
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
              负责人 *
            </label>
            <select
              className="w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm outline-none focus:border-mint-600"
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
            >
              <option value="">— 请选择 —</option>
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
            取消
          </Button>
          <Button variant="primary" onClick={submit} disabled={!valid || busy}>
            {busy ? "创建中…" : "创建内容"}
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
      if (!res.ok) throw new Error(data.error || "保存失败");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>设置主要平台</DialogTitle>
          <DialogDescription>
            “{content.title}”没有主要平台。设置一次，平台范围的运营经验才能匹配到这条内容。设置后不可更改。
          </DialogDescription>
        </DialogHeader>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-secondary">
            主要平台
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
            取消
          </Button>
          <Button variant="primary" onClick={submit} disabled={busy}>
            {busy ? "保存中…" : "设置平台"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
