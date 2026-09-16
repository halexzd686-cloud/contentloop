"use client";

import { useState } from "react";
import { M7Rail } from "./rail";

/**
 * M7 High-Fidelity Prototype — Settings / 设置
 * Route: /dev/m7-prototype/settings (isolated, no records, presentation data)
 *
 * Approved: design-thinking text + mock .shots/settings-final-v2.png
 * (Utility Index + Configuration Ledger; quietest page — no AI, no motif,
 * all Sans, functional small text in #626660).
 *
 * Existing Function → New Presentation:
 * platform tabs + MetricDef rows + status/edit → existing metrics API ·
 * 新建派生指标 → existing derived dialog · formula preview/caution →
 * buildFormulaPreview + metricCautionLabel · pillars/members → existing
 * read-only GET APIs. Platform Playbook intentionally absent (M8-backlog).
 */

const INK2 = "#626660";

const INDEX = ["指标定义", "内容方向", "团队成员"] as const;
type IndexKey = (typeof INDEX)[number];

const RAW_ROWS: [string, string | null, string, string, boolean, string | null][] = [
  ["点赞", "别名：红心", "likes", "原始 · 计数", true, null],
  ["收藏", null, "saves", "原始 · 计数", true, null],
  ["评论", null, "comments", "原始 · 计数", true, null],
  ["阅读", null, "impressions", "原始 · 计数", false, "仅当平台数据源能够提供该指标时再启用"],
];

const DERIVED_ROWS: [string, string, string, string][] = [
  ["点赞率", "like_rate", "派生 · 百分比", "点赞 ÷ 阅读"],
  ["收藏率", "save_rate", "派生 · 百分比", "收藏 ÷ 阅读"],
  ["赞阅比", "like_view_ratio", "派生 · 比值", "点赞 : 阅读"],
];

const PILLARS: [string, string][] = [
  ["AI 工作流", "AI 工具的实测、方法论与团队分工变化"],
  ["平台策略", "小红书 / Bilibili / 抖音 的内容节奏与打法"],
];

const MEMBERS: [string, string][] = [
  ["Alex Chen", "负责人 · 审核人"],
];

function Ledger() {
  return (
    <div
      className="max-w-[780px] rounded-[5px] px-[26px] py-5"
      style={{ background: "#FBFBF8", border: "1px solid rgba(200,201,203,0.5)" }}
    >
      <div className="flex gap-6" style={{ borderBottom: "1px solid rgba(200,201,203,0.65)" }}>
        {["小红书", "Bilibili", "抖音"].map((p, i) => (
          <span
            key={p}
            className="relative pb-2 text-[13px]"
            style={{ color: i === 0 ? "#20231F" : INK2, fontWeight: i === 0 ? 600 : 400 }}
          >
            {p}
            {i === 0 && <span className="absolute inset-x-0 -bottom-px h-[2px]" style={{ background: "#7C9482" }} />}
          </span>
        ))}
        <span className="ml-auto pb-2 text-[12.5px]" style={{ color: INK2 }}>新建派生指标</span>
      </div>

      <div className="px-1 pb-1 pt-3.5 text-[11px] font-semibold tracking-[0.14em]" style={{ color: INK2 }}>原始指标</div>
      <div
        className="grid gap-3 px-1 py-2 text-[11px] font-semibold tracking-[0.1em]"
        style={{ gridTemplateColumns: "1.5fr 1fr 1.1fr 0.75fr 0.5fr", color: INK2, borderBottom: "1px solid rgba(200,201,203,0.65)" }}
      >
        <span>显示名</span><span>技术键</span><span>类型</span><span>状态</span><span></span>
      </div>
      {RAW_ROWS.map(([dn, alias, key, type, active, caution]) => (
        <div
          key={key}
          className="grid items-baseline gap-3 px-1 py-[11px]"
          style={{ gridTemplateColumns: "1.5fr 1fr 1.1fr 0.75fr 0.5fr", borderBottom: "1px solid rgba(200,201,203,0.4)" }}
        >
          <span className="text-[13.5px] font-semibold">
            {dn}
            {alias && <span className="mt-0.5 block text-[11.5px] font-normal" style={{ color: INK2 }}>{alias}</span>}
          </span>
          <span className="text-xs" style={{ color: INK2, fontFamily: "ui-monospace, 'SF Mono', monospace" }}>{key}</span>
          <span className="text-xs" style={{ color: INK2 }}>
            {type}
            {caution && <span className="mt-0.5 block text-[11.5px]">⚠ {caution}</span>}
          </span>
          <span className="flex items-center gap-1.5 text-xs" style={{ color: INK2 }}>
            <span className="inline-block h-[5px] w-[5px] rounded-full" style={{ background: active ? "#7C9482" : "#C8C9CB" }} />
            {active ? "启用" : "停用"}
          </span>
          <span className="text-xs" style={{ color: "#3F7455" }}>编辑</span>
        </div>
      ))}

      <div className="px-1 pb-1 pt-3.5 text-[11px] font-semibold tracking-[0.14em]" style={{ color: INK2 }}>派生指标</div>
      {DERIVED_ROWS.map(([dn, key, type, fx], i) => (
        <div
          key={key}
          className="grid items-baseline gap-3 px-1 py-[11px]"
          style={{ gridTemplateColumns: "1.5fr 1fr 1.1fr 0.75fr 0.5fr", borderBottom: i < DERIVED_ROWS.length - 1 ? "1px solid rgba(200,201,203,0.4)" : "none" }}
        >
          <span className="text-[13.5px] font-semibold">{dn}</span>
          <span className="text-xs" style={{ color: INK2, fontFamily: "ui-monospace, 'SF Mono', monospace" }}>{key}</span>
          <span className="text-xs" style={{ color: INK2 }}>
            {type}
            <span className="mt-0.5 block text-[11.5px]">{fx}</span>
          </span>
          <span className="flex items-center gap-1.5 text-xs" style={{ color: INK2 }}>
            <span className="inline-block h-[5px] w-[5px] rounded-full" style={{ background: "#7C9482" }} />
            启用
          </span>
          <span className="text-xs" style={{ color: "#3F7455" }}>编辑</span>
        </div>
      ))}
    </div>
  );
}

