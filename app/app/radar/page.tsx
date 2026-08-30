"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { SignalCard } from "@/components/radar/signal-card";
import { AddSignalDialog } from "@/components/radar/add-signal-dialog";
import { SignalFilters } from "@/components/radar/signal-filters";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

/**
 * Radar Page — design.md §33
 * Layout: Signals Feed 65% | Quick Review 35%
 * Quick Review is empty placeholder for M1.1.
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
  createdAt: string;
}

export default function RadarPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Use a ref to track the latest fetch function without causing effect re-runs
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

  // Keep ref up to date
  useEffect(() => {
    fetchRef.current = fetchSignals;
  }, [fetchSignals]);

  // Initial fetch + refetch when filters change
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

    // Debounce search, immediate for filter changes
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

      // Update local state
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
              // Loading skeleton
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
              // Error state
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
              // Empty state
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm text-ink-secondary">
                  Add your first signal to start deciding what to create.
                </p>
                <div className="mt-4">
                  <AddSignalDialog onCreated={() => fetchRef.current()} />
                </div>
              </div>
            ) : (
              // Signal list
              signals.map((signal) => (
                <SignalCard
                  key={signal.id}
                  signal={signal}
                  onStatusChange={handleStatusChange}
                  updating={updatingId === signal.id}
                />
              ))
            )}
          </div>
        </div>

        {/* Quick Review — placeholder for M1.1 */}
        <div className="w-[35%] overflow-y-auto bg-workspace p-6">
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-ink-muted">
                Select a signal to review
              </p>
              <p className="mt-1 text-xs text-ink-faint">
                Quick Review will appear here
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
