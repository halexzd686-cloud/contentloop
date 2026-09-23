"use client";

import { ThinkingOrbs } from "@/components/motion/thinking-orbs";

/**
 * M9 AI 按钮重设计 — 三个沉稳方向对比（dev-only，不在导航）。
 *
 * 背景：现网 A2 极光按钮（conic 流光 2.6s + 呼吸 2.4s + 自转 7s）
 * 有三个持续待机动画，与 §24「无持续待机动画」原则冲突，用户判定
 * 过度设计。本页提供三个零待机/弱待机候选，供视觉拍板。
 */

function Frame({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-[5px] p-6"
      style={{
        background: "var(--cl-surface)",
        border: "1px solid var(--border-mid)",
      }}
    >
      <div className="flex items-baseline gap-3">
        <h2 className="text-[15px] font-semibold text-ink-primary">{title}</h2>
        <span className="text-xs" style={{ color: "var(--cl-neutral)" }}>
          {note}
        </span>
      </div>
      <div className="mt-5 flex items-center gap-8">{children}</div>
    </section>
  );
}

const GLYPH = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
    <ellipse cx="12" cy="12" rx="8.5" ry="3.6" transform="rotate(-24 12 12)" stroke="var(--cl-primary)" />
    <circle cx="12" cy="12" r="1.9" fill="var(--cl-primary)" stroke="none" />
    <circle cx="18.6" cy="7.8" r="1.3" fill="var(--cl-gold)" stroke="none" />
  </svg>
);

