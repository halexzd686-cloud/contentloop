import { createSaveQueue, type SaveQueueState } from "@/lib/save-queue";
import type { ReviewChecklist } from "@/lib/validation/review";

/**
 * ChecklistEditor — M1.6 review checklist interaction core.
 *
 * Interaction-first, persistence-asynchronous:
 * - A checkbox click updates local state IMMEDIATELY (<100ms visual,
 *   zero network wait) and schedules a debounced save (~300ms).
 * - Rapid clicks coalesce: only the latest full 5-field snapshot is
 *   persisted (serialized via SaveQueue; stale acks never roll back).
 * - Select All / Clear All are ONE local change + ONE save.
 * - flush() (used before Approve for Publishing) cancels any pending
 *   debounce, enqueues the dirty snapshot and waits until persisted.
 * - A failed save never clears local state; retry() re-sends latest.
 */
export class ChecklistEditor {
  private state: ReviewChecklist;
  private dirty = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private queue;

  constructor(
    initial: ReviewChecklist,
    send: (snapshot: ReviewChecklist) => Promise<void>,
    private onChange?: (state: ReviewChecklist) => void,
    onState?: (state: SaveQueueState) => void,
    private debounceMs = 300
  ) {
    this.state = { ...initial };
    this.queue = createSaveQueue<ReviewChecklist>(send, onState);
  }

  getState(): ReviewChecklist {
    return { ...this.state };
  }

  private commit(next: ReviewChecklist, immediate: boolean) {
    this.state = next;
    this.dirty = true;
    this.onChange?.(this.getState());
    if (this.timer) clearTimeout(this.timer);
    if (immediate) {
      this.timer = null;
      this.enqueueNow();
    } else {
      this.timer = setTimeout(() => {
        this.timer = null;
        this.enqueueNow();
      }, this.debounceMs);
    }
  }

  private enqueueNow() {
    if (!this.dirty) return;
    this.dirty = false;
    this.queue.enqueue(this.getState());
  }

  /** Single checkbox: immediate local update, debounced save. */
  toggle(key: keyof ReviewChecklist) {
    this.commit({ ...this.state, [key]: !this.state[key] }, false);
  }

  /** Select All / Clear All: ONE local change + ONE immediate save. */
  setAll(value: boolean) {
    this.commit(
      {
        factsConfirmed: value,
        titleCoverMatch: value,
        platformFitConfirmed: value,
        riskChecked: value,
        humanReviewed: value,
      },
      true
    );
  }

  /**
   * Before Approve: cancel pending debounce, persist the latest local
   * snapshot and wait until the queue is settled. Resolves false when
   * a save failed — the caller must NOT proceed to approve.
   */
  async flush(): Promise<boolean> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.enqueueNow();
    return this.queue.flush();
  }

  retry() {
    this.queue.retry();
  }
}
