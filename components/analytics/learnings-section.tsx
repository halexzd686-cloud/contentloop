"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";

/**
 * Learnings list — M3.3, inside Analytics below Tests.
 * Lightweight read model only; application links arrive in M3.4.
 */

interface LearningRow {
  id: string;
  text: string;
  platform: string | null;
  pillarName: string | null;
  sourceTestTitle: string | null;
  sourceTestOutcome: string | null;
  sourceStale: boolean;
  appliedCount: number;
  createdAt: string;
}

const PLATFORM_LABEL: Record<string, string> = {
  xiaohongshu: "Xiaohongshu",
  bilibili: "Bilibili",
  douyin: "Douyin",
};

export function LearningsSection() {
  const [learnings, setLearnings] = useState<LearningRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/learnings");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load learnings");
      setLearnings(data.learnings);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="mt-4 rounded-[8px] border border-border bg-workspace">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <BookOpen className="h-4 w-4 text-ink-muted" />
        <span className="text-sm font-semibold text-ink-primary">Learnings</span>
        <span className="text-xs text-ink-faint">{learnings.length}</span>
      </div>

      {error && <p className="px-4 py-2 text-xs text-danger">{error}</p>}

      {loaded && learnings.length === 0 ? (
        <p className="px-4 py-4 text-xs text-ink-faint">
          No learnings yet. Conclude a test, then save what should be reused.
        </p>
      ) : (
        <div className="divide-y divide-border">
          {learnings.map((l) => (
            <div key={l.id} className="px-4 py-3">
              <p className="text-sm text-ink-primary">{l.text}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-ink-muted">
                {l.platform && (
                  <span>{PLATFORM_LABEL[l.platform] ?? l.platform}</span>
                )}
                {l.pillarName && <span>· {l.pillarName}</span>}
                {l.sourceTestTitle && (
                  <span>
                    · from test: {l.sourceTestTitle}
                    {l.sourceTestOutcome ? ` (${l.sourceTestOutcome})` : ""}
                  </span>
                )}
                {l.sourceStale && (
                  <Badge variant="warning">source test data changed</Badge>
                )}
                {l.appliedCount > 0 && (
                  <span>· currently applied to {l.appliedCount} content{l.appliedCount === 1 ? "" : "s"}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
