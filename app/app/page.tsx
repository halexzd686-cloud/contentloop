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
import { platformLabel, contentStatusLabel, testStatusLabel } from "@/lib/labels";

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
      if (!cRes.ok) throw new Error(c.error || "Failed to load contents");
      if (!aRes.ok) throw new Error(a.error || "Failed to load analytics");
      if (!tRes.ok) throw new Error(t.error || "Failed to load tests");
      setModel(
        buildHomeModel({
          contents: c.contents as HomeContentRow[],
          publications: a.publications as HomePublicationRow[],
          tests: t.tests as HomeTestRow[],
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
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
            Retry
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
          ContentLoop workspace
        </p>
        <div className="mt-2 flex items-baseline gap-4">
          <h1 className="text-[26px] font-semibold leading-tight">Home</h1>
          <span className="hidden h-5 w-px bg-border-strong sm:block" />
          <p className="font-serif text-lg italic text-ink-secondary">
            Close the loop.
          </p>
        </div>
      </div>

      {model.isEmpty ? (
        <div className="py-16 text-center">
          <p className="text-sm text-ink-secondary">
            ContentLoop turns signals into published content, real metrics and
            reusable learnings. Start the loop:
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/app/radar">
              <Button variant="primary" size="sm">
                Add Signal
              </Button>
            </Link>
            <Link href="/app/studio">
              <Button variant="secondary" size="sm">
                New Content
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 px-10 py-8 xl:grid-cols-5">
          {/* Primary: needs attention */}
          <section className="xl:col-span-3">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
              Needs Attention
            </h2>
            {!hasAttention ? (
              <p className="mt-3 rounded-[10px] border border-border bg-workspace px-5 py-4 text-sm text-ink-secondary">
                Nothing needs attention right now.
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
                          {platformLabel(d.platform)} · {d.checkpoint} metrics
                          due since {new Date(d.dueAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="flex shrink-0 items-center gap-1 text-[13px] font-medium text-mint-600">
                        Enter metrics <ArrowRight className="h-3.5 w-3.5" />
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
                          Waiting for review
                        </p>
                      </div>
                      <span className="flex shrink-0 items-center gap-1 text-[13px] font-medium text-mint-600">
                        Open Review <ArrowRight className="h-3.5 w-3.5" />
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
                  Continue Working
                </h2>
                <Link
                  href="/app/studio"
                  className="text-xs text-mint-600 hover:underline"
                >
                  View all
                </Link>
              </div>
              {model.continueWorking.length === 0 ? (
                <p className="mt-3 rounded-[10px] border border-border bg-workspace px-4 py-3 text-[13px] text-ink-secondary">
                  No content in production.{" "}
                  <Link href="/app/studio" className="text-mint-600 hover:underline">
                    New Content
                  </Link>{" "}
                  or select a signal in Radar.
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
                Monitoring
              </h2>
              {!hasMonitoring ? (
                <p className="mt-3 rounded-[10px] border border-border bg-workspace px-4 py-3 text-[13px] text-ink-secondary">
                  Nothing scheduled or running.
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
                      <Badge variant="default">Scheduled</Badge>
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
                        Test {testStatusLabel(t.status)}
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
