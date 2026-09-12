/**
 * ContentLoop Loop-trajectory navigation icon system — M7 Phase A.1
 *
 * Local, proprietary icon set replacing generic icon-library symbols.
 * Shared language: stroke 1.7, round caps/joins, one dominant path,
 * minimal fill, a short trajectory motif per glyph. 24×24 viewBox,
 * optically sized for 18px rendering. No gold in navigation icons.
 */

interface IconProps {
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}

function Base({
  className,
  children,
  "aria-hidden": ariaHidden = true,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
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
      {/* open-top workspace frame */}
      <path d="M5 9.5v8A1.5 1.5 0 0 0 6.5 19h11a1.5 1.5 0 0 0 1.5-1.5V13" />
      {/* return trajectory descending into the frame */}
      <path d="M20.5 4.5c-4.6 0-8.2 2.1-9 6.1" />
      <circle cx="11.4" cy="10.9" r="1.1" fill="currentColor" stroke="none" />
    </Base>
  );
}

/** 选题雷达 — signal point + scanning trajectory (not a bullseye) */
export function NavRadarIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="8" cy="17" r="1.3" fill="currentColor" stroke="none" />
      {/* scanning needle */}
      <path d="M8 17 15.2 8.8" />
      {/* sweep arcs, asymmetric ~60° fan */}
      <path d="M12.7 15.3A5 5 0 0 0 8.9 12.1" />
      <path d="M16.5 13.9A9 9 0 0 0 9.6 8.1" />
    </Base>
  );
}

/** 内容工作台 — document + trajectory entering/continuing through it */
export function NavStudioIcon(props: IconProps) {
  return (
    <Base {...props}>
      {/* document */}
      <path d="M7 3.5h6.5L18 8v12.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z" />
      <path d="M13.5 3.5V8H18" />
      {/* trajectory entering and continuing through the document */}
      <path d="M2.5 15.5c3.5 0 4.5 2 8 2s5.3-1.4 8.4-4.3" />
      <circle cx="19.1" cy="12.9" r="1" fill="currentColor" stroke="none" />
    </Base>
  );
}

/** 内容流程 — three nodes + one continuous path (not a kanban board) */
export function NavPipelineIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M5 16c2.6 0 3.4-8 7-8s4.4 6 7 6" />
      <circle cx="5" cy="16" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="8" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="19" cy="14" r="1.5" fill="currentColor" stroke="none" />
    </Base>
  );
}

/** 数据复盘 — evidence nodes + return trajectory (strongest Loop DNA) */
export function NavAnalyticsIcon(props: IconProps) {
  return (
    <Base {...props}>
      {/* forward trajectory through the evidence nodes */}
      <path d="M6 17c2.8 0 2.8-6 5-6s3 2.9 6.2 2.1" />
      <circle cx="6" cy="17" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="11" cy="11" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="17.4" cy="13" r="1.4" fill="currentColor" stroke="none" />
      {/* return trajectory folding back — the loop */}
      <path d="M17.4 13c.6 4-2.4 6.7-7.6 7" />
      <circle cx="9.5" cy="20" r="1" fill="currentColor" stroke="none" />
    </Base>
  );
}

/** 设置 — parameter tracks + control nodes (not a gear) */
export function NavSettingsIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
      <circle cx="9.5" cy="7" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="12" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="8" cy="17" r="1.8" fill="currentColor" stroke="none" />
    </Base>
  );
}
