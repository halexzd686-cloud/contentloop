"use client";

import { useState } from "react";
import { M7Rail } from "./rail";

/**
 * M7 High-Fidelity Prototype — Radar / 选题雷达
 * Route: /dev/m7-prototype/radar (isolated, no records, presentation data)
 *
 * Approved: design-thinking text (three-layer authority) + mock
 * .shots/radar-final-1440.png + score in Playfair Display with primary
 * rule (score-f3.png). Trajectory actions: none on this page — advancing
 * happens only through the 创建内容 primary button (spec §49).
 *
 * Existing Function → New Presentation:
 * tabs+counts → status filter API · search → search param · rows →
 * SignalCard data · selected rail → selectedSignalId · Review Sheet →
 * QuickReview (score/dims/why/audience/risk/angles) · AI 分析 → analyze
 * API · 跳过 → PATCH skipped · 创建内容 → POST create-content ·
 * 新增线索 → AddSignalDialog.
 */

const TABS = [
  { key: "all", label: "全部", n: 4 },
  { key: "new", label: "新线索", n: 1 },
  { key: "reviewing", label: "评估中", n: 1 },
  { key: "selected", label: "已选用", n: 1 },
  { key: "skipped", label: "已跳过", n: 1 },
];

const SIGNALS = [
  { idx: "01", title: "AI Agent 正在重塑内容团队的分工", meta: "公众号 · AI 工作流 · 评分 85", status: "评估中", dot: "#7C9482", on: false },
  { idx: "02", title: "Claude Code 实测：一周真实使用报告", meta: "Bilibili · 工具实测 · 评分 76", status: "已选用", dot: "#D4B26A", on: true },
  { idx: "03", title: "小红书品牌号的内容节奏", meta: "小红书 · 平台策略 · 未评分", status: "新线索", dot: "#C8C9CB", on: false },
  { idx: "04", title: "2026 内容营销趋势观察", meta: "文章 · 行业观察 · 评分 68", status: "已跳过", dot: "#8B8E87", on: false },
];

const ANGLES = [
  { n: "01", t: "从“人不会被替代，分工会被重写”切入", d: "以团队分工变化为主线，实测证据为支撑。", sel: true },
  { n: "02", t: "一周实测：哪些环节真的省了时间", d: "逐环节记录，用时间账说话。", sel: false },
  { n: "03", t: "选型决策框架：什么团队适合上手", d: "给评估者一个可执行的判断清单。", sel: false },
];

