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
  { key: "targetAudience", label: "Target Audience", placeholder: "Who is this content for?" },
  { key: "userProblem", label: "User Problem", placeholder: "What problem does the audience have?" },
  { key: "coreQuestion", label: "Core Question", placeholder: "The single question this content answers" },
  { key: "mainAngle", label: "Main Angle", placeholder: "The unique angle or perspective" },
  { key: "contentPromise", label: "Content Promise", placeholder: "What the audience gets from consuming this" },
  { key: "keyEvidence", label: "Key Evidence", placeholder: "Evidence from real signal data only. If none: Not enough verified evidence yet." },
  { key: "differentiation", label: "Differentiation", placeholder: "Why this content is different from what exists" },
  { key: "cta", label: "CTA", placeholder: "What the audience should do next" },
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
