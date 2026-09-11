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
  too_late: "时效已过",
  saturated: "内容已饱和",
  low_audience_fit: "受众匹配度低",
  insufficient_information: "信息不足",
  high_production_cost: "制作成本高",
  no_clear_angle: "没有清晰角度",
  other: "其他",
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
          <DialogTitle>跳过线索</DialogTitle>
          <DialogDescription>
            为什么要跳过这条线索？
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
            取消
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            disabled={!selectedReason || loading}
          >
            {loading ? "跳过中…" : "跳过该线索"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
