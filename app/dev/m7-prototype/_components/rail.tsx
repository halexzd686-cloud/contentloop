"use client";

import { useState } from "react";
import {
  NavHomeIcon,
  NavRadarIcon,
  NavStudioIcon,
  NavPipelineIcon,
  NavAnalyticsIcon,
  NavSettingsIcon,
} from "./nav-icons";

/**
 * M7 prototype — accepted Editorial Rail (shared by shell/home prototypes).
 * Accepted visuals: silver-derived surface, 1px divider, compact Cormorant
 * wordmark, 工作区 group label, 5 workflow items + spacing-separated 设置,
 * 24px × 2px primary rail marker + green icon + strong 600 label.
 * Prototype: click switches visual active state only (no navigation).
 */

export const RAIL_ITEMS = [
  { key: "home", label: "首页", icon: NavHomeIcon },
  { key: "radar", label: "选题雷达", icon: NavRadarIcon },
  { key: "studio", label: "内容工作台", icon: NavStudioIcon },
  { key: "pipeline", label: "内容流程", icon: NavPipelineIcon },
  { key: "analytics", label: "数据复盘", icon: NavAnalyticsIcon },
] as const;

export function M7Rail({
  active,
  onSelect,
}: {
  active: string;
  onSelect?: (key: string) => void;
}) {
  return (
    <aside
      className="flex h-screen w-[216px] shrink-0 flex-col"
      style={{
        background: "#EDEFEA",
        borderRight: "1px solid rgba(200,201,203,0.65)",
      }}
    >
      <div className="px-5 pb-7 pt-6">
        <span
          style={{
            fontFamily: '"Cormorant Garamond", "Noto Serif SC", serif',
            fontWeight: 600,
            fontSize: 24,
            lineHeight: 1,
            letterSpacing: "0.005em",
          }}
        >
          ContentLoop
        </span>
      </div>

      <div
        className="px-5 pb-2 text-[11px] font-medium"
        style={{ color: "#8B8E87", letterSpacing: "0.14em" }}
      >
        工作区
      </div>

      <nav aria-label="主导航" className="flex flex-1 flex-col gap-0.5">
        {RAIL_ITEMS.map((item) => (
          <RailRow
            key={item.key}
            label={item.label}
            icon={item.icon}
            isActive={active === item.key}
            onSelect={() => onSelect?.(item.key)}
          />
        ))}
        <div className="mt-8">
          <RailRow
            label="设置"
            icon={NavSettingsIcon}
            isActive={active === "settings"}
            onSelect={() => onSelect?.("settings")}
          />
        </div>
      </nav>
    </aside>
  );
}

function RailRow({
  label,
  icon: Icon,
  isActive,
  onSelect,
}: {
  label: string;
  icon: typeof NavHomeIcon;
  isActive: boolean;
  onSelect?: () => void;
}) {
  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        onSelect?.();
      }}
      aria-current={isActive ? "page" : undefined}
      className="relative flex h-10 items-center gap-3 px-5 text-[13px] transition-colors duration-150"
      style={{
        color: isActive ? "#20231F" : "#626660",
        fontWeight: isActive ? 600 : 400,
      }}
    >
      <span
        aria-hidden
        className="absolute left-0 top-1/2 h-6 w-[2px] -translate-y-1/2 rounded-full transition-opacity duration-150"
        style={{ background: "#7C9482", opacity: isActive ? 1 : 0 }}
      />
      <Icon
        className="h-[18px] w-[18px] shrink-0"
        style={{ color: isActive ? "#7C9482" : "#626660" }}
        aria-hidden
      />
      <span>{label}</span>
    </a>
  );
}

/** Stateful wrapper for standalone rail review. */
export function M7RailDemo() {
  const [active, setActive] = useState("home");
  return <M7Rail active={active} onSelect={setActive} />;
}
