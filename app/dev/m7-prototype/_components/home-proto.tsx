"use client";

import { useState } from "react";
import { M7Rail } from "./rail";

/**
 * M7 High-Fidelity Prototype — Home / Today Desk
 * Route: /dev/m7-prototype/home (isolated, no records)
 *
 * Spec: ContentLoop_M7_Visual_Design_Spec.md §38–41
 * Accepted decisions: H1 spec-baseline layout (mock home-H1.png) +
 * TrajectoryAction C 双节点推进 (mock hd-a3.png) + icons XIII 金属刻度.
 *
 * Existing Function → New Presentation (presentation-only data here):
 * - 待处理 rows → existing dueMetrics (→ /app/analytics?publication&checkpoint)
 *   and reviewContents (→ /app/studio/[id])
 * - 继续创作 DraftStrip → existing in-progress content (→ /app/studio/[id])
 * - 跟进中 monitoring rows → existing scheduled/published items
 * Header: only 首页. No eyebrow / slogan / greeting / date / avatar / KPI.
 */

function NodeArrow() {
  /* TrajectoryAction C: hollow silver node → line → filled green node */
  return (
    <svg width="42" height="11" viewBox="0 0 42 11" aria-hidden>
      <circle cx="3.5" cy="5.5" r="2.6" fill="none" stroke="#8B8E87" strokeWidth="1.3" />
      <line x1="8.5" y1="5.5" x2="32" y2="5.5" stroke="#8B8E87" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="37" cy="5.5" r="3" fill="#3F7455" />
    </svg>
  );
}

function SectionMotif() {
  return (
    <svg width="22" height="10" viewBox="0 0 22 10" aria-hidden>
      <line x1="0" y1="5" x2="12" y2="5" stroke="#7C9482" strokeWidth="2" strokeLinecap="round" />
      <circle cx="18" cy="5" r="3" fill="#7C9482" />
    </svg>
  );
}

const DUE_ROWS = [
  { idx: "01", title: "Claude Agent 实测（抖音·修正）", meta: "抖音 · 24h 数据自 2026/8/31 起待录入", action: "录入 24h 数据" },
  { idx: "02", title: "Claude Agent 实测（抖音·修正）", meta: "抖音 · 72h 数据自 2026/9/2 起待录入", action: "录入 72h 数据" },
  { idx: "03", title: "Top 5 AI Tools for Content Creators", meta: "等待审核", action: "去审核" },
];

const MONITOR_ROWS = [
  { title: "很多第一次使用 WorkBuddy 的人会把它当成普通聊天…", platform: "Bilibili", status: "待发布" },
  { title: "AI content workflow optimization", platform: "小红书", status: "待发布" },
];

export function HomeProto() {
  const [active, setActive] = useState("home");

  return (
    <div className="flex min-h-screen" style={{ background: "#F5F6F3", color: "#20231F" }}>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Noto+Sans+SC:wght@400;500;600&display=swap"
      />
      <M7Rail active={active} onSelect={setActive} />

      <main className="flex-1 overflow-y-auto px-8 pt-8">
        <h1 className="text-[26px] font-semibold leading-tight">首页</h1>

        <div className="mt-8 grid gap-8" style={{ gridTemplateColumns: "1.6fr 1fr" }}>
          {/* ── 待处理: numbered operational rows ── */}
          <section>
            <div className="mb-3.5 flex items-baseline gap-2">
              <SectionMotif />
              <span className="text-[15px] font-semibold">待处理</span>
              <span className="ml-auto text-xs tabular-nums" style={{ color: "#8B8E87" }}>3</span>
            </div>
            <div style={{ borderTop: "1px solid rgba(200,201,203,0.65)" }}>
              {DUE_ROWS.map((r) => (
                <div
                  key={r.idx}
                  className="flex items-center gap-[18px] px-2.5 py-[15px] transition-colors duration-150 hover:bg-[rgba(124,148,130,0.05)]"
                  style={{ borderBottom: "1px solid rgba(200,201,203,0.4)", cursor: "pointer" }}
                >
                  <span
                    className="w-[22px] text-[15px]"
                    style={{ fontFamily: '"Cormorant Garamond", serif', color: "#8B8E87" }}
                  >
                    {r.idx}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-semibold">{r.title}</div>
                    <div className="mt-1 text-xs" style={{ color: "#626660" }}>{r.meta}</div>
                  </div>
                  <span className="flex items-center gap-2.5 text-[13px] font-medium" style={{ color: "#3F7455" }}>
                    <NodeArrow />
                    {r.action}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* ── Right column ── */}
          <section>
            <div className="mb-3.5 flex items-baseline gap-2">
              <SectionMotif />
              <span className="text-[15px] font-semibold">继续创作</span>
              <span className="ml-auto text-xs tabular-nums" style={{ color: "#8B8E87" }}>1</span>
            </div>
            {/* DraftStrip: 2px primary left rail, no card */}
            <div className="py-4 pl-[18px]" style={{ borderLeft: "2px solid #7C9482" }}>
              <div className="text-[16px] font-semibold">Our Content Workflow 2026</div>
              <div className="mt-2 flex items-center gap-[7px] text-xs" style={{ color: "#626660" }}>
                <span className="inline-block h-[5px] w-[5px] rounded-full" style={{ background: "#7C9482" }} />
                策划中
                <span style={{ color: "#8B8E87" }}>·</span>
                <span style={{ color: "#8B8E87" }}>Alex Chen</span>
              </div>
              <div className="mt-3 text-[13px]" style={{ color: "#626660" }}>内容简报已确认</div>
              <div className="mt-1.5 text-[13px]" style={{ color: "#626660" }}>下一步：创建内容母稿</div>
              <div className="mt-4">
                <span className="flex items-center gap-2.5 text-[13px] font-medium" style={{ color: "#3F7455", cursor: "pointer" }}>
                  <NodeArrow />
                  继续编辑
                </span>
              </div>
            </div>

            {/* ── 跟进中: monitoring rows, no arrows ── */}
            <div className="mb-3 mt-7 flex items-baseline gap-2">
              <SectionMotif />
              <span className="text-[15px] font-semibold">跟进中</span>
              <span className="ml-auto text-xs tabular-nums" style={{ color: "#8B8E87" }}>2</span>
            </div>
            <div style={{ borderTop: "1px solid rgba(200,201,203,0.65)" }}>
              {MONITOR_ROWS.map((r) => (
                <div
                  key={r.title}
                  className="px-2.5 py-3 transition-colors duration-150 hover:bg-[rgba(124,148,130,0.05)]"
                  style={{ borderBottom: "1px solid rgba(200,201,203,0.4)", cursor: "pointer" }}
                >
                  <div className="text-[14px] font-medium">{r.title}</div>
                  <div className="mt-[5px] flex items-center gap-[7px] text-xs" style={{ color: "#626660" }}>
                    {r.platform} ·
                    <span className="inline-block h-[5px] w-[5px] rounded-full" style={{ background: "#7C9482" }} />
                    {r.status}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
