"use client";

/**
 * Brief Fields — PRD §8.6 fixed 8 fields.
 * Controlled inputs; read-only when the brief is approved or an AI
 * proposal is pending review.
 */

export interface BriefFieldValues {
  targetAudience: string;
  userProblem: string;
  coreQuestion: string;
  mainAngle: string;
  contentPromise: string;
  keyEvidence: string;
  differentiation: string;
  cta: string;
}

export const BRIEF_FIELD_META: {
  key: keyof BriefFieldValues;
  label: string;
  placeholder: string;
}[] = [
  { key: "targetAudience", label: "目标读者", placeholder: "这条内容是写给谁看的？" },
  { key: "userProblem", label: "读者问题", placeholder: "读者有什么痛点？" },
  { key: "coreQuestion", label: "核心问题", placeholder: "这条内容回答的唯一问题" },
  { key: "mainAngle", label: "切入角度", placeholder: "独特的切入角度或视角" },
  { key: "contentPromise", label: "内容承诺", placeholder: "读者看完能获得什么" },
  { key: "keyEvidence", label: "关键证据", placeholder: "只写来自真实线索的证据。没有就写：暂无足够已验证证据。" },
  { key: "differentiation", label: "差异点", placeholder: "和已有内容相比有什么不同" },
  { key: "cta", label: "行动引导", placeholder: "希望读者接下来做什么" },
];

interface BriefFieldsProps {
  values: BriefFieldValues;
  onChange: (key: keyof BriefFieldValues, value: string) => void;
  readOnly: boolean;
}

export function BriefFields({ values, onChange, readOnly }: BriefFieldsProps) {
  // M5.6: approved Brief is an authoritative document, not a disabled
  // form — read mode renders labels + plain values (no textarea chrome,
  // no resize handles). Edit Brief remains the only path into editing.
  if (readOnly) {
    return (
      <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
        {BRIEF_FIELD_META.map(({ key, label }) => (
          <div key={key}>
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted">
              {label}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-primary">
              {values[key]}
            </p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-5">
      {BRIEF_FIELD_META.map(({ key, label, placeholder }) => (
        <div key={key}>
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted">
            {label}
          </label>
          <textarea
            value={values[key]}
            onChange={(e) => onChange(key, e.target.value)}
            placeholder={placeholder}
            rows={2}
            className="flex w-full resize-y rounded-[8px] border border-border bg-workspace px-3 py-2 text-sm text-ink-primary placeholder:text-ink-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-500"
          />
        </div>
      ))}
    </div>
  );
}
