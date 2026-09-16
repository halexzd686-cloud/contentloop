"use client";

/**
 * Brief Fields — PRD §8.6 fixed 8 fields.
 * M7 P5: underline document fields — label + bottom hairline,
 * focus turns the rule primary. Controlled inputs; read-only
 * when the brief is approved or an AI proposal is pending.
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
  // Approved Brief is an authoritative document, not a disabled
  // form — read mode renders labels + plain values (no textarea
  // chrome, no resize handles).
  if (readOnly) {
    return (
      <div>
        {BRIEF_FIELD_META.map(({ key, label }) => (
          <div key={key} className="mt-[22px] first:mt-0">
            <div
              className="text-xs font-semibold tracking-[0.04em]"
              style={{ color: "#626660" }}
            >
              {label}
            </div>
            <div className="mt-[7px] pb-[9px] text-[14.5px] leading-[1.7] text-ink-primary">
              {values[key]}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {BRIEF_FIELD_META.map(({ key, label, placeholder }) => (
        <div key={key} className="group mt-[22px] first:mt-0">
          <label
            className="block text-xs font-semibold tracking-[0.04em]"
            style={{ color: "#626660" }}
          >
            {label}
          </label>
          <textarea
            value={values[key]}
            onChange={(e) => onChange(key, e.target.value)}
            placeholder={placeholder}
            rows={Math.max(
              1,
              values[key].split("\n").length,
              Math.ceil(values[key].length / 52)
            )}
            className="mt-[7px] w-full resize-none border-0 border-b bg-transparent pb-[9px] text-[14.5px] leading-[1.7] text-ink-primary placeholder:text-ink-faint focus:outline-none"
            style={{
              borderBottom: "1px solid rgba(200,201,203,0.4)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderBottom = "1px solid #7C9482";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderBottom =
                "1px solid rgba(200,201,203,0.4)";
            }}
          />
        </div>
      ))}
    </div>
  );
}
