"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, ArrowRight } from "lucide-react";
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
  HOME_SECTIONS,
  HOME_THESIS,
} from "@/lib/labels";

/**
 * Home — M5.6 visual pass: H2 static composition.
 *
 * Work-first dashboard: Needs Attention / Continue Working /
 * Monitoring. Static serif thesis (no motion). Mint left edge =
 * actionable-now (existing due/review semantics only). Navigation
 * only — every card links to an existing authoritative surface.
 */

export default function HomePage() {
  const [model, setModel] = useState<HomeModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    return (
      <div className="p-10">
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-[10px] border border-border bg-workspace p-5"
            >
              <div className="mb-2 h-4 w-1/3 rounded bg-surface-subtle" />
              <div className="h-3 w-1/5 rounded bg-surface-subtle" />
            </div>
          ))}
        </div>
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

  const hasAttention =
    model.dueMetrics.length > 0 || model.reviewContents.length > 0;
  const hasMonitoring =
    model.scheduledContents.length > 0 || model.runningTests.length > 0;

  return (
    <div className="h-full overflow-y-auto">
      {/* Header: eyebrow + strong title + static serif thesis in the
          heading group (product thesis, not a watermark). */}
      <div className="border-b border-border px-10 pb-6 pt-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
          工作区
        </p>
        <div className="mt-2 flex items-baseline gap-4">
          <h1 className="text-[26px] font-semibold leading-tight">{NAV_LABELS.home}</h1>
          <span className="hidden h-5 w-px bg-border-strong sm:block" />
          <p className="font-serif text-lg italic text-ink-secondary">
            {HOME_THESIS}
          </p>
        </div>
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
        <div className="grid grid-cols-1 gap-6 px-10 py-8 xl:grid-cols-5">
          {/* Primary: needs attention */}
          <section className="xl:col-span-3">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
              {HOME_SECTIONS.needsAttention}
            </h2>
            {!hasAttention ? (
              <p className="mt-3 rounded-[10px] border border-border bg-workspace px-5 py-4 text-sm text-ink-secondary">
                现在没有待处理事项。
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {model.dueMetrics.map((d) => (
                  <Link
                    key={`${d.publicationId}:${d.checkpoint}`}
                    href={`/app/analytics?publication=${d.publicationId}&checkpoint=${d.checkpoint}`}
                    className="block rounded-[10px] border border-border border-l-2 border-l-mint-600 bg-workspace px-5 py-4 transition-colors hover:border-border-strong"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-medium">
                          {d.finalTitle}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-secondary">
                          {platformLabel(d.platform)} · {d.checkpoint} 数据自{" "}
                          {new Date(d.dueAt).toLocaleDateString()} 起待录入
                        </p>
                      </div>
                      <span className="flex shrink-0 items-center gap-1 text-[13px] font-medium text-mint-600">
                        录入数据 <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </Link>
                ))}
                {model.reviewContents.map((c) => (
                  <Link
                    key={c.id}
                    href={`/app/studio/${c.id}`}
                    className="block rounded-[10px] border border-border border-l-2 border-l-mint-600 bg-workspace px-5 py-4 transition-colors hover:border-border-strong"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-medium">
                          {c.title}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-secondary">
                          等待审核
                        </p>
                      </div>
                      <span className="flex shrink-0 items-center gap-1 text-[13px] font-medium text-mint-600">
                        去审核 <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Secondary column */}
          <div className="space-y-8 xl:col-span-2">
            <section>
              <div className="flex items-baseline justify-between">
                <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
                  {HOME_SECTIONS.continueWorking}
                </h2>
                <Link
                  href="/app/studio"
                  className="text-xs text-mint-600 hover:underline"
                >
                  查看全部
                </Link>
              </div>
              {model.continueWorking.length === 0 ? (
                <p className="mt-3 rounded-[10px] border border-border bg-workspace px-4 py-3 text-[13px] text-ink-secondary">
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
                <div className="mt-3 divide-y divide-border rounded-[10px] border border-border bg-workspace">
                  {model.continueWorking.map((c) => (
                    <Link
                      key={c.id}
                      href={`/app/studio/${c.id}`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-canvas"
                    >
                      <p className="min-w-0 truncate text-sm font-medium">
                        {c.title}
                      </p>
                      <Badge variant={c.status === "in_progress" ? "warning" : "default"}>
                        {contentStatusLabel(c.status)}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
                {HOME_SECTIONS.monitoring}
              </h2>
              {!hasMonitoring ? (
                <p className="mt-3 rounded-[10px] border border-border bg-workspace px-4 py-3 text-[13px] text-ink-secondary">
                  暂无待发布或进行中的内容。
                </p>
              ) : (
                <div className="mt-3 divide-y divide-border rounded-[10px] border border-border bg-workspace">
                  {model.scheduledContents.map((c) => (
                    <Link
                      key={c.id}
                      href={`/app/studio/${c.id}`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-canvas"
                    >
                      <p className="min-w-0 truncate text-sm font-medium">
                        {c.title}
                      </p>
                      <Badge variant="default">待发布</Badge>
                    </Link>
                  ))}
                  {model.runningTests.map((t) => (
                    <Link
                      key={t.id}
                      href="/app/analytics"
                      className="flex items-center justify-between px-4 py-3 hover:bg-canvas"
                    >
                      <p className="min-w-0 truncate text-sm font-medium">
                        {t.title}
                      </p>
                      <Badge variant="warning">
                        测试{testStatusLabel(t.status)}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