export function RadarProto() {
  const [active, setActive] = useState("radar");
  const [tab, setTab] = useState("all");

  return (
    <div className="flex min-h-screen" style={{ background: "#F5F6F3", color: "#20231F" }}>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Noto+Sans+SC:wght@400;500;600&family=Noto+Serif+SC:wght@600&family=Playfair+Display:wght@600&display=swap"
      />
      <M7Rail active={active} onSelect={setActive} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header: title + real status summary + add */}
        <header
          className="flex items-end justify-between px-8 pb-[18px] pt-6"
          style={{ borderBottom: "1px solid rgba(200,201,203,0.65)" }}
        >
          <div>
            <h1 className="text-[24px] font-semibold leading-tight">选题雷达</h1>
            <p className="mt-1.5 text-[12.5px]" style={{ color: "#626660" }}>
              4 条线索 · 1 条已选用 · 1 条待评估
            </p>
          </div>
          <button
            className="inline-flex h-10 items-center rounded-[6px] px-4 text-[13.5px] font-medium"
            style={{ background: "#7C9482", color: "rgba(255,255,255,0.96)" }}
          >
            新增线索
          </button>
        </header>

        <div className="flex min-h-0 flex-1">
          {/* ── Left 55%: Research Index ── */}
          <div className="w-[55%] px-6 py-4" style={{ borderRight: "1px solid rgba(200,201,203,0.65)" }}>
            <div
              className="flex items-center justify-between"
              style={{ borderBottom: "1px solid rgba(200,201,203,0.65)" }}
            >
              <div className="flex gap-6">
                {TABS.map((t) => {
                  const on = tab === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setTab(t.key)}
                      className="relative pb-2 text-[13px]"
                      style={{
                        color: on ? "#20231F" : "#626660",
                        fontWeight: on ? 600 : 400,
                      }}
                    >
                      {t.label}
                      <span className="ml-[3px] text-[11px] tabular-nums" style={{ color: "#8B8E87" }}>
                        {t.n}
                      </span>
                      {on && (
                        <span
                          className="absolute inset-x-0 bottom-0 h-[2px]"
                          style={{ background: "#7C9482" }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
              <span className="pb-2 text-xs" style={{ color: "#8B8E87" }}>搜索…</span>
            </div>

            <div className="mt-1">
              {SIGNALS.map((s) => (
                <div
                  key={s.idx}
                  className="relative flex cursor-pointer items-center gap-4 px-3 py-[13px] transition-colors duration-150 hover:bg-[rgba(124,148,130,0.05)]"
                  style={{
                    borderBottom: "1px solid rgba(200,201,203,0.4)",
                    background: s.on ? "rgba(124,148,130,0.07)" : undefined,
                  }}
                >
                  {s.on && (
                    <span
                      className="absolute left-0 top-1/2 h-6 w-[2px] -translate-y-1/2 rounded-full"
                      style={{ background: "#7C9482" }}
                    />
                  )}
                  <span
                    className="w-5 text-[14px]"
                    style={{ fontFamily: '"Cormorant Garamond", serif', color: "#8B8E87" }}
                  >
                    {s.idx}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14.5px] font-semibold">{s.title}</div>
                    <div className="mt-1 text-xs" style={{ color: "#626660" }}>{s.meta}</div>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs" style={{ color: "#626660" }}>
                    <span className="inline-block h-[5px] w-[5px] rounded-full" style={{ background: s.dot }} />
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right 45%: Review Sheet ── */}
          <div className="w-[45%] overflow-y-auto" style={{ background: "#FBFBF8" }}>
            <div className="px-[26px] py-5">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] font-medium tracking-[0.14em]" style={{ color: "#8B8E87" }}>
                  快速评估
                </span>
                <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "#8B8E87" }}>
                  <span className="inline-block h-1 w-1 rounded-full" style={{ background: "#D4B26A" }} />
                  AI 分析 · 由你确认
                </span>
              </div>
              <h2 className="mt-2 text-[17px] font-semibold leading-relaxed">
                Claude Code 实测：一周真实使用报告
              </h2>
              <p className="mt-[5px] text-xs" style={{ color: "#626660" }}>
                Bilibili · 工具实测 · 2 天前
              </p>

              <hr className="my-[15px]" style={{ border: "none", borderTop: "1px solid rgba(200,201,203,0.65)" }} />

              {/* Score — Playfair Display numeral + primary rule (approved F3+D) */}
              <div className="flex items-end gap-4">
                <span className="inline-flex flex-col">
                  <span
                    style={{
                      fontFamily: '"Playfair Display", serif',
                      fontWeight: 600,
                      fontSize: 46,
                      lineHeight: 1,
                    }}
                  >
                    85
                  </span>
                  <span className="mt-2 w-full" style={{ borderTop: "1.5px solid #7C9482" }} />
                </span>
                <span className="pb-[5px] text-xs" style={{ color: "#8B8E87" }}>
                  选题评分<span> / 100</span>
                </span>
              </div>
              <div className="mt-3">
                {[
                  ["受众匹配", "88"],
                  ["时机", "81"],
                  ["内容潜力", "86"],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-baseline justify-between py-[6px] text-[13px]"
                    style={{ borderBottom: "1px solid rgba(200,201,203,0.4)" }}
                  >
                    <span>{k}</span>
                    <span className="text-[13.5px] font-semibold tabular-nums">{v}</span>
                  </div>
                ))}
              </div>

              <hr className="my-[15px]" style={{ border: "none", borderTop: "1px solid rgba(200,201,203,0.65)" }} />

              <div>
                <div className="text-[13.5px] font-semibold">为什么值得做</div>
                <p className="mt-[7px] text-[13.5px] leading-[1.65]" style={{ color: "#626660" }}>
                  团队正在真实使用这套工具，实测类内容对正在选型的读者有直接决策价值；当前平台上多数内容停留在功能介绍，缺少一周级别的真实使用证据。
                </p>
              </div>

              <hr className="my-[15px]" style={{ border: "none", borderTop: "1px solid rgba(200,201,203,0.65)" }} />

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <div className="text-xs font-semibold" style={{ color: "#626660" }}>受众匹配</div>
                  <p className="mt-1.5 text-[13px] leading-[1.6]" style={{ color: "#626660" }}>
                    正在评估 AI 工具的内容团队负责人与执行者。
                  </p>
                </div>
                <div>
                  <div className="text-xs font-semibold" style={{ color: "#626660" }}>内容风险</div>
                  <p className="mt-1.5 text-[13px] leading-[1.6]" style={{ color: "#626660" }}>
                    工具迭代快，结论需标注测试版本与时间。
                  </p>
                </div>
              </div>

              <hr className="my-[15px]" style={{ border: "none", borderTop: "1px solid rgba(200,201,203,0.65)" }} />

              <div>
                <div className="mb-1.5 text-[13.5px] font-semibold">可选角度</div>
                {ANGLES.map((a) => (
                  <div
                    key={a.n}
                    className="relative flex gap-3.5 px-2 py-2"
                    style={{
                      borderBottom: "1px solid rgba(200,201,203,0.4)",
                      background: a.sel ? "rgba(124,148,130,0.07)" : undefined,
                    }}
                  >
                    {a.sel && (
                      <span
                        className="absolute left-0 top-1/2 h-[22px] w-[2px] -translate-y-1/2 rounded-full"
                        style={{ background: "#7C9482" }}
                      />
                    )}
                    <span
                      className="w-5 text-[14px]"
                      style={{ fontFamily: '"Cormorant Garamond", serif', color: "#8B8E87" }}
                    >
                      {a.n}
                    </span>
                    <div>
                      <div className="text-[13.5px] font-semibold">{a.t}</div>
                      <div className="mt-[3px] text-[12.5px] leading-[1.55]" style={{ color: "#626660" }}>
                        {a.d}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between">
                <span className="cursor-pointer text-[12.5px]" style={{ color: "#626660" }}>
                  跳过线索
                </span>
                <button
                  className="inline-flex h-10 items-center rounded-[6px] px-4 text-[13.5px] font-medium"
                  style={{ background: "#7C9482", color: "rgba(255,255,255,0.96)" }}
                >
                  创建内容
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
