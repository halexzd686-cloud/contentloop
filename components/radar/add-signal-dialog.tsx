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
        throw new Error(data.error || "Failed to create signal");
      }

      resetForm();
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create signal");
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
          Add Signal
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Signal</DialogTitle>
          <DialogDescription>
            Add a URL or quick idea to evaluate as potential content.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="url" className="mt-2">
          <TabsList>
            <TabsTrigger value="url">URL</TabsTrigger>
            <TabsTrigger value="idea">Idea</TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-primary">
                URL
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
                Title *
              </label>
              <Input
                placeholder="Signal title"
                value={urlTitle}
                onChange={(e) => setUrlTitle(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-primary">
                Summary
              </label>
              <textarea
                className="flex min-h-[80px] w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-500 focus-visible:ring-offset-1 disabled:opacity-50"
                placeholder="Brief summary (optional)"
                value={urlSummary}
                onChange={(e) => setUrlSummary(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-primary">
                Source Type
              </label>
              <select
                className="flex h-9 w-full rounded-[8px] border border-border bg-workspace px-3 py-1 text-sm text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-500 disabled:opacity-50"
                value={urlSourceType}
                onChange={(e) => setUrlSourceType(e.target.value)}
                disabled={loading}
              >
                <option value="">Select...</option>
                <option value="official">Official</option>
                <option value="community">Community</option>
                <option value="competitor">Competitor</option>
                <option value="news">News</option>
                <option value="other">Other</option>
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
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => handleSubmit("url")}
                disabled={loading || !urlTitle.trim()}
              >
                {loading ? "Adding..." : "Add Signal"}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="idea" className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-primary">
                Idea *
              </label>
              <Input
                placeholder="What's the idea?"
                value={ideaTitle}
                onChange={(e) => setIdeaTitle(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-primary">
                Notes
              </label>
              <textarea
                className="flex min-h-[80px] w-full rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-500 focus-visible:ring-offset-1 disabled:opacity-50"
                placeholder="Additional context (optional)"
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
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => handleSubmit("idea")}
                disabled={loading || !ideaTitle.trim()}
              >
                {loading ? "Adding..." : "Add Signal"}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
