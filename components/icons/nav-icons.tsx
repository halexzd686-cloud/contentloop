/**
 * ContentLoop navigation icons — M7 final set XIII · 金属刻度
 * (approved via mock .shots/hd-i13.png)
 *
 * Machined-gauge language per ContentLoop_M7_Visual_Design_Spec.md §36:
 * precise 1.8px strokes, 45° geometry, tick marks, square machined nodes
 * (filled squares), zero rounded softness. Local SVG only.
 * Inactive: Neutral/Silver. Active: Primary Green. No gold in nav icons.
 */

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
  "aria-hidden"?: boolean | "true" | "false";
}

function Base({
  className,
  style,
  children,
  "aria-hidden": ariaHidden = true,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden={ariaHidden}
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** 首页 — workspace frame + 45° incoming line + square node */
export function NavHomeIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6 10h12v9.5H6z" strokeLinejoin="miter" />
      <path d="M20 4.5 14.5 10" />
      <rect x="12.7" y="10" width="2.6" height="2.6" fill="currentColor" stroke="none" />
    </Base>
  );
}

/** 选题雷达 — gauge: partial dial + cardinal ticks + 45° needle + square hub */
export function NavRadarIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 5a7 7 0 1 1-5 12" />
      <path d="M12 2.6v2M12 19.4v2M2.6 12h2M19.4 12h2" strokeWidth={1.4} />
      <path d="M12 12l4.3-4.3" />
      <rect x="11" y="11" width="2" height="2" fill="currentColor" stroke="none" />
    </Base>
  );
}

/** 内容工作台 — sharp document + fold + ruled lines */
export function NavStudioIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M7 4.5h6.5l4 4.5v10.5H7z" strokeLinejoin="miter" />
      <path d="M13.5 4.5V9h4" strokeWidth={1.4} />
      <path d="M9.8 12.5h4.8M9.8 15.5h4.8" strokeWidth={1.4} />
    </Base>
  );
}

/** 内容流程 — 45° zigzag path + three square stage nodes */
export function NavPipelineIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M5 16.5h4l3.5-6.5h4l2.5 4" />
      <rect x="3.6" y="15.1" width="2.8" height="2.8" fill="currentColor" stroke="none" />
      <rect x="11.1" y="8.6" width="2.8" height="2.8" fill="currentColor" stroke="none" />
      <rect x="17.6" y="12.6" width="2.8" height="2.8" fill="currentColor" stroke="none" />
    </Base>
  );
}

/** 数据复盘 — measured axis + axis ticks + plot line + square endpoint */
export function NavAnalyticsIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M5.5 5v13.5h13" strokeLinejoin="miter" />
      <path d="M9.5 17v1.5M13.5 17v1.5M17.5 17v1.5" strokeWidth={1.3} />
      <path d="M8 15.5l3-3 2.5 2 4-5" />
      <rect x="16.3" y="8.3" width="2.6" height="2.6" fill="currentColor" stroke="none" />
    </Base>
  );
}

/** 设置 — two parameter tracks + square sliders */
export function NavSettingsIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4.5 8.5h15" />
      <path d="M4.5 15.5h15" />
      <rect x="8" y="7" width="3" height="3" fill="currentColor" stroke="none" />
      <rect x="13" y="14" width="3" height="3" fill="currentColor" stroke="none" />
    </Base>
  );
}
