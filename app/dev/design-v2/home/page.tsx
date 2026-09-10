"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { ProtoShell } from "../shell";
import {
  buildHomeModel,
  type HomeContentRow,
  type HomePublicationRow,
  type HomeTestRow,
  type HomeModel,
} from "@/lib/home";
import { platformLabel, testStatusLabel, contentStatusLabel } from "@/lib/labels";

/**
 * M5.6 Phase 1 — Home V2 prototype (H2 static direction).
 *
 * Composition over motion: static serif loop statement, deliberate
 * horizontal use (no max-w-3xl clustering), mint edge = actionable-now
 * semantics only (existing due/review states — nothing invented).
 * Read-only: same three production endpoints as real Home.
 */

export default function HomeV2() {
  const [model, setModel] = useState<HomeModel | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [c, a, t] = await Promise.all([
      fetch("/api/contents").then((r) => r.json()),
      fetch("/api/analytics").then((r) => r.json()),
      fetch("/api/tests").then((r) => r.json()),
    ]);
    setModel(
      buildHomeModel({
        contents: c.contents as HomeContentRow[],
        publications: a.publications as HomePublicationRow[],
        tests: t.tests as HomeTestRow[],
      })
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  if (loading || !model) {
    return (
      <ProtoShell active="home">
        <div className="p-8 text-sm text-ink-muted">Loading…</div>
      </ProtoShell>
    );
  }

  return (
    <ProtoShell active="home">
      {/* Header composition: quiet eyebrow + strong title + static
          serif thesis. No motion. */}
      <div className="border-b border-border px-10 pb-6 pt-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
          ContentLoop workspace
        </p>
        <div className="mt-2 flex items-baseline justify-between gap-6">
          <h1 className="text-[26px] font-semibold leading-tight">Home</h1>
          <p className="font-serif text-lg italic text-ink-secondary">
            Close the loop.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 px-10 py-8 xl:grid-cols-5">
        {/* Primary: needs attention */}
        <section className="xl:col-span-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
            Needs attention
          </h2>
          {model.dueMetrics.length === 0 && model.reviewContents.length === 0 ? (
            <p className="mt-3 rounded-[10px] border border-border bg-workspace px-5 py-4 text-sm text-ink-secondary">
              Nothing needs attention right now.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {model.dueMetrics.map((d) => (
                <div
                  key={`${d.publicationId}:${d.checkpoint}`}
                  className="rounded-[10px] border border-border border-l-2 border-l-mint-600 bg-workspace px-5 py-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-medium">
                        {d.finalTitle}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-secondary">
                        {platformLabel(d.platform)} · {d.checkpoint} metrics due
                        since {new Date(d.dueAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-[13px] font-medium text-mint-600">
                      Enter metrics <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              ))}
              {model.reviewContents.map((c) => (
                <div
                  key={c.id}
                  className="rounded-[10px] border border-border border-l-2 border-l-mint-600 bg-workspace px-5 py-4"
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
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Secondary column */}
        <div className="space-y-8 xl:col-span-2">
          <section>
            <div className="flex items-baseline justify-between">
              <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
                Continue working
              </h2>
              <span className="text-xs text-mint-600">View all</span>
            </div>
            {model.continueWorking.length === 0 ? (
              <p className="mt-3 rounded-[10px] border border-border bg-workspace px-4 py-3 text-[13px] text-ink-secondary">
                No content in production.
              </p>
            ) : (
              <div className="mt-3 divide-y divide-border rounded-[10px] border border-border bg-workspace">
                {model.continueWorking.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <p className="min-w-0 truncate text-sm font-medium">
                      {c.title}
                    </p>
                    <Badge variant={c.status === "in_progress" ? "warning" : "default"}>
                      {contentStatusLabel(c.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
              Monitoring
            </h2>
            {model.scheduledContents.length === 0 && model.runningTests.length === 0 ? (
              <p className="mt-3 rounded-[10px] border border-border bg-workspace px-4 py-3 text-[13px] text-ink-secondary">
                Nothing scheduled or running.
              </p>
            ) : (
              <div className="mt-3 divide-y divide-border rounded-[10px] border border-border bg-workspace">
                {model.scheduledContents.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <p className="min-w-0 truncate text-sm font-medium">
                      {c.title}
                    </p>
                    <Badge variant="default">Scheduled</Badge>
                  </div>
                ))}
                {model.runningTests.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <p className="min-w-0 truncate text-sm font-medium">
                      {t.title}
                    </p>
                    <Badge variant="warning">{testStatusLabel(t.status)} running</Badge>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </ProtoShell>
  );
}
