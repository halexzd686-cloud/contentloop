import { ExternalLink } from "lucide-react";
import { platformLabel } from "@/lib/labels";

/**
 * Sources Panel — M7 P5: source blocks as 2px rail items
 * (primary rail for the linked signal), no cards.
 * Read-only linked Signal context. No Source CRUD.
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

const SOURCE_TYPE_LABELS: Record<string, string> = {
  official: "官方",
  community: "社区",
  competitor: "竞品",
  news: "新闻",
  idea: "想法",
  other: "其他",
};

export function SourcesPanel({ signal }: { signal: SignalContext | null }) {
  if (!signal) {
    return (
      <div className="p-[18px]">
        <p
          className="text-[11px] font-medium tracking-[0.14em]"
          style={{ color: "var(--ink-muted)" }}
        >
          来源
        </p>
        <p className="mt-3.5 text-[13px] leading-[1.6]" style={{ color: "var(--cl-neutral)" }}>
          没有关联线索。这条内容是手动创建的。
        </p>
      </div>
    );
  }

  const sourceLabel = signal.sourceType
    ? SOURCE_TYPE_LABELS[signal.sourceType] || signal.sourceType
    : "来源";

  const metaParts: string[] = [];
  if (signal.selectedAngle) metaParts.push(`已选角度：${signal.selectedAngle}`);
  if (signal.primaryPlatform)
    metaParts.push(`平台：${platformLabel(signal.primaryPlatform)}`);
  if (signal.analyzedAt !== null && signal.topicScore !== null)
    metaParts.push(`评分 ${signal.topicScore}`);

  return (
    <div className="p-[18px]">
      <p
        className="text-[11px] font-medium tracking-[0.14em]"
        style={{ color: "var(--ink-muted)" }}
      >
        来源
      </p>

      <div className="mt-3.5 pl-3" style={{ borderLeft: "2px solid var(--cl-primary)" }}>
        <div className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
          选题线索 · {sourceLabel}
        </div>
        <div className="mt-1 text-[13px] font-semibold leading-normal text-ink-primary">
          {signal.title}
        </div>
        {signal.summary && (
          <div
            className="mt-1 text-xs leading-[1.55] line-clamp-3"
            style={{ color: "var(--cl-neutral)" }}
          >
            {signal.summary}
          </div>
        )}
        {metaParts.length > 0 && (
          <div className="mt-1 text-xs leading-[1.55]" style={{ color: "var(--cl-neutral)" }}>
            {metaParts.join(" · ")}
          </div>
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
      </div>
    </div>
  );
}
