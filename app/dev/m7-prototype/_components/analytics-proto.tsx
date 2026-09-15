"use client";

import { useState } from "react";
import { M7Rail } from "./rail";

/**
 * M7 High-Fidelity Prototype — Analytics / 数据复盘
 * Route: /dev/m7-prototype/analytics (isolated, no records, presentation data)
 *
 * Approved: design-thinking text + mock .shots/analytics-final-v2.png
 * (FACT → COMPARISON → INTERPRETATION → TEST → LEARNING authority chain;
 * functional small text uses #626660 — #8B8E87 is decorative only).
 *
 * Existing Function → New Presentation: publication index + checkpoints,
 * MetricValue[] ledger, account/pillar baselines with n=, deterministic
 * findings, snapshot-modal entry, import-modal, loop-analysis proposal
 * (save/discard), tests-section, learnings-section.
 */

const INK2 = "#626660";
const INK3 = "#8B8E87";

function Motif({ gold }: { gold?: boolean }) {
  const c = gold ? "#D4B26A" : "#7C9482";
  return (
    <svg width="22" height="10" viewBox="0 0 22 10" aria-hidden>
      <line x1="0" y1="5" x2="12" y2="5" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <circle cx="18" cy="5" r="3" fill={c} />
    </svg>
  );
}

function Sec({ title, note, gold }: { title: string; note: string; gold?: boolean }) {
  return (
    <div className="mb-1 flex items-center gap-2">
      <Motif gold={gold} />
      <span className="text-[15px] font-semibold">{title}</span>
      <span className="ml-auto text-xs" style={{ color: INK2 }}>{note}</span>
    </div>
  );
}

const RAW = [
  ["播放", "12,480"],
  ["点赞", "486"],
  ["评论", "37"],
  ["收藏", "92"],
] as const;

const DERIVED: [string, string, string][] = [
  ["点赞率", "点赞 ÷ 播放", "3.9%"],
  ["评论率", "评论 ÷ 播放", "0.30%"],
  ["收藏率", "收藏 ÷ 播放", "0.74%"],
];

const BASELINE: [string, string, string, string, string, string][] = [
  ["播放", "12,480", "10,530", "20", "11,920", "9"],
  ["点赞率", "3.9%", "3.4%", "20", "4.1%", "9"],
  ["收藏率", "0.74%", "0.51%", "20", "0.68%", "9"],
  ["评论率", "0.30%", "0.41%", "20", "0.36%", "9"],
];

const FINDINGS = [
  "播放高于账号中位数 18%，处于最近 20 条的前四分之一。",
  "收藏率高于方向中位数 0.06pt，高于账号中位数 0.23pt。",
  "评论率低于账号中位数 0.11pt——互动入口弱于往期。",
];

function NodeArrow() {
  return (
    <svg width="42" height="11" viewBox="0 0 42 11" aria-hidden>
      <circle cx="3.5" cy="5.5" r="2.6" fill="none" stroke={INK3} strokeWidth="1.3" />
      <line x1="8.5" y1="5.5" x2="32" y2="5.5" stroke={INK3} strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="37" cy="5.5" r="3" fill="#3F7455" />
    </svg>
  );
}

