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
import { platformLabel } from "@/lib/labels";

/**
 * Home — M4.2 daily entry surface.
 *
 * Navigation only: every card links to an existing authoritative
 * surface (Analytics / Studio). Zero mutation, zero AI. Sections are
 * derived from the current server state on every load — nothing here
 * depends on transient success state.
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
      <div className="p-8">
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
      <div className="p-8">
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
    <div className="h-full overflow-y-auto p-8">
      <h1 className="text-xl font-semibold text-ink-primary">Home</h1>
      <p className="mt-0.5 text-sm text-ink-muted">
        What needs attention, and where to continue.
      </p>

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
        <div className="mt-6 max-w-3xl space-y-8">
          {/* Needs Attention */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Needs Attention
            </h2>
            {!hasAttention ? (
              <p className="mt-2 text-sm text-ink-faint">
                Nothing needs attention right now.
              </p>
            ) : (
              <div className="mt-2 divide-y divide-border rounded-[8px] border border-border bg-workspace">
                {model.dueMetrics.map((d) => (
                  <Link
                    key={`${d.publicationId}:${d.checkpoint}`}
                    href="/app/analytics"
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-canvas"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-primary">
                        {d.finalTitle}
                      </p>
                      <p className="text-xs text-ink-muted">
                        {platformLabel(d.platform)} · {d.checkpoint}{" "}
                        metrics due since {new Date(d.dueAt).toLocaleString()}
                      </p>
                    </div>
                    <span className="ml-3 flex shrink-0 items-center text-xs font-medium text-mint-600">
                      Enter metrics
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </span>
                  </Link>
                ))}
                {model.reviewContents.map((c) => (
                  <Link
                    key={c.id}
                    href={`/app/studio/${c.id}`}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-canvas"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-primary">
                        {c.title}
                      </p>
                      <p className="text-xs text-ink-muted">Waiting for review</p>
                    </div>
                    <span className="ml-3 flex shrink-0 items-center text-xs font-medium text-mint-600">
                      Open Review
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Continue Working */}
          <section>
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
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
              <p className="mt-2 text-sm text-ink-faint">
                No content in production.{" "}
                <Link href="/app/studio" className="text-mint-600 hover:underline">
                  New Content
                </Link>{" "}
                or select a signal in Radar.
              </p>
            ) : (
              <div className="mt-2 divide-y divide-border rounded-[8px] border border-border bg-workspace">
                {model.continueWorking.map((c) => (
                  <Link
                    key={c.id}
                    href={`/app/studio/${c.id}`}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-canvas"
                  >
                    <p className="min-w-0 truncate text-sm font-medium text-ink-primary">
                      {c.title}
                    </p>
                    <Badge variant={c.status === "in_progress" ? "warning" : "default"}>
                      {c.status === "in_progress" ? "In Progress" : "Planning"}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Monitoring */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Monitoring
            </h2>
            {!hasMonitoring ? (
              <p className="mt-2 text-sm text-ink-faint">
                Nothing scheduled or running.
              </p>
            ) : (
              <div className="mt-2 divide-y divide-border rounded-[8px] border border-border bg-workspace">
                {model.scheduledContents.map((c) => (
                  <Link
                    key={c.id}
                    href={`/app/studio/${c.id}`}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-canvas"
                  >
                    <p className="min-w-0 truncate text-sm font-medium text-ink-primary">
                      {c.title}
                    </p>
                    <Badge variant="default">Scheduled</Badge>
                  </Link>
                ))}
                {model.runningTests.map((t) => (
                  <Link
                    key={t.id}
                    href="/app/analytics"
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-canvas"
                  >
                    <p className="min-w-0 truncate text-sm font-medium text-ink-primary">
                      {t.title}
                    </p>
                    <Badge variant="warning">Test running</Badge>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