export function SettingsProto() {
  const [active, setActive] = useState("settings");
  const [section, setSection] = useState<IndexKey>("指标定义");

  return (
    <div className="flex min-h-screen" style={{ background: "#F5F6F3", color: "#20231F" }}>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Noto+Sans+SC:wght@400;500;600&display=swap"
      />
      <M7Rail active={active} onSelect={setActive} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="px-7 pb-[18px] pt-6" style={{ borderBottom: "1px solid rgba(200,201,203,0.65)" }}>
          <h1 className="text-[24px] font-semibold leading-tight">设置</h1>
        </header>

        <div className="flex min-h-0 flex-1">
          {/* Utility Index */}
          <nav
            className="sticky top-0 w-[184px] shrink-0 py-[18px]"
            style={{ borderRight: "1px solid rgba(200,201,203,0.65)", background: "#EBECE7" }}
          >
            {INDEX.map((s) => {
              const on = section === s;
              return (
                <button
                  key={s}
                  onClick={() => setSection(s)}
                  className="relative block w-full px-5 py-[9px] text-left text-[13px]"
                  style={{ color: on ? "#20231F" : INK2, fontWeight: on ? 600 : 400 }}
                >
                  {on && (
                    <span
                      className="absolute left-0 top-1/2 h-[18px] w-[2px] -translate-y-1/2 rounded-full"
                      style={{ background: "#7C9482" }}
                    />
                  )}
                  {s}
                </button>
              );
            })}
          </nav>

          <div className="flex-1 overflow-y-auto px-7 py-[22px]">
            {section === "指标定义" && <Ledger />}

            {section === "内容方向" && (
              <div
                className="max-w-[780px] rounded-[5px] px-[26px] py-5"
                style={{ background: "#FBFBF8", border: "1px solid rgba(200,201,203,0.5)" }}
              >
                {PILLARS.map(([n, d], i) => (
                  <div key={n} className="px-1 py-3" style={{ borderBottom: i < PILLARS.length - 1 ? "1px solid rgba(200,201,203,0.4)" : "none" }}>
                    <div className="text-[13.5px] font-semibold">{n}</div>
                    <div className="mt-1 text-[12.5px] leading-[1.6]" style={{ color: INK2 }}>{d}</div>
                  </div>
                ))}
              </div>
            )}

            {section === "团队成员" && (
              <div
                className="max-w-[780px] rounded-[5px] px-[26px] py-5"
                style={{ background: "#FBFBF8", border: "1px solid rgba(200,201,203,0.5)" }}
              >
                {MEMBERS.map(([n, r], i) => (
                  <div key={n} className="flex items-baseline gap-3 px-1 py-[11px]" style={{ borderBottom: i < MEMBERS.length - 1 ? "1px solid rgba(200,201,203,0.4)" : "none" }}>
                    <span className="text-[13.5px] font-semibold">{n}</span>
                    <span className="text-xs" style={{ color: INK2 }}>{r}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
