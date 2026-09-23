"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FountainLoader } from "@/components/motion/fountain-loader";
import { Badge } from "@/components/ui/badge";
import { NodeArrow } from "@/components/ui/node-arrow";
import { RefreshCw } from "lucide-react";
import {
  buildHomeModel,
  type HomeContentRow,
  type HomePublicationRow,
  type HomeTestRow,
  type HomeModel,
} from "@/lib/home";
import {
  platformLabel,
  contentStatusLabel,
  testStatusLabel,
  NAV_LABELS,
} from "@/lib/labels";

/**
 * Home — M7 P3: Today Desk with Index Tabs.
 *
 * 待处理 / 继续创作 / 跟进中 switch via text tabs (2px primary
 * underline, same language as Radar's status filter). Data layer
 * unchanged: dueMetrics / reviewContents / continueWorking /
 * scheduledContents / runningTests from buildHomeModel.
 * Trajectory actions (NodeArrow) only where a real next stage
 * exists: 录入数据 / 去审核 / 继续编辑. Header carries only 首页 —
 * no eyebrow, slogan, greeting or KPI wall.
 */

type TabKey = "attention" | "continue" | "monitoring";

export default function HomePage() {
  const [model, setModel] = useState<HomeModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("attention");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cRes, aRes, tRes] = await Promise.all([
        fetch("/api/contents"),
        fetch("/api/analytics"),
        fetch("/api/tests"),
      ]);
      const [c, a, t] = await Promise.all([
        cRes.json(),
        aRes.json(),
        tRes.json(),
      ]);
      if (!cRes.ok) throw new Error(c.error || "内容加载失败");
      if (!aRes.ok) throw new Error(a.error || "数据加载失败");
      if (!tRes.ok) throw new Error(t.error || "测试加载失败");
      setModel(
        buildHomeModel({
          contents: c.contents as HomeContentRow[],
          publications: a.publications as HomePublicationRow[],
          tests: t.tests as HomeTestRow[],
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  if (loading && !model) {
    // M7: fountain transition indicator (喷泉动效 + 页面名)
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center">
        <FountainLoader size={30} label="正在加载首页" />
      </div>
    );
  }

  if (error && !model) {
    return (
      <div className="p-10">
        <div className="rounded-[10px] border border-danger/20 bg-danger/5 p-6 text-center">
          <p className="text-sm text-danger">{error}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={load}>
            <RefreshCw className="mr-1 h-3 w-3" />
            重试
          </Button>
        </div>
      </div>
    );
  }

  if (!model) return null;

  const attentionCount = model.dueMetrics.length + model.reviewContents.length;
  const monitoringCount =
    model.scheduledContents.length + model.runningTests.length;

  const tabs: { key: TabKey; label: string; n: number }[] = [
    { key: "attention", label: "待处理", n: attentionCount },
    { key: "continue", label: "继续创作", n: model.continueWorking.length },
    { key: "monitoring", label: "跟进中", n: monitoringCount },
  ];

  const dueRows = [
    ...model.dueMetrics.map((d) => ({
      key: `${d.publicationId}:${d.checkpoint}`,
      href: `/app/analytics?publication=${d.publicationId}&checkpoint=${d.checkpoint}`,
      title: d.finalTitle,
      meta: `${platformLabel(d.platform)} · ${d.checkpoint} 数据自 ${new Date(
        d.dueAt
      ).toLocaleDateString()} 起待录入`,
      action: "录入数据",
    })),
    ...model.reviewContents.map((c) => ({
      key: c.id,
      href: `/app/studio/${c.id}`,
      title: c.title,
      meta: "等待审核",
      action: "去审核",
    })),
  ];

  return (
    <div className="h-full overflow-y-auto">
      {/* Header: only 首页 */}
      <div className="px-10 pb-2 pt-8">
        <h1 className="text-[26px] font-semibold leading-tight">
          {NAV_LABELS.home}
        </h1>
      </div>

      {model.isEmpty ? (
        <div className="py-16 text-center">
          <p className="text-sm text-ink-secondary">
            ContentLoop 把选题线索变成已发布的内容、真实数据和可复用的运营经验。开始这个循环：
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/app/radar">
              <Button variant="primary" size="sm">
                添加线索
              </Button>
            </Link>
            <Link href="/app/studio">
              <Button variant="secondary" size="sm">
                新建内容
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="px-10 pb-10">
          {/* Index Tabs */}
          <div
            className="mt-4 flex gap-6"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            {tabs.map((t) => {
              const on = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className="relative pb-2 text-[13px]"
                  style={{
                    color: on ? "var(--cl-ink-strong)" : "var(--cl-neutral)",
                    fontWeight: on ? 600 : 400,
                  }}
                >
                  {t.label}
                  <span
                    className="ml-[3px] text-[11px] tabular-nums"
                    style={{ color: "var(--ink-muted)" }}
                  >
                    {t.n}
                  </span>
                  {on && (
                    <span
                      className="absolute inset-x-0 bottom-0 h-[2px]"
                      style={{ background: "var(--cl-primary)" }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* 待处理: numbered operational rows */}
          {tab === "attention" &&
            (dueRows.length === 0 ? (
              <p className="py-8 text-sm text-ink-secondary">
                现在没有待处理事项。
              </p>
            ) : (
              <div>
                {dueRows.map((r, i) => (
                  <Link
                    key={r.key}
                    href={r.href}
                    className="flex items-center gap-[18px] px-2.5 py-[15px] transition-colors duration-150 hover:bg-[var(--mint-tint)]"
                    style={{ borderBottom: "1px solid var(--border-hairline)" }}
                  >
                    <span
                      className="w-[22px] shrink-0 text-[15px]"
                      style={{
                        fontFamily: "var(--font-cormorant), serif",
                        color: "var(--ink-muted)",
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-semibold">
                        {r.title}
                      </div>
                      <div className="mt-1 text-xs" style={{ color: "var(--cl-neutral)" }}>
                        {r.meta}
                      </div>
                    </div>
                    <span
                      className="flex shrink-0 items-center gap-2.5 text-[13px] font-medium"
                      style={{ color: "var(--cl-primary-strong)" }}
                    >
                      <NodeArrow />
                      {r.action}
                    </span>
                  </Link>
                ))}
              </div>
            ))}

          {/* 继续创作: DraftStrip — 2px primary left rail, no card */}
          {tab === "continue" &&
            (model.continueWorking.length === 0 ? (
              <p className="py-8 text-sm text-ink-secondary">
                暂无制作中的内容。{" "}
                <Link href="/app/studio" className="text-mint-600 hover:underline">
                  新建内容
                </Link>{" "}
                或{" "}
                <Link href="/app/radar" className="text-mint-600 hover:underline">
                  去选题雷达选用线索
                </Link>
                。
              </p>
            ) : (
              <div className="space-y-4 py-5">
                {model.continueWorking.map((c) => (
                  <div
                    key={c.id}
                    className="py-4 pl-[18px]"
                    style={{ borderLeft: "2px solid var(--cl-primary)" }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="truncate text-[16px] font-semibold">
                        {c.title}
                      </div>
                      <Badge
                        variant={c.status === "in_progress" ? "warning" : "default"}
                      >
                        {contentStatusLabel(c.status)}
                      </Badge>
                    </div>
                    <div className="mt-4">
                      <Link
                        href={`/app/studio/${c.id}`}
                        className="inline-flex items-center gap-2.5 text-[13px] font-medium"
                        style={{ color: "var(--cl-primary-strong)" }}
                      >
                        <NodeArrow />
                        继续编辑
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ))}

          {/* 跟进中: monitoring rows, no trajectory actions */}
          {tab === "monitoring" &&
            (monitoringCount === 0 ? (
              <p className="py-8 text-sm text-ink-secondary">
                暂无待发布或进行中的内容。
              </p>
            ) : (
              <div>
                {model.scheduledContents.map((c) => (
                  <Link
                    key={c.id}
                    href={`/app/studio/${c.id}`}
                    className="flex items-center justify-between gap-4 px-2.5 py-3 transition-colors duration-150 hover:bg-[var(--mint-tint)]"
                    style={{ borderBottom: "1px solid var(--border-hairline)" }}
                  >
                    <span className="min-w-0 truncate text-[14px] font-medium">
                      {c.title}
                    </span>
                    <Badge variant="default" className="shrink-0 whitespace-nowrap">
                      待发布
                    </Badge>
                  </Link>
                ))}
                {model.runningTests.map((t) => (
                  <Link
                    key={t.id}
                    href="/app/analytics"
                    className="flex items-center justify-between gap-4 px-2.5 py-3 transition-colors duration-150 hover:bg-[var(--mint-tint)]"
                    style={{ borderBottom: "1px solid var(--border-hairline)" }}
                  >
                    <span className="min-w-0 truncate text-[14px] font-medium">
                      {t.title}
                    </span>
                    <Badge variant="warning" className="shrink-0 whitespace-nowrap">
                      测试{testStatusLabel(t.status)}
                    </Badge>
                  </Link>
                ))}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
