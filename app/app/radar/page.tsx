"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { SignalCard } from "@/components/radar/signal-card";
import { AddSignalDialog } from "@/components/radar/add-signal-dialog";
import { SignalFilters } from "@/components/radar/signal-filters";
import { QuickReview } from "@/components/radar/quick-review";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

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
      if (!res.ok) throw new Error("Failed to fetch signals");

      const data = await res.json();
      setSignals(data.signals);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load signals");
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
        if (!res.ok) throw new Error("Failed to fetch signals");
        if (cancelled) return;

        const data = await res.json();
        setSignals(data.signals);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load signals"
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

      if (!res.ok) throw new Error("Failed to update status");

      setSignals((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status } : s))
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update signal status"
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
      throw new Error(data.error || "Failed to skip signal");
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
      throw new Error(errData.error || "Failed to create content");
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
      throw new Error(errData.error || "Failed to analyze signal");
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
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-workspace px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-ink-primary">Radar</h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            What&apos;s worth creating?
          </p>
        </div>
        <AddSignalDialog onCreated={() => fetchRef.current()} />
      </div>

      {/* Main content: 65% Feed + 35% Quick Review */}
      <div className="flex flex-1 overflow-hidden">
        {/* Signals Feed */}
        <div className="w-[65%] overflow-y-auto border-r border-border p-6">
          <SignalFilters
            activeStatus={statusFilter}
            onStatusChange={setStatusFilter}
            search={search}
            onSearchChange={setSearch}
            counts={counts}
          />

          <div className="mt-4 space-y-3">
            {loading && signals.length === 0 ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-[10px] border border-border bg-workspace p-5"
                >
                  <div className="mb-2 h-3 w-24 rounded bg-surface-subtle" />
                  <div className="mb-2 h-4 w-3/4 rounded bg-surface-subtle" />
                  <div className="h-3 w-full rounded bg-surface-subtle" />
                </div>
              ))
            ) : error ? (
              <div className="rounded-[10px] border border-danger/20 bg-danger/5 p-6 text-center">
                <p className="text-sm text-danger">{error}</p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => fetchRef.current()}
                >
                  <RefreshCw className="mr-1 h-3 w-3" />
                  Retry
                </Button>
              </div>
            ) : signals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm text-ink-secondary">
                  Add your first signal to start deciding what to create.
                </p>
                <div className="mt-4">
                  <AddSignalDialog onCreated={() => fetchRef.current()} />
                </div>
              </div>
            ) : (
              signals.map((signal) => (
                <SignalCard
                  key={signal.id}
                  signal={signal}
                  onStatusChange={handleStatusChange}
                  updating={updatingId === signal.id}
                  selected={selectedSignalId === signal.id}
                  onSelect={setSelectedSignalId}
                />
              ))
            )}
          </div>
        </div>

        {/* Quick Review */}
        <div className="w-[35%] overflow-y-auto bg-workspace p-6">
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
