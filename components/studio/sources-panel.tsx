import {
  Globe,
  Lightbulb,
  Newspaper,
  Users,
  Building,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import { platformLabel } from "@/lib/labels";

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
  official: { label: "官方", icon: Building },
  community: { label: "社区", icon: Users },
  competitor: { label: "竞品", icon: Globe },
  news: { label: "新闻", icon: Newspaper },
  idea: { label: "想法", icon: Lightbulb },
  other: { label: "其他", icon: HelpCircle },
};

export function SourcesPanel({ signal }: { signal: SignalContext | null }) {
  if (!signal) {
    return (
      <div className="p-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
          来源
        </p>
        <p className="mt-3 text-[13px] text-ink-secondary">
          没有关联线索。这条内容是手动创建的。
        </p>
      </div>
    );
  }

  const config = signal.sourceType ? SOURCE_TYPE_CONFIG[signal.sourceType] : null;
  const Icon = config?.icon || HelpCircle;

  return (
    <div className="p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
        来源
      </p>

      <div className="mt-3 rounded-[10px] border border-border bg-workspace p-3.5">
        <div className="flex items-center gap-1.5 text-xs text-ink-muted">
          <Icon className="h-3 w-3" />
          {config?.label || "来源"}
          <span className="text-ink-faint">· 线索</span>
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
            来源链接
          </a>
        )}
        <div className="mt-2.5 space-y-1 border-t border-border pt-2.5 text-xs text-ink-secondary">
          {signal.selectedAngle && <p>角度：{signal.selectedAngle}</p>}
          {signal.primaryPlatform && (
            <p>
              平台：{platformLabel(signal.primaryPlatform)}
            </p>
          )}
          {signal.analyzedAt !== null && signal.topicScore !== null && (
            <p>选题评分：{signal.topicScore}</p>
          )}
        </div>
      </div>
    </div>
  );
}
