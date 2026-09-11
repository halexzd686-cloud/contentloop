"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";

/**
 * Add Signal Dialog — design.md §21, §33.4
 * Modal for creating a new signal. Two tabs: URL and Idea.
 * On failure: preserves user input, shows error, allows retry.
 */

interface AddSignalDialogProps {
  onCreated: () => void;
}

export function AddSignalDialog({ onCreated }: AddSignalDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // URL tab state
  const [url, setUrl] = useState("");
  const [urlTitle, setUrlTitle] = useState("");
  const [urlSummary, setUrlSummary] = useState("");
  const [urlSourceType, setUrlSourceType] = useState<string>("");

  // Idea tab state
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaSummary, setIdeaSummary] = useState("");

  function resetForm() {
    setUrl("");
    setUrlTitle("");
    setUrlSummary("");
    setUrlSourceType("");
    setIdeaTitle("");
    setIdeaSummary("");
    setError(null);
  }

  async function handleSubmit(type: "url" | "idea") {
    setLoading(true);
    setError(null);

    const body =
      type === "url"
        ? {
            inputType: "url",
            sourceUrl: url,
            title: urlTitle,
            summary: urlSummary,
            sourceType: urlSourceType || undefined,
          }
        : {
            inputType: "idea",
            title: ideaTitle,
            summary: ideaSummary,
            sourceType: "idea",
          };

    try {
      const res = await fetch("/api/signals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "创建线索失败");
      }

      resetForm();
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建线索失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="primary" size="sm">
          <Plus className="mr-1 h-4 w-4" />
          新增线索
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新增线索</DialogTitle>
          <DialogDescription>
            添加一条链接或想法，作为潜在内容来评估。
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="url" className="mt-2">
          <TabsList>
            <TabsTrigger value="url">链接</TabsTrigger>
            <TabsTrigger value="idea">想法</TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-primary">
                链接
              </label>
              <Input
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-primary">
                标题 *
              </label>
              <Input
                placeholder="线索标题"
                value={urlTitle}
                onChange={(e) => setUrlTitle(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-primary">
                简要说明（可选）
              </label>
              <textarea
                className="flex min-h-[80px] w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-500 focus-visible:ring-offset-1 disabled:opacity-50"
                placeholder="简要说明（可选）"
                value={urlSummary}
                onChange={(e) => setUrlSummary(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-primary">
                来源类型
              </label>
              <select
                className="flex h-9 w-full rounded-[8px] border border-border bg-workspace px-3 py-1 text-sm text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-500 disabled:opacity-50"
                value={urlSourceType}
                onChange={(e) => setUrlSourceType(e.target.value)}
                disabled={loading}
              >
                <option value="">请选择…</option>
                <option value="official">官方</option>
                <option value="community">社区</option>
                <option value="competitor">竞品</option>
                <option value="news">资讯</option>
                <option value="other">其他</option>
              </select>
            </div>
            {error && (
              <p className="text-sm text-danger">{error}</p>
            )}
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                取消
              </Button>
              <Button
                variant="primary"
                onClick={() => handleSubmit("url")}
                disabled={loading || !urlTitle.trim()}
              >
                {loading ? "添加中…" : "新增线索"}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="idea" className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-primary">
                想法 *
              </label>
              <Input
                placeholder="这个想法是什么？"
                value={ideaTitle}
                onChange={(e) => setIdeaTitle(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-primary">
                备注
              </label>
              <textarea
                className="flex min-h-[80px] w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-500 focus-visible:ring-offset-1 disabled:opacity-50"
                placeholder="补充说明（可选）"
                value={ideaSummary}
                onChange={(e) => setIdeaSummary(e.target.value)}
                disabled={loading}
              />
            </div>
            {error && (
              <p className="text-sm text-danger">{error}</p>
            )}
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                取消
              </Button>
              <Button
                variant="primary"
                onClick={() => handleSubmit("idea")}
                disabled={loading || !ideaTitle.trim()}
              >
                {loading ? "添加中…" : "新增线索"}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
