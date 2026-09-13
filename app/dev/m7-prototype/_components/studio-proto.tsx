"use client";

import { useState } from "react";
import { M7Rail } from "./rail";
import { ThinkingOrbs } from "@/components/motion/thinking-orbs";

/**
 * M7 High-Fidelity Prototype — Studio / 内容工作台
 * Route: /dev/m7-prototype/studio (isolated, no records, presentation data)
 *
 * Approved (mock .shots/studio-s1..s6.png):
 * - header meta: 制作中 · 待发布平台 · 负责人 · 审核人
 * - Brief editing state + approved state with confirmation info
 * - Master document blocks, Platform versions, Review proof sheet
 * - redesigned Loop AI action button (orbit glyph)
 * - Thinking state uses the FROZEN ThinkingOrbs motion component
 *
 * Existing Function → New Presentation: all controls map to existing
 * studio functions (brief fields/autosave/approve/edit lock, master
 * modules, platform versions, review checklist, loop-ai draft flow).
 */

const TABS = ["内容简报", "内容母稿", "平台版本", "审核"] as const;
type Tab = (typeof TABS)[number];

function Meta() {
  return (
    <span className="flex items-center gap-3.5 text-xs" style={{ color: "#626660" }}>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-[5px] w-[5px] rounded-full" style={{ background: "#7C9482" }} />
        制作中
      </span>
      <span style={{ color: "#8B8E87" }}>待发布平台：小红书</span>
      <span style={{ color: "#8B8E87" }}>负责人：Alex Chen</span>
      <span style={{ color: "#8B8E87" }}>审核人：Alex Chen</span>
    </span>
  );
}

function Sources() {
  return (
    <div className="w-[218px] shrink-0 overflow-y-auto p-[18px]" style={{ borderRight: "1px solid rgba(200,201,203,0.65)" }}>
      <span className="text-[11px] font-medium tracking-[0.14em]" style={{ color: "#8B8E87" }}>来源</span>
      <div className="mt-3.5 pl-3" style={{ borderLeft: "2px solid #7C9482" }}>
        <div className="text-[11px]" style={{ color: "#8B8E87" }}>选题线索</div>
        <div className="mt-1 text-[13px] font-semibold leading-normal">Claude Code 实测：一周真实使用报告</div>
        <div className="mt-1 text-xs leading-[1.55]" style={{ color: "#626660" }}>
          已选角度：从“人不会被替代，分工会被重写”切入 · 评分 76
        </div>
      </div>
      <div className="mt-3.5 pl-3" style={{ borderLeft: "2px solid rgba(200,201,203,0.65)" }}>
        <div className="text-[11px]" style={{ color: "#8B8E87" }}>运营经验</div>
        <div className="mt-1 text-[13px] font-semibold leading-normal">前 3 秒钩子决定完播</div>
        <div className="mt-1 text-xs leading-[1.55]" style={{ color: "#626660" }}>
          来自测试 #12 · 应用于本内容
        </div>
      </div>
    </div>
  );
}

