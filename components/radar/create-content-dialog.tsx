"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { platformLabel } from "@/lib/labels";

/**
 * Create Content Dialog — confirm platform, angle, and owner.
 * Creates Content from Signal in one atomic operation.
 */

interface TeamMember {
  id: string;
  name: string;
  title: string | null;
}

interface CreateContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: {
    primaryPlatform: string;
    selectedAngle: string;
    ownerId: string;
  }) => void;
  loading: boolean;
  error: string | null;
}

const PLATFORMS = ["xiaohongshu", "bilibili", "douyin"] as const;

export function CreateContentDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
  error,
}: CreateContentDialogProps) {
  const [platform, setPlatform] = useState<string>("");
  const [angle, setAngle] = useState("");
  const [ownerId, setOwnerId] = useState("");
  // null = not loaded yet (loading); array = loaded
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const membersLoading = members === null;

  // Fetch team members when dialog opens (async setState in callbacks only)
  useEffect(() => {
    if (!open || members !== null) return;
    let cancelled = false;
    fetch("/api/team-members")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setMembers(data.members || []);
      })
      .catch(() => {
        if (!cancelled) setMembers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, members]);

  function handleConfirm() {
    if (platform && angle.trim() && ownerId) {
      onConfirm({
        primaryPlatform: platform,
        selectedAngle: angle.trim(),
        ownerId,
      });
    }
  }

  const isValid = platform && angle.trim() && ownerId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>创建内容</DialogTitle>
          <DialogDescription>
            确认这条内容的平台、角度和负责人。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Platform */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-primary">
              主要平台 *
            </label>
            <div className="flex gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  disabled={loading}
                  className={`flex-1 rounded-[8px] border px-3 py-2 text-sm transition-colors duration-150 ${
                    platform === p
                      ? "border-mint-600 bg-mint-100 text-ink-primary font-medium"
                      : "border-border text-ink-secondary hover:border-border-strong"
                  }`}
                >
                  {platformLabel(p)}
                </button>
              ))}
            </div>
          </div>

          {/* Angle */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-primary">
              选定角度 *
            </label>
            <Input
              placeholder="例如：实测体验、横向对比、教程…"
              value={angle}
              onChange={(e) => setAngle(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Owner */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-primary">
              负责人 *
            </label>
            <select
              className="flex h-9 w-full rounded-[8px] border border-border bg-workspace px-3 py-1 text-sm text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-500 disabled:opacity-50"
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              disabled={loading || membersLoading}
            >
              <option value="">
                {membersLoading ? "加载中…" : "请选择负责人…"}
              </option>
              {(members ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                  {m.title ? ` — ${m.title}` : ""}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
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
            variant="primary"
            onClick={handleConfirm}
            disabled={!isValid || loading}
          >
            {loading ? "创建中…" : "创建内容"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
