"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { ProtoShell } from "../shell";
import {
  contentStatusLabel,
  platformLabel,
  briefStatusLabel,
} from "@/lib/labels";

/**
 * M5.6 Phase 1 — Studio detail V2 prototype (S1 direction).
 * Sources 20% / Workspace 56% / Loop AI 24%. Center dominant, sources
 * quiet inset, AI panel supportive mint-inset (never louder than the
 * editor). Read-only against a real content detail. No editor motion.
 */

const CONTENT_ID = "7f29ab96-aa37-44e9-bd55-46795f9858c8"; // real, read-only

const BRIEF_LABELS: [string, string][] = [
  ["targetAudience", "Target Audience"],
  ["userProblem", "User Problem"],
  ["coreQuestion", "Core Question"],
  ["mainAngle", "Main Angle"],
  ["contentPromise", "Content Promise"],
  ["keyEvidence", "Key Evidence"],
  ["differentiation", "Differentiation"],
  ["cta", "CTA"],
];

interface Detail {
  content: {
    title: string;
    status: string;
    primaryPlatform: string | null;
    isDemo: boolean;
    owner: { name: string } | null;
    reviewer: { name: string } | null;
  };
  signal: {
    title: string;
    sourceType: string | null;
    sourceUrl: string | null;
    topicScore: number | null;
    selectedAngle: string | null;
  } | null;
  brief: (Record<string, string> & { status: string; approvedAt: string | null }) | null;
}

export default function StudioV2() {
  const [d, setD] = useState<Detail | null>(null);

  useEffect(() => {
    const t = setTimeout(async () => {
      const res = await fetch(`/api/contents/${CONTENT_ID}`);
      if (res.ok) setD(await res.json());
    }, 0);
    return () => clearTimeout(t);
  }, []);

  if (!d) {
    return (
      <ProtoShell active="studio">
        <div className="p-8 text-sm text-ink-muted">Loading…</div>
      </ProtoShell>
    );
  }

  const brief = d.brief;

  return (
    <ProtoShell active="studio">
      {/* Header: strong title, state cluster, tabs */}
      <div className="border-b border-border bg-workspace px-8 pb-0 pt-5">
        <div className="flex items-center gap-3">
          <h1 className="max-w-[640px] truncate text-xl font-semibold leading-snug">
            {d.content.title}
          </h1>
          <Badge variant="default">{contentStatusLabel(d.content.status)}</Badge>
          {d.content.primaryPlatform && (
            <span className="text-xs text-ink-secondary">
              {platformLabel(d.content.primaryPlatform)}
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-4 text-xs text-ink-secondary">
          {d.content.owner && <span>Owner: {d.content.owner.name}</span>}
          {d.content.reviewer && <span>Reviewer: {d.content.reviewer.name}</span>}
        </div>
        <div className="mt-4 flex gap-1">
          {["Brief", "Master", "Platforms", "Review"].map((tab, i) => (
            <span
              key={tab}
              className={`rounded-md px-3 py-1.5 text-sm ${
                i === 0
                  ? "bg-mint-100 font-medium text-ink-primary"
                  : "text-ink-muted"
              }`}
            >
              {tab}
            </span>
          ))}
        </div>
      </div>

      {/* Three zones: 20 / 56 / 24 */}
      <div className="flex min-h-[calc(100vh-140px)]">
        {/* Sources — quiet inset */}
        <div className="w-[20%] border-r border-border bg-surface-subtle p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
            Sources
          </p>
          {d.signal ? (
            <div className="mt-3 rounded-[10px] border border-border bg-workspace p-3">
              <div className="flex items-center gap-2 text-[11px] text-ink-muted">
                <Badge variant="outline">Idea</Badge>
                <span>Signal</span>
              </div>
              <p className="mt-2 text-[13px] font-medium leading-snug">
                {d.signal.title}
              </p>
              {d.signal.topicScore !== null && (
                <p className="mt-2 text-xs text-ink-secondary">
                  Topic Score: {d.signal.topicScore}
                </p>
              )}
              {d.signal.selectedAngle && (
                <p className="mt-1 text-xs text-ink-secondary">
                  Angle: {d.signal.selectedAngle}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-3 text-xs text-ink-secondary">
              No linked signal. This content was created manually.
            </p>
          )}
        </div>

        {/* Content Workspace — dominant white surface */}
        <div className="w-[56%] bg-workspace p-8">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-semibold">Brief</h2>
              {brief && (
                <Badge variant={brief.status === "approved" ? "mint" : "default"}>
                  {briefStatusLabel(brief.status)}
                </Badge>
              )}
            </div>
            {brief?.approvedAt && (
              <p className="text-xs text-ink-secondary">
                Approved {new Date(brief.approvedAt).toLocaleDateString()}
              </p>
            )}
          </div>

          {brief && (
            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
              {BRIEF_LABELS.map(([key, label]) => (
                <div key={key}>
                  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted">
                    {label}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-primary">
                    {brief[key]}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Loop AI — supportive mint-inset, quieter than the editor */}
        <div className="w-[24%] border-l border-l-mint-300/60 border-border bg-canvas p-5">
          <div className="rounded-[10px] border border-mint-600/25 bg-mint-100/40 p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
              Loop AI
            </p>
            <p className="mt-1.5 text-xs text-ink-secondary">
              AI proposes · You review and confirm
            </p>
            <Button variant="secondary" size="sm" className="mt-4 w-full" disabled>
              <Sparkles className="mr-1 h-3 w-3" />
              Generate Draft Brief
            </Button>
            <p className="mt-3 text-[11px] leading-relaxed text-ink-secondary">
              AI proposes a draft based on the linked signal, brand context and
              playbook. Nothing is saved until you Apply and edit.
            </p>
          </div>
        </div>
      </div>
    </ProtoShell>
  );
}
