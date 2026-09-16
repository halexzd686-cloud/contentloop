"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { FountainLoader } from "@/components/motion/fountain-loader";
import { DemoBadge } from "@/components/ui/demo-badge";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { RefreshCw, ExternalLink } from "lucide-react";
import { PublicationModal } from "@/components/studio/publication-modal";
import { MetricSnapshotModal } from "@/components/studio/snapshot-modal";
import {
  checkpointDueAt,
  checkpointStatus,
  type Checkpoint,
} from "@/lib/validation/snapshot";
import {
  briefStatusLabel,
  contentStatusLabel,
  platformLabel,
  versionStatusLabel,
} from "@/lib/labels";

/**
 * Pipeline — /app/pipeline (M1.6)
 *
 * Five fixed columns only (AGENTS §15). One Content = one card;
 * platform states live inside the card. Drag is a thin trigger of the
 * server-side transition table — protected transitions
 * (review→scheduled, scheduled→*, any→published) are rejected by the
 * server and reverted here. No UI path leads to published.
 */

interface PlatformState {
  versionId?: string;
  platform: string;
  status: string;
  checklistDone: number;
  checklistTotal: number;
  publication?: {
    id: string;
    finalTitle: string;
    publishedAt: string;
    snapshot24h: boolean;
    snapshot72h: boolean;
    snapshots?: Record<string, import("@/components/studio/snapshot-modal").SnapshotSummary | null>;
  } | null;
}

interface PipelineItem {
  id: string;
  title: string;
  status: string;
  isDemo: boolean;
  ownerName: string | null;
  reviewerName: string | null;
  deadlineAt: string | null;
  scheduledAt: string | null;
  briefStatus: string | null;
  hasMaster: boolean;
  platforms: PlatformState[];
}

const COLUMNS = [
  { key: "planning", label: contentStatusLabel("planning") },
  { key: "in_progress", label: contentStatusLabel("in_progress") },
  { key: "review", label: contentStatusLabel("review") },
  { key: "scheduled", label: contentStatusLabel("scheduled") },
  { key: "published", label: contentStatusLabel("published") },
] as const;

function PlatformChips({ platforms }: { platforms: PlatformState[] }) {
  if (platforms.length === 0) {
    return (
      <span className="text-[11px] text-ink-faint">暂无平台版本</span>
    );
  }
  return (
    <div className="flex flex-wrap gap-1">
      {platforms.map((p) => (
        <span
          key={p.platform}
          className={`rounded px-1.5 py-0.5 text-[11px] ${
            p.status === "approved"
              ? "bg-mint-100 text-mint-600"
              : p.status === "review"
                ? "bg-warning/10 text-ink-secondary"
                : "bg-surface-subtle text-ink-muted"
          }`}
        >
          {platformLabel(p.platform)} · {versionStatusLabel(p.status)}
          {p.status === "review" &&
            ` · 清单 ${p.checklistDone}/${p.checklistTotal}`}
        </span>
      ))}
    </div>
  );
}

function CardContent({ item }: { item: PipelineItem }) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-ink-primary">{item.title}</p>
        <DemoBadge isDemo={item.isDemo} />
      </div>
      <div className="mt-1.5">
        <PlatformChips platforms={item.platforms} />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px] text-ink-muted">
        <span>{item.ownerName ?? "未分配"}</span>
        {item.deadlineAt && (
          <span>截止 {new Date(item.deadlineAt).toLocaleDateString()}</span>
        )}
      </div>
    </>
  );
}

