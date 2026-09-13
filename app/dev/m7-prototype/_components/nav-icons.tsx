/**
 * ContentLoop Loop-trajectory navigation icon system — M7 Phase A.1
 *
 * Local, proprietary icon set replacing generic icon-library symbols.
 * Shared language: stroke 1.8, round caps/joins, one dominant path,
 * minimal fill, a short trajectory motif per glyph. 24×24 viewBox,
 * optically sized for 18px rendering (nodes ≥ r1.9 stay legible).
 * No gold in navigation icons.
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

/** 首页 — workspace frame + short return/continuation trajectory */
export function NavHomeIcon(props: IconProps) {
  return (
    <Base {...props}>
      {/* open workspace frame */}
      <path d="M6 10v7a1.5 1.5 0 0 0 1.5 1.5h9a1.5 1.5 0 0 0 1.5-1.5v-3.5" />
      {/* return trajectory descending into the frame */}
      <path d="M20.5 4.5c-4.2 0-7.2 1.9-7.8 5.4" />
      <circle cx="12.6" cy="10.2" r="1.5" fill="currentColor" stroke="none" />
    </Base>
  );
}

/** 选题雷达 — signal point + scanning trajectory (not a bullseye) */
export function NavRadarIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="7" cy="17" r="1.6" fill="currentColor" stroke="none" />
      {/* scanning needle with signal tip */}
      <path d="M7 17 13.4 9.9" />
      <circle cx="14.2" cy="8.9" r="1.2" fill="currentColor" stroke="none" />
      {/* sweep arcs, asymmetric fan */}
      <path d="M12.2 15.1A5.5 5.5 0 0 0 7.5 11.5" />
      <path d="M15.9 13.7A9.5 9.5 0 0 0 7.8 7.6" />
    </Base>
  );
}

/** 内容工作台 — document + trajectory entering/continuing through it */
export function NavStudioIcon(props: IconProps) {
  return (
    <Base {...props}>
      {/* document */}
      <path d="M7.5 4H13l4 4.5V20a1 1 0 0 1-1 1H7.5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
      <path d="M13 4v4.5h4" />
      {/* trajectory entering and continuing through the document */}
      <path d="M3 15c3 0 4 1.8 7 1.8 2.6 0 4.4-1.2 7-3.8" />
      <circle cx="17.4" cy="12.7" r="1.3" fill="currentColor" stroke="none" />
    </Base>
  );
}

/** 内容流程 — three nodes + one continuous path (not a kanban board) */
export function NavPipelineIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4.5 14.5c2.5 0 3.5-3.5 7.5-3.5s4.5 3 7.5 3" />
      <circle cx="4.5" cy="14.5" r="2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="11" r="2" fill="currentColor" stroke="none" />
      <circle cx="19.5" cy="14" r="2" fill="currentColor" stroke="none" />
    </Base>
  );
}

/** 数据复盘 — evidence nodes + return trajectory (strongest Loop DNA) */
export function NavAnalyticsIcon(props: IconProps) {
  return (
    <Base {...props}>
      {/* forward trajectory through the evidence nodes */}
      <path d="M5.5 16.5c2.8 0 2.7-6 5.5-6s3.6 2.6 6.5 2" />
      <circle cx="5.5" cy="16.5" r="1.9" fill="currentColor" stroke="none" />
      <circle cx="11" cy="10.5" r="1.9" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="12.5" r="1.9" fill="currentColor" stroke="none" />
      {/* return trajectory folding back — the loop */}
      <path d="M17.5 12.5c.7 3.8-2.3 6.3-7.2 6.5" />
      <circle cx="9.9" cy="19" r="1.2" fill="currentColor" stroke="none" />
    </Base>
  );
}

/** 设置 — parameter tracks + control nodes (not a gear) */
export function NavSettingsIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 6.5h16" />
      <path d="M4 12h16" />
      <path d="M4 17.5h16" />
      <circle cx="9.5" cy="6.5" r="2.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="2.2" fill="currentColor" stroke="none" />
      <circle cx="7.5" cy="17.5" r="2.2" fill="currentColor" stroke="none" />
    </Base>
  );
}
