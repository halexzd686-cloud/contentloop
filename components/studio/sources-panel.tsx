import {
  Globe,
  Lightbulb,
  Newspaper,
  Users,
  Building,
  HelpCircle,
  ExternalLink,
} from "lucide-react";

/**
 * Sources Panel — design §34.3
 * M1.3 scope: read-only linked Signal context. No Source CRUD.
 */

interface SignalContext {
  id: string;
  title: string;
  summary: string | null;
  sourceType: string | null;
  sourceUrl: string | null;
  selectedAngle: string | null;
  primaryPlatform: string | null;
  topicScore: number | null;
  analyzedAt: string | null;
}

const SOURCE_TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  official: { label: "Official", icon: Building },
  community: { label: "Community", icon: Users },
  competitor: { label: "Competitor", icon: Globe },
  news: { label: "News", icon: Newspaper },
  idea: { label: "Idea", icon: Lightbulb },
  other: { label: "Other", icon: HelpCircle },
};

const PLATFORM_LABELS: Record<string, string> = {
  xiaohongshu: "Xiaohongshu",
  bilibili: "Bilibili",
  douyin: "Douyin",
};

export function SourcesPanel({ signal }: { signal: SignalContext | null }) {
  if (!signal) {
    return (
      <div className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Sources
        </p>
        <p className="mt-3 text-sm text-ink-faint">
          No linked signal. This content was created manually.
        </p>
      </div>
    );
  }

  const config = signal.sourceType ? SOURCE_TYPE_CONFIG[signal.sourceType] : null;
  const Icon = config?.icon || HelpCircle;

  return (
    <div className="p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Sources
      </p>

      <div className="mt-3 rounded-[8px] border border-border bg-canvas p-3">
        <div className="flex items-center gap-1.5 text-xs text-ink-muted">
          <Icon className="h-3 w-3" />
          {config?.label || "Source"}
          <span className="text-ink-faint">· Signal</span>
        </div>
        <p className="mt-1.5 text-sm font-medium text-ink-primary leading-snug">
          {signal.title}
        </p>
        {signal.summary && (
          <p className="mt-1 text-xs text-ink-secondary line-clamp-3">
            {signal.summary}
          </p>
        )}
        {signal.sourceUrl && (
          <a
            href={signal.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 inline-flex items-center gap-1 text-xs text-mint-600 hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Source link
          </a>
        )}
        <div className="mt-2 space-y-0.5 border-t border-border pt-2 text-xs text-ink-muted">
          {signal.selectedAngle && <p>Angle: {signal.selectedAngle}</p>}
          {signal.primaryPlatform && (
            <p>
              Platform:{" "}
              {PLATFORM_LABELS[signal.primaryPlatform] || signal.primaryPlatform}
            </p>
          )}
          {signal.analyzedAt !== null && signal.topicScore !== null && (
            <p>Topic Score: {signal.topicScore}</p>
          )}
        </div>
      </div>
    </div>
  );
}
