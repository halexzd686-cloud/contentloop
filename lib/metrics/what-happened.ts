import {
  formatMetricValue,
  type MetricFormat,
} from "@/lib/metrics/engine";
import { formatDelta } from "@/lib/metrics/comparison";
import type { ResolvedEvidence } from "@/lib/validation/diagnosis";

/**
 * Canonical What Happened — M2.6 freeze-blocker fix.
 *
 * What Happened is a deterministic factual summary built by the server
 * from server-resolved Evidence. AI never writes numbers; the client
 * cannot tamper with them. Pure function, no DB / no AI.
 *
 * Direction wording is mathematical only (高于/低于/持平) — never
 * quality labels.
 */

interface EvidenceWithMeta extends ResolvedEvidence {
  label: string;
  format: MetricFormat;
}

function directionText(
  absoluteDelta: number | null,
  scopeLabel: string,
  medianText: string,
  format: MetricFormat,
  sampleCount: number | null
): string {
  if (absoluteDelta === null) {
    return `暂无${scopeLabel}历史基线可比`;
  }
  if (absoluteDelta === 0) {
    return `与${scopeLabel}历史中位数 ${medianText} 持平（n=${sampleCount}）`;
  }
  const dir = absoluteDelta > 0 ? "高于" : "低于";
  return `${dir}${scopeLabel}历史中位数 ${medianText}（${formatDelta(format, absoluteDelta)}，n=${sampleCount}）`;
}

export function buildWhatHappened(
  evidence: EvidenceWithMeta[],
  checkpoint: string
): string {
  if (evidence.length === 0) {
    return `${checkpoint} 已记录当前指标，但暂无足够历史可比样本形成基线比较。`;
  }

  const sentences = evidence.map((e) => {
    const scopeLabel = e.baselineScope === "account" ? "账号" : "同 Pillar ";
    const currentText = formatMetricValue(e.format, e.currentValue);
    const medianText = formatMetricValue(e.format, e.baselineValue);
    return `${e.label}为 ${currentText}，${directionText(
      e.absoluteDelta,
      scopeLabel,
      medianText,
      e.format,
      e.sampleCount
    )}`;
  });

  return `${checkpoint} ${sentences.join("；")}。`;
}
