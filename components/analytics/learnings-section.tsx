"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { platformLabel, testOutcomeLabel } from "@/lib/labels";
import {
  HAIRLINE,
  RULE,
  INK_FUNCTIONAL,
  SURFACE,
  Sec,
  StatusDot,
} from "@/components/analytics/ledger";

/**
 * Learnings list — M3.3, inside Analytics below Tests.
 * Read model + Studio navigation (M4.2). Apply/Dismiss mutations
 * live only in Studio (M3.4 frozen boundary).
 *
 * M8-B3: presentation aligned to the M7 ledger language — hairline
 * rows instead of the M5.6 card shell; status as text + dot, no Badge.
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
    <div className="mt-10">
      <Sec
        title="运营经验"
        note={loaded ? `${learnings.length} 条` : undefined}
        gold
      />

      {error && <p className="py-2 text-xs text-danger">{error}</p>}

      {loaded && learnings.length === 0 ? (
        <div
          className="mt-2 rounded-[5px] px-6 py-6 text-center"
          style={{ background: SURFACE, border: "1px dashed var(--cl-silver)" }}
        >
          <p className="text-xs" style={{ color: INK_FUNCTIONAL }}>
            还没有运营经验。经验来自已完成的运营测试，由你保存后可复用。
          </p>
        </div>
      ) : (
        <div className="mt-1" style={{ borderTop: RULE }}>
          {learnings.map((l) => (
            <div
              key={l.id}
              className="px-1 py-3"
              style={{ borderBottom: HAIRLINE }}
            >
              <p className="text-[13.5px] text-ink-primary">{l.text}</p>
              <div
                className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs"
                style={{ color: INK_FUNCTIONAL }}
              >
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
                  <span className="inline-flex items-center gap-1.5">
                    · <StatusDot gold />
                    来源测试数据已变化
                  </span>
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