export default function AiButtonVariants() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-8 py-10">
      <header>
        <h1 className="text-[22px] font-semibold text-ink-primary">
          Loop AI 按钮 · 沉稳化候选
        </h1>
        <p className="mt-1 text-xs" style={{ color: "var(--cl-neutral)" }}>
          现状 A2：极光描边旋转 + 呼吸光晕 + 符号自转（三个待机动画）｜ 生成中一律 ThinkingOrbs 接管（不变）
        </p>
      </header>

      <Frame title="A · 发丝描边 + 标识点" note="零待机动画，最沉稳；AI 身份只靠 5px 绿点与文案">
        <button
          className="inline-flex h-9 items-center gap-2 rounded-[6px] px-4 text-[13px] font-medium text-ink-primary transition-colors duration-150"
          style={{
            background: "var(--cl-surface)",
            border: "1px solid var(--border)",
          }}
        >
          <span className="inline-block h-[5px] w-[5px] rounded-full" style={{ background: "var(--cl-primary)" }} />
          生成简报草稿
        </button>
        <button
          className="inline-flex h-9 items-center gap-2 rounded-[6px] px-4 text-[13px] font-medium text-ink-primary"
          style={{ background: "var(--cl-surface)", border: "1px solid var(--border-strong)" }}
        >
          <span className="inline-block h-[5px] w-[5px] rounded-full" style={{ background: "var(--cl-primary)" }} />
          生成简报草稿（hover 态模拟：描边加深）
        </button>
      </Frame>

      <Frame title="B · 主绿描边 + 轨道符号" note="零待机动画；描边用主绿，AI 身份由描边色+静态轨道符号承担">
        <button
          className="inline-flex h-9 items-center gap-2 rounded-[6px] px-4 text-[13px] font-medium transition-colors duration-150"
          style={{
            background: "var(--cl-surface)",
            border: "1px solid var(--cl-primary)",
            color: "var(--cl-ink-strong)",
          }}
        >
          {GLYPH}
          生成简报草稿
        </button>
        <button
          className="inline-flex h-9 items-center gap-2 rounded-[6px] px-4 text-[13px] font-medium"
          style={{
            background: "var(--mint-tint)",
            border: "1px solid var(--cl-primary)",
            color: "var(--cl-ink-strong)",
          }}
        >
          {GLYPH}
          生成简报草稿（hover 态模拟：淡绿底）
        </button>
      </Frame>

      <Frame title="B+ · 主绿描边 + 内 keyline 双线框" note="B 的基础上：2px 内缩发丝内线（印刷双线框），hover 内线加深——设计感来自工艺细节，不动画">
        <button
          className="inline-flex h-9 items-center gap-2 rounded-[6px] text-[13px] font-medium transition-colors duration-150"
          style={{
            background: "var(--cl-surface)",
            border: "1px solid var(--cl-primary)",
            color: "var(--cl-ink-strong)",
            boxShadow: "inset 0 0 0 2px var(--cl-surface), inset 0 0 0 3px var(--mint-line)",
            padding: "0 16px",
          }}
        >
          {GLYPH}
          生成简报草稿
        </button>
        <button
          className="inline-flex h-9 items-center gap-2 rounded-[6px] text-[13px] font-medium"
          style={{
            background: "var(--mint-tint)",
            border: "1px solid var(--cl-primary)",
            color: "var(--cl-ink-strong)",
            boxShadow: "inset 0 0 0 2px var(--cl-surface), inset 0 0 0 3px var(--cl-primary)",
            padding: "0 16px",
          }}
        >
          {GLYPH}
          生成简报草稿（hover：淡绿底 + 内线加深）
        </button>
      </Frame>

      <Frame title="B++ · 双线框 + serif 身份前缀" note="B+ 再加 Cormorant 斜体 Loop AI 前缀——编辑感最强的一版">
        <button
          className="inline-flex h-9 items-center gap-2 rounded-[6px] text-[13px] font-medium transition-colors duration-150"
          style={{
            background: "var(--cl-surface)",
            border: "1px solid var(--cl-primary)",
            color: "var(--cl-ink-strong)",
            boxShadow: "inset 0 0 0 2px var(--cl-surface), inset 0 0 0 3px var(--mint-line)",
            padding: "0 16px",
          }}
        >
          {GLYPH}
          <span
            style={{
              fontFamily: "var(--font-cormorant), serif",
              fontStyle: "italic",
              fontWeight: 600,
              color: "var(--cl-primary-strong)",
              letterSpacing: "0.01em",
            }}
          >
            Loop AI
          </span>
          <span style={{ color: "var(--cl-silver)" }}>·</span>
          生成简报草稿
        </button>
      </Frame>


      <Frame title="C · 静态待机 + 仅生成时一次微光" note="待机零动画；点击后描边一次慢扫（3s 单次），随后 ThinkingOrbs">
        <button
          className="inline-flex h-9 items-center gap-2 rounded-[6px] px-4 text-[13px] font-medium text-ink-primary"
          style={{ background: "var(--cl-surface)", border: "1px solid var(--border)" }}
        >
          {GLYPH}
          生成简报草稿（待机：完全静态）
        </button>
        <button className="ai-c-sweep inline-flex h-9 items-center gap-2 rounded-[6px] px-4 text-[13px] font-medium text-ink-primary">
          {GLYPH}
          生成中描边扫光（单次 3s）
        </button>
        <span className="inline-flex items-center gap-2 text-xs" style={{ color: "var(--cl-neutral)" }}>
          <ThinkingOrbs size={20} /> 之后照旧 ThinkingOrbs
        </span>
      </Frame>

      <Frame title="对照 · 现网 A2" note="三个持续待机动画（供对比）">
        <span className="text-xs" style={{ color: "var(--cl-neutral)" }}>
          见 Studio / Analytics 现网按钮：conic 流光 2.6s 循环 + 呼吸光晕 2.4s 循环 + 符号自转 7s 循环
        </span>
      </Frame>

      <style>{`
        .ai-c-sweep {
          position: relative;
          background: var(--cl-surface);
          border: 1px solid var(--border);
          overflow: hidden;
        }
        .ai-c-sweep::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(100deg, transparent 30%, color-mix(in srgb, var(--cl-primary) 35%, transparent) 50%, transparent 70%);
          animation: ai-c-sweep-once 3s ease-in-out infinite;
        }
        @keyframes ai-c-sweep-once {
          0% { transform: translateX(-100%); }
          60%, 100% { transform: translateX(100%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ai-c-sweep::after { animation: none; }
        }
      `}</style>
    </div>
  );
}
