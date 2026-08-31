/**
 * Serialized save queue with local revision guard — M1.4
 *
 * Rules (frozen):
 * - Every save sends the FULL latest state (last-write-wins at DB level).
 * - Writes are serialized: if a change arrives while a request is in
 *   flight, the latest state is sent immediately after it completes.
 * - A stale response never rolls back newer local state: onSuccess is
 *   only invoked when the acknowledged revision is the latest.
 */

export type SaveQueueState = "idle" | "pending" | "saving" | "saved" | "failed";

export interface SaveQueue<T> {
  /** Enqueue the latest snapshot. Serializes writes; latest wins. */
  enqueue(snapshot: T): void;
  /** Re-send the latest snapshot after a failure. */
  retry(): void;
  /** Current monotonically increasing local revision. */
  revision(): number;
  /**
   * Wait until all queued work has been persisted.
   * Resolves true when everything is saved; false if a save failed
   * (the failed snapshot stays queued for retry).
   */
  flush(): Promise<boolean>;
}

export function createSaveQueue<T>(
  send: (snapshot: T) => Promise<void>,
  onState?: (state: SaveQueueState) => void
): SaveQueue<T> {
  let latest: T | null = null;
  let rev = 0;
  let inFlight = false;
  let failed = false;
  let active: Promise<void> | null = null;

  async function drain(): Promise<void> {
    if (inFlight || latest === null) return;
    inFlight = true;
    failed = false;
    while (latest !== null) {
      const snapshot = latest;
      const snapshotRev = rev;
      latest = null;
      onState?.("saving");
      try {
        await send(snapshot);
        // Stale-ack guard: only report saved if nothing newer arrived.
        if (snapshotRev === rev && latest === null) {
          onState?.("saved");
        }
      } catch {
        // Failed: restore snapshot if nothing newer superseded it.
        failed = true;
        if (latest === null) {
          latest = snapshot;
          rev = snapshotRev;
        }
        onState?.("failed");
        break;
      }
    }
    inFlight = false;
  }

  function kick() {
    if (!active) {
      active = drain().finally(() => {
        active = null;
      });
    }
  }

  return {
    enqueue(snapshot: T) {
      latest = snapshot;
      rev++;
      failed = false;
      onState?.("pending");
      kick();
    },
    retry() {
      if (failed && latest !== null) kick();
    },
    revision() {
      return rev;
    },
    async flush() {
      while (active) await active;
      return !failed && latest === null;
    },
  };
}
