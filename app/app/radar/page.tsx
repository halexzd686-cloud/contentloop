"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { SignalCard } from "@/components/radar/signal-card";
import { AddSignalDialog } from "@/components/radar/add-signal-dialog";
import { SignalFilters } from "@/components/radar/signal-filters";
import { QuickReview } from "@/components/radar/quick-review";
import { Button } from "@/components/ui/button";
import { FountainLoader } from "@/components/motion/fountain-loader";
import { DotTexture } from "@/components/reactbits/dot-texture";
import { RefreshCw } from "lucide-react";
import { NAV_LABELS } from "@/lib/labels";

/**
 * Radar Page — design.md §33
 * Layout: Signals Feed 65% | Quick Review 35%
 * M1.2A: Signal selection, Quick Review, Skip, Create Content.
 */

interface Signal {
  id: string;
  inputType: "url" | "idea";
  sourceUrl: string | null;
  sourceType: string | null;
  title: string;
  summary: string | null;
  publishedAt: string | null;
  status: "new" | "reviewing" | "selected" | "skipped";
  topicScore: number | null;
  audienceFitScore: number | null;
  timingScore: number | null;
  contentPotentialScore: number | null;
  whyItMatters: string | null;
  audienceMatch: string | null;
  contentRisk: string | null;
  possibleAngles: string[] | null;
  analysisConfidence: string | null;
  analysisEvidence: {
    claim: string;
    source: "signal_input" | "brand_context" | "model_inference";
  }[] | null;
  analyzedAt: string | null;
  skipReason: string | null;
  selectedAngle: string | null;
  primaryPlatform: string | null;
  ownerId: string | null;
  contentId: string | null;
  createdAt: string;
}

export default function RadarPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);

  const fetchRef = useRef<() => Promise<void>>(async () => {});

  const fetchSignals = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/signals?${params.toString()}`);
      if (!res.ok) throw new Error("线索加载失败");

      const data = await res.json();
      setSignals(data.signals);
    } catch (err) {
      setError(err instanceof Error ? err.message : "线索加载失败");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    fetchRef.current = fetchSignals;
  }, [fetchSignals]);

  useEffect(() => {
    let cancelled = false;

    const doFetch = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (statusFilter) params.set("status", statusFilter);
        if (search) params.set("search", search);

        const res = await fetch(`/api/signals?${params.toString()}`);
        if (!res.ok) throw new Error("线索加载失败");
        if (cancelled) return;

        const data = await res.json();
        setSignals(data.signals);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "线索加载失败"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const timer = setTimeout(doFetch, search ? 300 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [statusFilter, search]);

  async function handleStatusChange(id: string, status: "new" | "reviewing") {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/signals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) throw new Error("状态更新失败");

      setSignals((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status } : s))
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "线索状态更新失败"
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleSkip(id: string, reason: string) {
    const res = await fetch(`/api/signals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "skipped", skipReason: reason }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "跳过线索失败");
    }

    // Refetch to get updated data
    await fetchRef.current();
  }

  async function handleCreateContent(
    id: string,
    data: { primaryPlatform: string; selectedAngle: string; ownerId: string }
  ): Promise<string | null> {
    const res = await fetch(`/api/signals/${id}/create-content`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || "创建内容失败");
    }

    const result = await res.json();

    // Refetch to get updated signal status
    await fetchRef.current();

    return result.content?.id || null;
  }

  async function handleAnalyze(id: string) {
    const res = await fetch(`/api/signals/${id}/analyze`, {
      method: "POST",
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || "AI 分析线索失败");
    }

    // Refetch to get persisted analysis
    await fetchRef.current();
  }

  const selectedSignal = signals.find((s) => s.id === selectedSignalId) || null;

  // Compute counts for filter tabs
  const counts: Record<string, number> = { total: signals.length };
  for (const s of signals) {
    counts[s.status] = (counts[s.status] || 0) + 1;
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header: title + real status summary + add */}
      <div
        className="flex items-end justify-between px-8 pb-[18px] pt-6"
        style={{ borderBottom: "1px solid rgba(200,201,203,0.65)" }}
      >
        <div>
          <h1 className="text-[24px] font-semibold leading-tight text-ink-primary">
            {NAV_LABELS.radar}
          </h1>
          <p className="mt-1.5 text-[12.5px]" style={{ color: "#626660" }}>
            {counts.total || 0} 条线索 · {counts.selected || 0} 条已选用 ·{" "}
            {(counts.new || 0) + (counts.reviewing || 0)} 条待评估
          </p>
        </div>
        <AddSignalDialog onCreated={() => fetchRef.current()} />
      </div>

      {/* Main content: 55% Research Index + 45% Review Sheet */}
      <div className="flex flex-1 overflow-hidden">
        {/* Signals Feed */}
        <div
          className="w-[55%] overflow-y-auto px-6 py-4"
          style={{ borderRight: "1px solid rgba(200,201,203,0.65)" }}
        >
          <SignalFilters
            activeStatus={statusFilter}
            onStatusChange={setStatusFilter}
            search={search}
            onSearchChange={setSearch}
            counts={counts}
          />

          <div className="mt-1">
            {loading && signals.length === 0 ? (
              // M7: fountain transition indicator (喷泉动效 + 页面名)
              <div className="flex min-h-[40vh] items-center justify-center">
                <FountainLoader size={30} label="正在加载选题雷达" />
              </div>
            ) : error ? (
              <div className="mt-4 rounded-[10px] border border-danger/20 bg-danger/5 p-6 text-center">
                <p className="text-sm text-danger">{error}</p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => fetchRef.current()}
                >
                  <RefreshCw className="mr-1 h-3 w-3" />
                  重试
                </Button>
              </div>
            ) : signals.length === 0 ? (
              <div className="relative flex flex-col items-center justify-center overflow-hidden py-16 text-center">
                {/* M4.4: single restrained DotTexture placement —
                    editorial accent for the discovery surface. Static
                    under prefers-reduced-motion. */}
                <DotTexture className="pointer-events-none absolute inset-x-8 top-2 h-24" />
                <p className="relative text-sm text-ink-secondary">
                  还没有线索。添加第一条线索，开始判断什么值得做。
                </p>
                <div className="relative mt-4">
                  <AddSignalDialog onCreated={() => fetchRef.current()} />
                </div>
              </div>
            ) : (
              signals.map((signal, i) => (
                <SignalCard
                  key={signal.id}
                  signal={signal}
                  index={i + 1}
                  onStatusChange={handleStatusChange}
                  updating={updatingId === signal.id}
                  selected={selectedSignalId === signal.id}
                  onSelect={setSelectedSignalId}
                />
              ))
            )}
          </div>
        </div>

        {/* Review Sheet */}
        <div className="w-[45%] overflow-y-auto bg-workspace">
          <QuickReview
            signal={selectedSignal}
            onSkip={handleSkip}
            onCreateContent={handleCreateContent}
            onAnalyze={handleAnalyze}
            onClose={() => setSelectedSignalId(null)}
          />
        </div>
      </div>
    </div>
  );
}