export function AnalyticsProto() {
  const [active, setActive] = useState("analytics");
  const [cp, setCp] = useState("24h");

  return (
    <div className="flex min-h-screen" style={{ background: "#F5F6F3", color: "#20231F" }}>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Noto+Sans+SC:wght@400;500;600&family=Noto+Serif+SC:wght@600&display=swap"
      />
      <M7Rail active={active} onSelect={setActive} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="px-7 pt-[22px]">
          <div className="flex items-baseline gap-3.5">
            <h1 className="text-[19px] font-semibold">Claude Agent 实测（抖音·修正）</h1>
            <span className="ml-auto flex items-center gap-3 text-xs" style={{ color: INK2 }}>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-[5px] w-[5px] rounded-full" style={{ background: "#7C9482" }} />
                已发布
              </span>
              <span style={{ color: INK3 }}>抖音 · 发布于 2026/8/30</span>
            </span>
          </div>
          <div className="mt-3.5 flex gap-6" style={{ borderBottom: "1px solid rgba(200,201,203,0.65)" }}>
            {["24h 数据", "72h 数据", "手动补充"].map((t) => {
              const key = t.replace(" 数据", "");
              const on = cp === key;
              return (
                <button
                  key={t}
                  onClick={() => setCp(key)}
                  className="relative pb-2 text-[13px]"
                  style={{ color: on ? "#20231F" : INK2, fontWeight: on ? 600 : 400 }}
                >
                  {t}
                  {on && <span className="absolute inset-x-0 -bottom-px h-[2px]" style={{ background: "#7C9482" }} />}
                </button>
              );
            })}
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          {/* ── Evidence report (~70%) ── */}
          <div className="flex-1 overflow-y-auto px-7 py-5">
            <Sec title={`表现事实 · ${cp}`} note="录入于 2026/8/31 20:14" />
            <div style={{ borderTop: "1px solid rgba(200,201,203,0.65)" }}>
              <div className="px-1 pb-1.5 pt-3 text-[11px] font-semibold tracking-[0.14em]" style={{ color: INK2 }}>原始指标</div>
              {RAW.map(([k, v]) => (
                <div key={k} className="grid items-baseline px-1 py-2.5" style={{ gridTemplateColumns: "1fr auto", borderBottom: "1px solid rgba(200,201,203,0.4)" }}>
                  <span className="text-[13px]">{k}</span>
                  <span className="text-right text-[14.5px] font-semibold tabular-nums">{v}</span>
                </div>
              ))}
              <div className="px-1 pb-1.5 pt-3.5 text-[11px] font-semibold tracking-[0.14em]" style={{ color: INK2 }}>派生指标</div>
              {DERIVED.map(([k, f, v]) => (
                <div key={k} className="grid items-baseline gap-4 px-1 py-2.5" style={{ gridTemplateColumns: "1fr auto auto", borderBottom: "1px solid rgba(200,201,203,0.4)" }}>
                  <span className="text-[13px]">{k}</span>
                  <span className="text-xs" style={{ color: INK2 }}>{f}</span>
                  <span className="text-right text-[14.5px] font-semibold tabular-nums">{v}</span>
                </div>
              ))}
            </div>

            <div className="mt-6" />
            <Sec title="基线对照" note="最近 20 条可比发布 · 中位数" />
            <div style={{ borderTop: "1px solid rgba(200,201,203,0.65)" }}>
              <div className="grid gap-2.5 px-1 py-2 text-[11.5px]" style={{ gridTemplateColumns: "1.2fr 1fr 1fr 1fr", color: INK2, borderBottom: "1px solid rgba(200,201,203,0.65)" }}>
                <span>指标</span><span className="text-right">当前值</span><span className="text-right">账号中位数</span><span className="text-right">方向中位数</span>
              </div>
              {BASELINE.map(([k, cur, mA, nA, mP, nP]) => (
                <div key={k} className="grid items-baseline gap-2.5 px-1 py-[9px] text-[12.5px]" style={{ gridTemplateColumns: "1.2fr 1fr 1fr 1fr", borderBottom: "1px solid rgba(200,201,203,0.4)" }}>
                  <span>{k}</span>
                  <span className="text-right text-[13.5px] font-semibold tabular-nums">{cur}</span>
                  <span className="text-right tabular-nums" style={{ color: INK2 }}>{mA} <span className="text-[11.5px]">n={nA}</span></span>
                  <span className="text-right tabular-nums" style={{ color: INK2 }}>{mP} <span className="text-[11.5px]">n={nP}</span></span>
                </div>
              ))}
            </div>

            <div className="mt-6" />
            <Sec title="关键观察" note="确定性比较 · 非 AI" />
            <div>
              {FINDINGS.map((f, i) => (
                <div key={i} className="flex gap-3.5 px-1 py-[9px]" style={{ borderBottom: "1px solid rgba(200,201,203,0.4)" }}>
                  <span className="w-5 text-[14px] font-semibold" style={{ fontFamily: '"Cormorant Garamond", serif', color: INK2 }}>
                    0{i + 1}
                  </span>
                  <span className="text-[13px] leading-[1.6]">{f}</span>
                </div>
              ))}
            </div>

            <div className="mt-6" />
            <Sec title="运营测试" note="1 项已结论" />
            <div className="flex items-center gap-3.5 px-1 py-[13px]" style={{ borderBottom: "1px solid rgba(200,201,203,0.4)" }}>
              <div>
                <div className="text-[13.5px] font-semibold">前 3 秒钩子：问题式 vs 陈述式</div>
                <div className="mt-1 text-xs" style={{ color: INK2 }}>方法：内容对比 · 观察指标：3 秒留存 → 播放完成</div>
              </div>
              <span className="ml-auto flex items-center gap-1.5 text-xs" style={{ color: INK2 }}>
                <span className="inline-block h-[5px] w-[5px] rounded-full" style={{ background: "#7C9482" }} />
                支持假设
              </span>
            </div>

            <div className="mt-6" />
            <Sec title="运营经验" note="来自测试 #12" gold />
            <div className="px-1 pb-1 pt-3.5">
              <p style={{ fontFamily: '"Noto Serif SC", serif', fontSize: 17, lineHeight: 1.7 }}>
                “前 3 秒用问题式钩子，比陈述式钩子的播放完成率稳定更高——对实测类内容尤其明显。”
              </p>
              <p className="mt-2 text-xs" style={{ color: INK2 }}>证据：测试 #12 · 2 组对比 · 由 Alex Chen 于 2026/9/2 保存</p>
              <div className="mt-3.5 flex items-center gap-2.5 text-[13px] font-medium" style={{ color: "#3F7455" }}>
                <NodeArrow />
                应用到下一条内容
              </div>
            </div>
          </div>

          {/* ── Loop AI inspector (~30%) ── */}
          <div className="w-[320px] shrink-0 overflow-y-auto p-5" style={{ borderLeft: "1px solid rgba(200,201,203,0.65)", background: "#FBFBF8" }}>
            <div className="text-[13px] font-semibold">Loop AI</div>
            <div className="mt-1.5 flex items-center gap-1.5 text-[11.5px]" style={{ color: INK3 }}>
              <span className="inline-block h-1 w-1 rounded-full" style={{ background: "#D4B26A" }} />
              AI 提供建议，最终由你确认。
            </div>
            {[
              { t: "发生了什么", body: "播放放量高于往期，但评论入口偏弱——传播在发生，对话没有跟上。" },
            ].map((d) => (
              <div key={d.t}>
                <div className="mt-[18px] text-xs font-semibold tracking-[0.04em]" style={{ color: INK2 }}>{d.t}</div>
                <p className="mt-1.5 text-[13px] leading-[1.65]">{d.body}</p>
              </div>
            ))}
            <div className="mt-4 text-xs font-semibold tracking-[0.04em]" style={{ color: INK2 }}>证据</div>
            <ul className="mt-1.5 pl-4 text-[12.5px] leading-[1.65]" style={{ color: INK2 }}>
              <li>播放 12,480，高于账号中位数 18%</li>
              <li>评论率 0.30%，低于账号中位数 0.41%</li>
              <li>收藏率 0.74%，高于方向中位数</li>
            </ul>
            <div className="mt-4 text-xs font-semibold tracking-[0.04em]" style={{ color: INK2 }}>可能原因</div>
            <ul className="mt-1.5 pl-4 text-[12.5px] leading-[1.65]" style={{ color: INK2 }}>
              <li>内容偏“信息密度”，读者收藏备查但不展开讨论</li>
              <li>结尾没有明确的讨论引导</li>
            </ul>
            <div className="mt-2.5 flex items-center gap-1.5 text-xs" style={{ color: INK2 }}>
              <span className="inline-block h-[5px] w-[5px] rounded-full" style={{ background: "#D4B26A" }} />
              置信度：中
            </div>
            <div className="mt-4 text-xs font-semibold tracking-[0.04em]" style={{ color: INK2 }}>下一步建议</div>
            <ul className="mt-1.5 pl-4 text-[12.5px] leading-[1.65]" style={{ color: INK2 }}>
              <li>下一条在结尾加明确的讨论问题</li>
              <li>72h 数据录入后复核评论率走向</li>
            </ul>
            <div className="mt-[18px] flex gap-2">
              <button className="inline-flex h-9 items-center rounded-[6px] px-3.5 text-[12.5px] font-medium" style={{ background: "#7C9482", color: "rgba(255,255,255,0.96)" }}>
                保存诊断
              </button>
              <button className="inline-flex h-[30px] items-center rounded-[5px] px-[11px] text-xs font-medium" style={{ border: "1px solid #C8C9CB", color: "#20231F" }}>
                放弃
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