function DraggableCard({
  item,
  onOpen,
}: {
  item: PipelineItem;
  onOpen: (item: PipelineItem) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(item)}
      className={`cursor-grab rounded-[8px] border border-border bg-workspace p-3 shadow-sm transition-colors hover:border-mint-600/50 ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <CardContent item={item} />
    </div>
  );
}

function Column({
  colKey,
  label,
  items,
  onOpen,
}: {
  colKey: string;
  label: string;
  items: PipelineItem[];
  onOpen: (item: PipelineItem) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: colKey });
  return (
    <div
      ref={setNodeRef}
      className={`flex w-full min-w-[220px] max-w-[320px] flex-1 shrink flex-col rounded-[8px] border p-2 ${
        isOver ? "border-mint-600 bg-mint-100/40" : "border-border bg-canvas"
      }`}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
          {label}
        </span>
        <span className="text-xs text-ink-muted">{items.length}</span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto">
        {items.map((item) => (
          <DraggableCard key={item.id} item={item} onOpen={onOpen} />
        ))}
        {items.length === 0 && (
          <p className="px-2 py-6 text-center text-[11px] text-ink-muted">
            {colKey === "published"
              ? "真实发布后，内容会出现在这里。"
              : "暂无内容"}
          </p>
        )}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const [items, setItems] = useState<PipelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dragError, setDragError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selected, setSelected] = useState<PipelineItem | null>(null);
  const [pubTarget, setPubTarget] = useState<{ item: PipelineItem; platform: string } | null>(null);
  const [snapTarget, setSnapTarget] = useState<{
    publication: { id: string; platform: string; finalTitle: string; publishedAt: string };
    checkpoint: Checkpoint;
    existing: import("@/components/studio/snapshot-modal").SnapshotSummary | null;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/pipeline");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "内容流程加载失败");
      setItems(data.items);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
    setDragError(null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const id = String(active.id);
    const to = String(over.id);
    const item = items.find((i) => i.id === id);
    if (!item || item.status === to) return;

    // Optimistic move; revert on server rejection.
    const prev = items;
    setItems(items.map((i) => (i.id === id ? { ...i, status: to } : i)));
    try {
      const res = await fetch(`/api/contents/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "状态变更被拒绝");
      await load();
    } catch (err) {
      setItems(prev);
      setDragError(err instanceof Error ? err.message : "状态变更被拒绝");
    }
  }

  const activeItem = activeId ? items.find((i) => i.id === activeId) : null;

  if (loading) {
    // M7: fountain transition indicator (喷泉动效 + 页面名)
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center">
        <FountainLoader size={30} label="正在加载内容流程" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-sm text-danger">{loadError}</p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setLoading(true);
            load();
          }}
        >
          <RefreshCw className="mr-1 h-3 w-3" />
          重试
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-[24px] font-semibold leading-tight text-ink-primary">内容流程</h1>
        {dragError && (
          <div className="ml-auto flex items-center gap-2 rounded-[8px] border border-danger/20 bg-danger/5 px-3 py-1.5">
            <p className="text-xs text-danger">{dragError}</p>
            <button
              className="text-xs text-ink-muted underline"
              onClick={() => setDragError(null)}
            >
              知道了
            </button>
          </div>
        )}
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 gap-3 overflow-x-auto">
          {COLUMNS.map((col) => (
            <Column
              key={col.key}
              colKey={col.key}
              label={col.label}
              items={items.filter((i) => i.status === col.key)}
              onOpen={setSelected}
            />
          ))}
        </div>
        <DragOverlay>
          {activeItem && (
            <div className="w-[204px] rounded-[8px] border border-mint-600 bg-workspace p-3 shadow-lg">
              <CardContent item={activeItem} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Content Drawer */}
      <Drawer open={selected !== null} onOpenChange={(o) => !o && setSelected(null)}>
        <DrawerContent>
          {selected && (
            <>
              <DrawerHeader>
                <DrawerTitle>{selected.title}</DrawerTitle>
                <DrawerDescription>
                  {contentStatusLabel(selected.status)}
                </DrawerDescription>
              </DrawerHeader>

              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
                    人员
                  </p>
                  <p className="mt-1 text-ink-secondary">
                    负责人：{selected.ownerName ?? "未分配"}
                  </p>
                  <p className="text-ink-secondary">
                    审核人：{selected.reviewerName ?? "未分配"}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
                    生产进度
                  </p>
                  <p className="mt-1 text-ink-secondary">
                    简报：{" "}
                    {selected.briefStatus
                      ? briefStatusLabel(selected.briefStatus)
                      : "未开始"}{" "}
                    · 母稿：{selected.hasMaster ? "已创建" : "未开始"}
                  </p>
                  <div className="mt-1.5">
                    <PlatformChips platforms={selected.platforms} />
                  </div>
                </div>

                {selected.platforms.length > 0 &&
                  (selected.status === "scheduled" || selected.status === "published") && (
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
                      发布
                    </p>
                    <p className="mt-1 text-ink-secondary">
                      已发布 {selected.platforms.filter((p) => p.status === "published").length}
                      /{selected.platforms.length}
                    </p>
                    <div className="mt-1.5 space-y-1.5">
                      {selected.platforms.map((p) => (
                        <div
                          key={p.platform}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-ink-secondary">
                            {platformLabel(p.platform)}{" "}
                            <span className="text-ink-muted">
                              {versionStatusLabel(p.status)}
                            </span>
                          </span>
                          {p.status === "approved" &&
                            selected.status === "scheduled" && (
                            <button
                              className="font-medium text-mint-600 hover:underline"
                              onClick={() =>
                                setPubTarget({ item: selected, platform: p.platform })
                              }
                            >
                              标记已发布
                            </button>
                          )}
                        </div>
                      ))}
                      {selected.platforms.some((p) => p.publication) && (
                        <div className="mt-2 space-y-1 border-t border-border pt-2">
                          {selected.platforms
                            .filter((p) => p.publication)
                            .flatMap((p) =>
                              (["24h", "72h"] as Checkpoint[]).map((c) => {
                                const pub = p.publication!;
                                const has = c === "24h" ? pub.snapshot24h : pub.snapshot72h;
                                const st = checkpointStatus(pub.publishedAt, c, has);
                                return (
                                  <div
                                    key={`${p.platform}-${c}`}
                                    className="flex items-center justify-between text-xs"
                                  >
                                    <span className="text-ink-secondary">
                                      {platformLabel(p.platform)} {c}{" "}
                                      <span className="text-ink-muted">
                                        {st === "submitted"
                                          ? "已提交"
                                          : st === "due"
                                            ? `自 ${checkpointDueAt(pub.publishedAt, c).toLocaleString()} 起待录入`
                                            : "未到时间"}
                                      </span>
                                    </span>
                                    {st !== "not_due" && (
                                      <button
                                        className="font-medium text-mint-600 hover:underline"
                                        onClick={() =>
                                          setSnapTarget({
                                            publication: {
                                              id: pub.id,
                                              platform: p.platform,
                                              finalTitle: pub.finalTitle,
                                              publishedAt: pub.publishedAt,
                                            },
                                            checkpoint: c,
                                            existing: pub.snapshots?.[c] ?? null,
                                          })
                                        }
                                      >
                                        {st === "submitted" ? "编辑" : `录入 ${c} 数据`}
                                      </button>
                                    )}
                                  </div>
                                );
                              })
                            )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {(selected.deadlineAt || selected.scheduledAt) && (
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
                      日期
                    </p>
                    {selected.deadlineAt && (
                      <p className="mt-1 text-ink-secondary">
                        截止时间：{new Date(selected.deadlineAt).toLocaleString()}
                      </p>
                    )}
                    {selected.scheduledAt && (
                      <p className="text-ink-secondary">
                        待发布时间：{new Date(selected.scheduledAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                <Link href={`/app/studio/${selected.id}`}>
                  <Button variant="primary" size="sm" className="w-full">
                    <ExternalLink className="mr-1 h-3 w-3" />
                    在内容工作台打开
                  </Button>
                </Link>
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>

      {/* Shared Metric Snapshot modal (same domain action as Studio) */}
      {snapTarget && (
        <MetricSnapshotModal
          key={`${snapTarget.publication.id}:${snapTarget.checkpoint}`}
          open
          onOpenChange={(o) => !o && setSnapTarget(null)}
          publication={snapTarget.publication}
          checkpoint={snapTarget.checkpoint}
          mode={snapTarget.existing ? "edit" : "create"}
          existing={snapTarget.existing}
          onDone={() => {
            setSnapTarget(null);
            setSelected(null);
            load();
          }}
        />
      )}

      {/* Shared Mark as Published modal (same domain action as Studio) */}
      {pubTarget && (
        <PublicationModal
          open
          onOpenChange={(o) => !o && setPubTarget(null)}
          contentId={pubTarget.item.id}
          platform={pubTarget.platform}
          platformLabel={platformLabel(pubTarget.platform)}
          versionData={null}
          contentTitle={pubTarget.item.title}
          onDone={() => {
            setPubTarget(null);
            setSelected(null);
            load();
          }}
        />
      )}
    </div>
  );
}
