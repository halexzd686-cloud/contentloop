"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";

/**
 * Studio index — lightweight content list for the current Brand.
 * Detail workspace lives at /app/studio/[contentId].
 */

interface ContentListItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  ownerName: string | null;
  briefStatus: "draft" | "approved" | null;
  updatedAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  planning: "Planning",
  in_progress: "In Progress",
  review: "Review",
  scheduled: "Scheduled",
  published: "Published",
};

const STATUS_VARIANT: Record<string, "default" | "mint" | "warning" | "danger"> = {
  planning: "default",
  in_progress: "warning",
  review: "warning",
  scheduled: "default",
  published: "mint",
};

export default function StudioPage() {
  const [contents, setContents] = useState<ContentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/contents");
      if (!res.ok) throw new Error("Failed to load contents");
      const data = await res.json();
      setContents(data.contents);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contents");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/contents");
        if (!res.ok) throw new Error("Failed to load contents");
        const data = await res.json();
        if (!cancelled) setContents(data.contents);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load contents");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-workspace px-6 py-4">
        <h1 className="text-xl font-semibold text-ink-primary">Studio</h1>
        <p className="mt-0.5 text-sm text-ink-muted">
          Content creation workspace
        </p>
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
        ) : error ? (
          <div className="rounded-[10px] border border-danger/20 bg-danger/5 p-6 text-center">
            <p className="text-sm text-danger">{error}</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={load}>
              <RefreshCw className="mr-1 h-3 w-3" />
              Retry
            </Button>
          </div>
        ) : contents.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-ink-secondary">
              No content yet. Select a signal in Radar and create content from
              it.
            </p>
            <Link href="/app/radar">
              <Button variant="secondary" size="sm" className="mt-4">
                Go to Radar
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {contents.map((c) => (
              <Link key={c.id} href={`/app/studio/${c.id}`}>
                <Card className="transition-colors hover:border-border-strong">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-ink-primary">
                        {c.title}
                      </p>
                      <Badge variant={STATUS_VARIANT[c.status] || "default"}>
                        {STATUS_LABEL[c.status] || c.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-3 text-xs text-ink-muted">
                      {c.ownerName && <span>Owner: {c.ownerName}</span>}
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
    </div>
  );
}
