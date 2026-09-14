"use client";

import { useState } from "react";
import { M7Rail } from "./rail";

/**
 * M7 High-Fidelity Prototype — Pipeline / 内容流程
 * Route: /dev/m7-prototype/pipeline (isolated, no records, presentation data)
 *
 * Approved: design-thinking text + mock .shots/pipeline-final-v2.png.
 * Open Columns (no column containers) · ──● column headers with stage
 * colors · document-surface tiles with hairline + StatusMarker facts ·
 * Quiet Buttons only where a real action exists. Zero AI, zero
 * trajectory actions, zero rainbow status colors.
 *
 * Existing Function → New Presentation:
 * 5 columns → COLUMNS/status · tiles → PipelineItem + PlatformChips data ·
 * drag → dnd-kit + PATCH status + server-reject revert (prototype:
 * presentation only) · tile click → detail drawer · quiet actions →
 * studio/review/analytics routes · DEMO badge → isDemo.
 */

interface Tile {
  title: string;
  fact: string;
  owner: string;
  demo?: boolean;
  action?: string;
}

interface Col {
  key: string;
  name: string;
  color: string;
  tiles: Tile[];
}

const COLS: Col[] = [
  {
    key: "planning",
    name: "策划中",
    color: "#C8C9CB",
    tiles: [{ title: "Our Content Workflow 2026", fact: "暂无平台版本 · 简报已确认", owner: "Alex Chen" }],
  },
  {
    key: "in_progress",
    name: "制作中",
    color: "#7C9482",
    tiles: [{ title: "Claude Code 实测：一周真实使用报告", fact: "小红书 · 审核清单 3/5", owner: "Alex Chen" }],
  },
  {
    key: "review",
    name: "待审核",
    color: "#D4B26A",
    tiles: [{ title: "Top 5 AI Tools for Content Creators", fact: "Bilibili · 等待审核", owner: "Alex Chen", action: "去审核" }],
  },
  {
    key: "scheduled",
    name: "待发布",
    color: "rgba(124,148,130,0.55)",
    tiles: [{ title: "很多第一次使用 WorkBuddy 的人会把它当成普通聊天机器人…", fact: "Bilibili · 已排期 2026/9/15", owner: "Alex Chen" }],
  },
  {
    key: "published",
    name: "已发布",
    color: "#8B8E87",
    tiles: [
      { title: "Claude Agent 实测（抖音·修正）", fact: "抖音 · 发布于 2026/8/30 · 24h 数据已录入 · 72h 待录入", owner: "Alex Chen", demo: true, action: "查看复盘" },
      { title: "AI content workflow optimization", fact: "小红书 · 发布于 2026/8/28 · 24h 数据已录入", owner: "Alex Chen", action: "查看复盘" },
    ],
  },
];

function ColMotif({ color }: { color: string }) {
  return (
    <svg width="22" height="10" viewBox="0 0 22 10" aria-hidden>
      <line x1="0" y1="5" x2="12" y2="5" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <circle cx="18" cy="5" r="3" fill={color} />
    </svg>
  );
}

export function PipelineProto() {
  const [active, setActive] = useState("pipeline");

  return (
    <div className="flex min-h-screen" style={{ background: "#F5F6F3", color: "#20231F" }}>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Noto+Sans+SC:wght@400;500;600&display=swap"
      />
      <M7Rail active={active} onSelect={setActive} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="px-8 pt-6">
          <h1 className="text-[24px] font-semibold leading-tight">内容流程</h1>
          <p className="mt-1.5 text-[12.5px]" style={{ color: "#626660" }}>
            6 条内容 · 五阶段 · 拖动卡片推进阶段
          </p>
        </header>

        <div
          className="grid flex-1 content-start gap-5 px-8 pt-6"
          style={{ gridTemplateColumns: "repeat(5, 1fr)" }}
        >
          {COLS.map((col) => (
            <div key={col.key}>
              {/* ──● column header + hairline with stage segment */}
              <div
                className="relative flex items-center gap-2 pb-2.5"
                style={{ borderBottom: "1px solid rgba(200,201,203,0.65)", color: col.color }}
              >
                <ColMotif color={col.color} />
                <span className="text-[13px] font-semibold" style={{ color: "#20231F" }}>
                  {col.name}
                </span>
                <span className="ml-auto text-xs tabular-nums" style={{ color: "#8B8E87" }}>
                  {col.tiles.length}
                </span>
                <span
                  className="absolute -bottom-px left-0 h-[2px] w-[22px]"
                  style={{ background: col.color }}
                />
              </div>

              {col.tiles.map((tile) => (
                <div
                  key={tile.title}
                  className="mt-3 cursor-pointer rounded-[5px] px-[15px] py-[13px]"
                  style={{ background: "#FBFBF8", border: "1px solid rgba(200,201,203,0.55)" }}
                >
                  <div className="text-[14px] font-semibold leading-[1.5]">{tile.title}</div>
                  <hr className="my-2" style={{ border: "none", borderTop: "1px solid rgba(200,201,203,0.4)" }} />
                  <div className="flex items-center gap-1.5 text-xs leading-[1.55]" style={{ color: "#626660" }}>
                    <span className="inline-block h-[5px] w-[5px] shrink-0 rounded-full" style={{ background: col.color }} />
                    {tile.fact}
                  </div>
                  <div className="mt-[9px] flex items-baseline justify-between text-[11.5px]" style={{ color: "#8B8E87" }}>
                    <span>{tile.owner}</span>
                    {tile.demo && (
                      <span className="rounded-[3px] px-[5px] py-px text-[10px] font-semibold tracking-[0.06em]" style={{ border: "1px solid #C8C9CB", color: "#8B8E87" }}>
                        DEMO
                      </span>
                    )}
                  </div>
                  {tile.action && (
                    <div className="mt-3 flex gap-2">
                      <button
                        className="inline-flex h-[30px] items-center rounded-[5px] px-[11px] text-xs font-medium"
                        style={{ border: "1px solid #C8C9CB", color: "#20231F", background: "transparent" }}
                      >
                        {tile.action}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
