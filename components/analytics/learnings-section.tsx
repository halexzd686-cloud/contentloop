"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";
import { platformLabel, testOutcomeLabel } from "@/lib/labels";

/**
 * Learnings list — M3.3, inside Analytics below Tests.
 * Read model + Studio navigation (M4.2). Apply/Dismiss mutations
 * live only in Studio (M3.4 frozen boundary).
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

export function LearningsSection() {
  const [learnings, setLearnings] = useState<LearningRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/learnings");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "运营经验加载失败");
      setLearnings(data.learnings);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
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
        <span className="text-sm font-semibold text-ink-primary">运营经验</span>
        <span className="text-xs text-ink-faint">{learnings.length}</span>
      </div>

      {error && <p className="px-4 py-2 text-xs text-danger">{error}</p>}

      {loaded && learnings.length === 0 ? (
        <p className="px-4 py-4 text-xs text-ink-faint">
          还没有运营经验。经验来自已完成的运营测试，由你保存后可复用。
        </p>
      ) : (
        <div className="divide-y divide-border">
          {learnings.map((l) => (
            <div key={l.id} className="px-4 py-3">
              <p className="text-sm text-ink-primary">{l.text}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-ink-muted">
                {l.platform && (
                  <span>{platformLabel(l.platform)}</span>
                )}
                {l.pillarName && <span>· {l.pillarName}</span>}
                {l.sourceTestTitle && (
                  <span>
                    · 来自测试：{l.sourceTestTitle}
                    {l.sourceTestOutcome ? `（${testOutcomeLabel(l.sourceTestOutcome)}）` : ""}
                  </span>
                )}
                {l.sourceStale && (
                  <Badge variant="warning">来源测试数据已变化</Badge>
                )}
                {l.appliedCount > 0 && (
                  <span>· 当前应用于 {l.appliedCount} 条内容</span>
                )}
              </div>
              {/* M4.2: navigation only — Studio (Brief tab) remains the
                  only Apply/Dismiss mutation surface. */}
              <Link
                href="/app/studio"
                className="mt-1.5 inline-block text-xs font-medium text-mint-600 hover:underline"
              >
                去内容工作台应用 →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
