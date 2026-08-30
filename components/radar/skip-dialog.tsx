"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SKIP_REASONS } from "@/lib/validation/signal";

/**
 * Skip Dialog — select a reason and confirm skip.
 * skipReason is required; no skip without a reason.
 */

const SKIP_REASON_LABELS: Record<string, string> = {
  too_late: "Too Late",
  saturated: "Saturated",
  low_audience_fit: "Low Audience Fit",
  insufficient_information: "Insufficient Information",
  high_production_cost: "High Production Cost",
  no_clear_angle: "No Clear Angle",
  other: "Other",
};

interface SkipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  loading: boolean;
}

export function SkipDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
}: SkipDialogProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);

  function handleConfirm() {
    if (selectedReason) {
      onConfirm(selectedReason);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Skip Signal</DialogTitle>
          <DialogDescription>
            Why are you skipping this signal?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {SKIP_REASONS.map((reason) => (
            <button
              key={reason}
              onClick={() => setSelectedReason(reason)}
              disabled={loading}
              className={`w-full rounded-[8px] border px-3 py-2 text-left text-sm transition-colors duration-150 ${
                selectedReason === reason
                  ? "border-mint-600 bg-mint-100 text-ink-primary"
                  : "border-border text-ink-secondary hover:border-border-strong hover:bg-surface-subtle"
              }`}
            >
              {SKIP_REASON_LABELS[reason]}
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            disabled={!selectedReason || loading}
          >
            {loading ? "Skipping..." : "Skip Signal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