function AiButton({ label, onClick }: { label: string; onClick?: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="mt-5 flex h-11 w-full items-center justify-center gap-2.5 rounded-[6px] text-[13px] font-medium transition-colors duration-150"
      style={{
        border: `1px solid ${hover ? "#7C9482" : "rgba(200,201,203,0.9)"}`,
        background: "linear-gradient(180deg, #FFFFFF 0%, #F6F7F2 100%)",
        color: "#20231F",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C9482" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
        <ellipse cx="12" cy="12" rx="8.5" ry="3.6" transform="rotate(-24 12 12)" />
        <ellipse cx="12" cy="12" rx="8.5" ry="3.6" transform="rotate(38 12 12)" opacity="0.55" />
        <circle cx="12" cy="12" r="1.9" fill="#7C9482" stroke="none" />
        <circle cx="18.6" cy="7.8" r="1.3" fill="#D4B26A" stroke="none" />
      </svg>
      {label}
    </button>
  );
}

function Inspector({
  thinking,
  onGenerate,
  note,
  cta,
}: {
  thinking?: boolean;
  onGenerate?: () => void;
  note: string;
  cta?: { label: string; onClick?: () => void };
}) {
  return (
    <div className="w-[248px] shrink-0 overflow-y-auto p-[18px]" style={{ borderLeft: "1px solid rgba(200,201,203,0.65)", background: "#FBFBF8" }}>
      <div className="text-[13px] font-semibold">Loop AI</div>
      <div className="mt-1.5 flex items-center gap-1.5 text-[11.5px]" style={{ color: "#8B8E87" }}>
        <span className="inline-block h-1 w-1 rounded-full" style={{ background: "#D4B26A" }} />
        AI 提供建议，最终由你确认。
      </div>
      {thinking ? (
        <div className="mt-6 flex flex-col items-center gap-3">
          <ThinkingOrbs size={56} />
          <span className="text-[12.5px]" style={{ color: "#626660" }}>正在生成简报草稿…</span>
        </div>
      ) : (
        cta && <AiButton label={cta.label} onClick={cta.onClick ?? onGenerate} />
      )}
      <p className="mt-3.5 text-xs leading-[1.6]" style={{ color: "#626660" }}>{note}</p>
    </div>
  );
}

function Field({ label, value, focus }: { label: string; value: string; focus?: boolean }) {
  return (
    <div className="mt-[22px]">
      <div className="text-xs font-semibold tracking-[0.04em]" style={{ color: "#626660" }}>{label}</div>
      <div
        className="mt-[7px] pb-[9px] text-[14.5px] leading-[1.7]"
        style={{ borderBottom: `1px solid ${focus ? "#7C9482" : "rgba(200,201,203,0.4)"}` }}
      >
        {value}
      </div>
    </div>
  );
}

function DocShell({
  title,
  right,
  sub,
  children,
}: {
  title: React.ReactNode;
  right?: React.ReactNode;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 justify-center overflow-y-auto px-[34px] py-6">
      <div
        className="w-full max-w-[640px] self-start rounded-[5px] px-[38px] py-8"
        style={{ background: "#FBFBF8", border: "1px solid rgba(200,201,203,0.4)" }}
      >
        <div className="flex items-baseline justify-between">
          <span style={{ fontFamily: '"Noto Serif SC", serif', fontSize: 18, fontWeight: 600 }}>{title}</span>
          {right}
        </div>
        <p className="mt-1.5 text-[12.5px]" style={{ color: "#626660" }}>{sub}</p>
        {children}
      </div>
    </div>
  );
}

const BRIEF_FIELDS: [string, string, boolean?][] = [
  ["目标读者", "正在评估 AI 工具的内容团队负责人与执行者"],
  ["读者问题", "不知道这套工具值不值得让团队上手"],
  ["核心问题", "一周真实使用之后，哪些环节真的变了？"],
  ["切入角度", "从“人不会被替代，分工会被重写”切入，用一周实测的分工变化说话", true],
  ["内容承诺", "给出可复用的一周实测证据，而不是功能清单"],
];

const MASTER_MODS: [string, string][] = [
  ["开头钩子", "“我们团队让 AI 写了一年代码，真正变化的不是速度，是谁在干什么。”"],
  ["核心信息", "人不会被替代，分工会被重写——一周实测，三个环节的时间账。"],
  ["章节 · 一", "需求澄清从“写清楚”变成“问对问题”：记录一次需求评审里 AI 承担的部分。"],
  ["演示示例", "同一个功能，两周一前的 4 小时 vs 现在的 40 分钟。"],
  ["证据", "逐环节时间记录表（原始数据附文末）。"],
  ["总结", "工具没有替人干活，它把“干活”重新定义了一遍。"],
  ["行动引导", "评论区领取实测记录表。"],
];

const REVIEW_ROWS = [
  ["标题与切入角度一致，没有标题党", true],
  ["关键证据可追溯，数据标注了时间版本", true],
  ["平台版本符合小红书规范（字数/封面/话题）", true],
  ["无绝对化用语与合规风险表述", false],
  ["行动引导明确且可执行", false],
] as const;

export function StudioProto() {
  const [active, setActive] = useState("studio");
  const [tab, setTab] = useState<Tab>("内容简报");
  const [briefApproved, setBriefApproved] = useState(false);
  const [thinking, setThinking] = useState(false);

  const generate = () => {
    setThinking(true);
    window.setTimeout(() => setThinking(false), 2600);
  };

  return (
    <div className="flex min-h-screen" style={{ background: "#F5F6F3", color: "#20231F" }}>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Noto+Sans+SC:wght@400;500;600&family=Noto+Serif+SC:wght@600&display=swap"
      />
      <M7Rail active={active} onSelect={setActive} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="px-7 pt-[22px]">
          <div className="flex items-baseline gap-3.5">
            <span className="text-[12.5px]" style={{ color: "#8B8E87" }}>← 返回</span>
            <h1 className="text-[19px] font-semibold">Claude Code 实测：一周真实使用报告</h1>
            <div className="ml-auto"><Meta /></div>
          </div>
          <div className="mt-4 flex gap-[26px]" style={{ borderBottom: "1px solid rgba(200,201,203,0.65)" }}>
            {TABS.map((t) => {
              const on = tab === t;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="relative pb-[9px] text-[13px]"
                  style={{ color: on ? "#20231F" : "#626660", fontWeight: on ? 600 : 400 }}
                >
                  {t}
                  {on && <span className="absolute inset-x-0 -bottom-px h-[2px]" style={{ background: "#7C9482" }} />}
                </button>
              );
            })}
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <Sources />

          {tab === "内容简报" && !briefApproved && (
            <>
              <DocShell
                title="内容简报"
                sub="这条内容为什么存在：写给谁、解决什么问题、用什么角度。"
                right={<span className="text-xs" style={{ color: "#8B8E87" }}>{thinking ? "自动保存已暂停" : "已保存 · 刚刚"}</span>}
              >
                {BRIEF_FIELDS.map(([l, v, f]) => <Field key={l} label={l} value={v} focus={f} />)}
                <div className="mt-7 flex justify-end">
                  <button
                    onClick={() => setBriefApproved(true)}
                    className="inline-flex h-[38px] items-center rounded-[6px] px-[15px] text-[13px] font-medium"
                    style={{ background: "#7C9482", color: "rgba(255,255,255,0.96)" }}
                  >
                    确认内容简报
                  </button>
                </div>
              </DocShell>
              <Inspector
                thinking={thinking}
                onGenerate={generate}
                cta={{ label: "生成简报草稿", onClick: generate }}
                note="草稿会作为提案出现在这里——自动保存将暂停，由你审核后应用或放弃。"
              />
            </>
          )}

          {tab === "内容简报" && briefApproved && (
            <>
              <DocShell
                title={
                  <>
                    内容简报
                    <span className="ml-2.5 inline-flex items-center gap-1.5 align-middle text-xs font-medium" style={{ color: "#626660", fontFamily: '"Noto Sans SC", sans-serif' }}>
                      <span className="inline-block h-[5px] w-[5px] rounded-full" style={{ background: "#7C9482" }} />
                      已确认
                    </span>
                  </>
                }
                sub="这条内容为什么存在：写给谁、解决什么问题、用什么角度。"
                right={
                  <button
                    onClick={() => setBriefApproved(false)}
                    className="inline-flex h-8 items-center rounded-[5px] px-3 text-[12.5px] font-medium"
                    style={{ border: "1px solid #C8C9CB", color: "#20231F" }}
                  >
                    编辑简报
                  </button>
                }
              >
                <p className="mt-3.5 pb-0.5 pt-2.5 text-[12.5px] leading-[1.65]" style={{ color: "#626660", borderTop: "1px solid rgba(200,201,203,0.4)" }}>
                  已于 2026/9/6 20:26 由 Alex Chen 确认。只读状态——需要修改请点“编辑简报”。
                </p>
                {BRIEF_FIELDS.map(([l, v]) => (
                  <div key={l} className="mt-[22px]">
                    <div className="text-xs font-semibold tracking-[0.04em]" style={{ color: "#626660" }}>{l}</div>
                    <div className="mt-[7px] pb-[9px] text-[14.5px] leading-[1.7]">{v}</div>
                  </div>
                ))}
              </DocShell>
              <Inspector note="简报已确认。下一步：创建内容母稿——Loop AI 可基于简报生成母稿结构提案。" />
            </>
          )}

          {tab === "内容母稿" && (
            <>
              <DocShell
                title="内容母稿"
                sub="所有平台版本的母本。模块即文稿结构。"
                right={<span className="text-xs" style={{ color: "#8B8E87" }}>已保存 · 刚刚</span>}
              >
                {MASTER_MODS.map(([l, v], i) => (
                  <div key={l} className="py-[18px]" style={{ borderBottom: i < MASTER_MODS.length - 1 ? "1px solid rgba(200,201,203,0.4)" : "none" }}>
                    <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.04em]" style={{ color: "#626660" }}>
                      <span style={{ color: "#8B8E87", fontSize: 11, letterSpacing: 2, opacity: 0.7 }}>⠿</span>
                      {l}
                    </div>
                    <div className="mt-2 text-[14.5px] leading-[1.7]">{v}</div>
                  </div>
                ))}
              </DocShell>
              <Inspector
                thinking={thinking}
                onGenerate={generate}
                cta={{ label: "生成母稿结构提案", onClick: generate }}
                note="基于已确认简报生成母稿结构提案。"
              />
            </>
          )}

          {tab === "平台版本" && (
            <>
              <DocShell
                title="平台版本"
                sub=""
                right={<span className="text-xs" style={{ color: "#8B8E87" }}>已保存 · 刚刚</span>}
              >
                <div className="mt-3.5 flex gap-[22px]" style={{ borderBottom: "1px solid rgba(200,201,203,0.65)" }}>
                  {["小红书", "Bilibili", "抖音"].map((p, i) => (
                    <span
                      key={p}
                      className="relative pb-2 text-[12.5px]"
                      style={{ color: i === 0 ? "#20231F" : "#626660", fontWeight: i === 0 ? 600 : 400 }}
                    >
                      {p}
                      {i === 0 && <span className="absolute inset-x-0 -bottom-px h-[2px]" style={{ background: "#7C9482" }} />}
                    </span>
                  ))}
                </div>
                <Field label="小红书标题" value="让 AI 写了一年代码后，我们的分工变了" />
                <Field label="正文" value={"“我们团队让 AI 写了一年代码，真正变化的不是速度，是谁在干什么。”\n\n一周实测，三个环节的时间账——需求澄清、编码、评审，逐个说。"} />
                <Field label="封面说明" value="黑底白字：“人不会被替代，分工会被重写”" />
                <div className="mt-7 flex items-center justify-between">
                  <button className="inline-flex h-8 items-center rounded-[5px] px-3 text-[12.5px] font-medium" style={{ border: "1px solid #C8C9CB", color: "#20231F" }}>
                    重新适配
                  </button>
                  <button className="inline-flex h-[38px] items-center rounded-[6px] px-[15px] text-[13px] font-medium" style={{ background: "#7C9482", color: "rgba(255,255,255,0.96)" }}>
                    记录发布
                  </button>
                </div>
              </DocShell>
              <Inspector
                thinking={thinking}
                onGenerate={generate}
                cta={{ label: "适配平台版本", onClick: generate }}
                note="按平台规范从母稿适配，提案由你审核后应用。"
              />
            </>
          )}

          {tab === "审核" && (
            <>
              <DocShell
                title="审核"
                sub="发布前的编辑校样——逐项确认内容达到团队标准。"
                right={<span className="text-xs" style={{ color: "#8B8E87" }}>3 / 5 项已完成</span>}
              >
                <div className="mt-[18px]">
                  {REVIEW_ROWS.map(([r, done], i) => (
                    <div key={r} className="flex items-center gap-3 px-1 py-[13px] text-[13.5px]" style={{ borderBottom: i < REVIEW_ROWS.length - 1 ? "1px solid rgba(200,201,203,0.4)" : "none" }}>
                      <span
                        className="grid h-4 w-4 shrink-0 place-content-center rounded-[3px]"
                        style={{
                          border: `1.5px solid ${done ? "#7C9482" : "#C8C9CB"}`,
                          background: done ? "#7C9482" : "#fff",
                        }}
                      >
                        {done && (
                          <span className="block h-[4.5px] w-2 -translate-y-px -rotate-45 border-b-2 border-l-2 border-white" />
                        )}
                      </span>
                      {r}
                    </div>
                  ))}
                </div>
                <div className="mt-7 flex justify-end">
                  <button className="inline-flex h-[38px] items-center rounded-[6px] px-[15px] text-[13px] font-medium opacity-45" style={{ background: "#7C9482", color: "rgba(255,255,255,0.96)" }}>
                    审核通过并待发布
                  </button>
                </div>
              </DocShell>
              <Inspector note="审核由人完成。Loop AI 可协助做内容 QA 检查，结论仅供你参考。" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
