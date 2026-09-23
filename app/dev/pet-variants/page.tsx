"use client";

import { useId } from "react";

/**
 * M9 小环增强 · 第三轮 — 生物身份与心情系统（dev-only，不动生产组件）。
 *
 * 用户方向：发散、更有个性，参考 Codex 内置宠物（鲜明生物身份 +
 * 心情系统）。史莱姆基底沿用第二轮（身体 / 双层光影 / halftone）。
 *
 * W1 衔尾环（核心候选）：尾巴从身后卷起在头顶盘成圆环——
 *   ContentLoop 的「环」由角色自己咬出来；尾巴环本身是仪表，
 *   5 段弧按待办数逐段点亮（>5 全亮 + 环心金点），无徽章无外环。
 * W2 表情系统：平静（胶囊眼+小弧嘴）/ 有待办（圆点眼+小 o 嘴+金牌）
 *   / 全清（^^ 满足眼 + 身体微微摊平）。重点是「它有情绪」。
 * W3 衔尾环+表情：W1 尾巴环仪表 × W2 三态表情，检验融合。
 *
 * 每案 40px + 160px 检视；W2/W3 展示全部三态。全部 SVG 手绘、
 * 令牌色（深色自动适配）、useId 防冲突。交互层（眨眼/拖拽）不在本页。
 */

/* 史莱姆本体（48-box 手绘，同第二轮）：摊坐宽扁底、不对称软 dome、
   轮廓微波浪，外接 ≈34×26（≈1.3:1）。 */
const SLIME =
  "M8.5 33 C14.5 35.4 33.5 35.4 39.5 33 C42.4 30.2 42.8 24.5 41.2 20.2 C40.1 17.2 38 14.9 35.2 13.5 C31.4 11.3 28 9.8 24 9.7 C19.6 9.6 15.4 11.2 12.4 14 C9.6 16.6 7.9 20.6 7.7 24.8 C7.5 28.4, 7.3 30.8, 8.5 33 Z";

/* 低重心眼位（史莱姆的可爱感来自低而近的眼睛） */
const EYE_L = { x: 20.2, y: 24.2 };
const EYE_R = { x: 27.8, y: 24.2 };

type Mood = "calm" | "alert" | "satisfied";

/* ── 表情 ─────────────────────────────────────────────────── */

function CapsuleEyes() {
  return (
    <g>
      <rect x={EYE_L.x - 2.1} y={EYE_L.y - 3.8} width="4.2" height="7.6" rx="2.1" style={{ fill: "var(--cl-surface)" }} />
      <rect x={EYE_R.x - 2.1} y={EYE_R.y - 3.8} width="4.2" height="7.6" rx="2.1" style={{ fill: "var(--cl-surface)" }} />
    </g>
  );
}

function Face({ mood }: { mood: Mood }) {
  if (mood === "alert") {
    // 有待办：眼睛睁圆 + 嘴变小 o
    return (
      <g>
        <circle cx={EYE_L.x} cy={EYE_L.y} r="2.3" style={{ fill: "var(--cl-surface)" }} />
        <circle cx={EYE_R.x} cy={EYE_R.y} r="2.3" style={{ fill: "var(--cl-surface)" }} />
        <circle cx="24" cy="28.8" r="1.1" fill="none" strokeWidth="0.9" style={{ stroke: "var(--cl-surface)" }} />
      </g>
    );
  }
  if (mood === "satisfied") {
    // 全清：^^ 满足眼 + 笑意更深的小弧嘴
    return (
      <g fill="none" strokeWidth="1" strokeLinecap="round" style={{ stroke: "var(--cl-surface)" }}>
        <path d={`M ${EYE_L.x - 2.2} ${EYE_L.y + 1} Q ${EYE_L.x} ${EYE_L.y - 2.2} ${EYE_L.x + 2.2} ${EYE_L.y + 1}`} />
        <path d={`M ${EYE_R.x - 2.2} ${EYE_R.y + 1} Q ${EYE_R.x} ${EYE_R.y - 2.2} ${EYE_R.x + 2.2} ${EYE_R.y + 1}`} />
        <path d="M 21.5 28.6 Q 24 30.6 26.5 28.6" />
      </g>
    );
  }
  // 平静：胶囊眼 + 小弧嘴
  return (
    <g>
      <CapsuleEyes />
      <path
        d="M 22.2 28.6 Q 24 29.8 25.8 28.6"
        fill="none"
        strokeWidth="0.9"
        strokeLinecap="round"
        style={{ stroke: "var(--cl-surface)" }}
      />
    </g>
  );
}

/* ── 双线框小金牌（W2 有待办态） ──────────────────────────── */

function Medallion({ count }: { count: number }) {
  return (
    <g transform="translate(38.5, 7.5)">
      <circle r="6.4" strokeWidth="1" style={{ fill: "var(--cl-surface)", stroke: "var(--cl-gold)" }} />
      <circle r="4.9" fill="none" strokeWidth="0.6" style={{ stroke: "var(--gold-line)" }} />
      <text
        textAnchor="middle"
        dy="0.33em"
        fontSize="8"
        fontWeight="600"
        style={{ fill: "var(--cl-gold-strong)", fontFamily: "var(--font-sans)" }}
      >
        {count}
      </text>
    </g>
  );
}

/* ── 尾巴环（衔尾环仪表） ─────────────────────────────────── */

/**
 * Tail emerges from the right flank (drawn before the body so the root
 * hides behind the silhouette) and the loop sits on the head, drawn in
 * front so all five gauge segments stay readable at 40px. Ring = the
 * attention gauge: 5 arc segments light up gold one by one; >5 lights
 * all five plus a gold dot at the loop's heart.
 */
function TailRing({ attention }: { attention: number }) {
  const cx = 24;
  const cy = 12.4;
  const r = 8.6;
  const SEGS = 5;
  const GAP = 9; // degrees between segments
  const litCount = attention === 0 ? 0 : Math.min(SEGS, attention);
  const pt = (deg: number) => {
    const a = (deg * Math.PI) / 180;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };
  return (
    <g>
      {Array.from({ length: SEGS }, (_, i) => {
        const a0 = -90 + i * (360 / SEGS) + GAP / 2;
        const a1 = a0 + 360 / SEGS - GAP;
        const p0 = pt(a0);
        const p1 = pt(a1);
        const lit = i < litCount;
        return (
          <path
            key={i}
            d={`M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A ${r} ${r} 0 0 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`}
            fill="none"
            strokeWidth="1.9"
            strokeLinecap="round"
            style={{ stroke: lit ? "var(--cl-gold)" : "var(--cl-silver)" }}
          />
        );
      })}
      {attention > 5 && (
        <circle cx={cx} cy={cy} r="1.6" style={{ fill: "var(--cl-gold)" }} />
      )}
    </g>
  );
}

/** Tail connector — behind the body, from the right flank up to the loop. */
function Tail() {
  return (
    <path
      d="M41.8 23 C39.5 18.5 36 14 32.6 12.7"
      fill="none"
      strokeWidth="2.6"
      strokeLinecap="round"
      style={{ stroke: "var(--cl-primary)" }}
    />
  );
}

/* ── 史莱姆身体（第二轮工艺，原样沿用） ────────────────────── */

function SlimeDefs({ idp }: { idp: string }) {
  return (
    <defs>
      <radialGradient id={`${idp}-vol`} cx="0.72" cy="0.78" r="0.95">
        <stop offset="0%" style={{ stopColor: "var(--cl-primary-deep)", stopOpacity: 0.75 }} />
        <stop offset="55%" style={{ stopColor: "var(--cl-primary-deep)", stopOpacity: 0 }} />
      </radialGradient>
      <radialGradient id={`${idp}-lift`} cx="0.3" cy="0.24" r="0.7">
        <stop offset="0%" style={{ stopColor: "var(--mint-300)", stopOpacity: 0.55 }} />
        <stop offset="100%" style={{ stopColor: "var(--mint-300)", stopOpacity: 0 }} />
      </radialGradient>
      <pattern id={`${idp}-dots`} width="3.4" height="3.4" patternUnits="userSpaceOnUse">
        <circle cx="1" cy="1" r="0.55" style={{ fill: "var(--cl-primary-deep)" }} />
      </pattern>
      <radialGradient id={`${idp}-htfade`} cx="0.78" cy="0.85" r="0.55">
        <stop offset="0%" stopColor="#fff" />
        <stop offset="100%" stopColor="#000" />
      </radialGradient>
      <mask id={`${idp}-htmask`}>
        <rect width="48" height="48" fill={`url(#${idp}-htfade)`} />
      </mask>
    </defs>
  );
}

function SlimeBody({
  idp,
  face,
  flatten = false,
}: {
  idp: string;
  face: React.ReactNode;
  flatten?: boolean;
}) {
  return (
    <g
      transform={
        /* 全清态：身体绕底边微微摊平（满足感的"放松一摊"） */
        flatten ? "translate(24 35.4) scale(1.05 0.92) translate(-24 -35.4)" : undefined
      }
    >
      <path d={SLIME} style={{ fill: "var(--cl-primary)" }} />
      <path d={SLIME} fill={`url(#${idp}-vol)`} />
      <path d={SLIME} fill={`url(#${idp}-lift)`} />
      <path d={SLIME} fill={`url(#${idp}-dots)`} mask={`url(#${idp}-htmask)`} opacity="0.16" />
      <ellipse
        cx="16.5"
        cy="16"
        rx="2.6"
        ry="1.7"
        transform="rotate(-28 16.5 16)"
        opacity="0.9"
        style={{ fill: "var(--cl-overlay)" }}
      />
      {face}
    </g>
  );
}

/* ── 三个候选 ─────────────────────────────────────────────── */

function PetW1({ size, attention }: { size: number; attention: number }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <SlimeDefs idp={id} />
      <Tail />
      <SlimeBody idp={id} face={<CapsuleEyes />} />
      <TailRing attention={attention} />
    </svg>
  );
}

function PetW2({
  size,
  mood,
  attention,
}: {
  size: number;
  mood: Mood;
  attention: number;
}) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <SlimeDefs idp={id} />
      <SlimeBody idp={id} face={<Face mood={mood} />} flatten={mood === "satisfied"} />
      {attention > 0 && <Medallion count={attention} />}
    </svg>
  );
}

function PetW3({
  size,
  mood,
  attention,
}: {
  size: number;
  mood: Mood;
  attention: number;
}) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <SlimeDefs idp={id} />
      <Tail />
      <SlimeBody idp={id} face={<Face mood={mood} />} flatten={mood === "satisfied"} />
      <TailRing attention={attention} />
    </svg>
  );
}

/* ── Page scaffolding (ai-button-variants convention) ─────── */

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
      <div className="mt-5 flex flex-wrap items-end gap-8">{children}</div>
    </section>
  );
}

function Figure({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <figure className="flex flex-col items-center gap-2">
      {children}
      <figcaption className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
        {label}
      </figcaption>
    </figure>
  );
}

export default function PetVariants() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-8 py-10">
      <header>
        <h1 className="text-[22px] font-semibold text-ink-primary">
          小环 · 生物身份与心情
        </h1>
        <p className="mt-1 text-xs" style={{ color: "var(--cl-neutral)" }}>
          第三轮：衔尾环（品牌即生物）× 表情系统（Codex 宠物启发）｜ 史莱姆基底沿用第二轮 ｜
          交互层（眨眼 / 拖拽 / 面板）不在本页评估
        </p>
      </header>

      <Frame
        title="W1 · 衔尾环（核心候选）"
        note="尾巴在头顶盘成环 = ContentLoop 的「环」由角色自己咬出来；环分 5 段即仪表：7 项待办 → 全亮 + 环心金点"
      >
        <Figure label="40px · 有待办 ×7">
          <PetW1 size={40} attention={7} />
        </Figure>
        <Figure label="40px · 无待办">
          <PetW1 size={40} attention={0} />
        </Figure>
        <Figure label="160px 检视 · 有待办 ×7">
          <PetW1 size={160} attention={7} />
        </Figure>
        <Figure label="160px 检视 · 无待办">
          <PetW1 size={160} attention={0} />
        </Figure>
      </Frame>

      <Frame
        title="W2 · 表情系统"
        note="平静 = 胶囊眼+小弧嘴 ｜ 有待办 = 圆点眼+小 o 嘴+金牌 ｜ 全清 = ^^ 满足眼+身体摊平"
      >
        <Figure label="40px · 平静">
          <PetW2 size={40} mood="calm" attention={0} />
        </Figure>
        <Figure label="40px · 有待办 ×7">
          <PetW2 size={40} mood="alert" attention={7} />
        </Figure>
        <Figure label="40px · 全清">
          <PetW2 size={40} mood="satisfied" attention={0} />
        </Figure>
        <Figure label="160px 检视 · 平静">
          <PetW2 size={160} mood="calm" attention={0} />
        </Figure>
        <Figure label="160px 检视 · 有待办 ×7">
          <PetW2 size={160} mood="alert" attention={7} />
        </Figure>
        <Figure label="160px 检视 · 全清">
          <PetW2 size={160} mood="satisfied" attention={0} />
        </Figure>
      </Frame>

      <Frame
        title="W3 · 衔尾环 + 表情"
        note="W1 尾巴环仪表 × W2 三态表情——情绪与仪表同时挂在角色身上，检验融合"
      >
        <Figure label="40px · 平静">
          <PetW3 size={40} mood="calm" attention={0} />
        </Figure>
        <Figure label="40px · 有待办 ×7">
          <PetW3 size={40} mood="alert" attention={7} />
        </Figure>
        <Figure label="40px · 全清">
          <PetW3 size={40} mood="satisfied" attention={0} />
        </Figure>
        <Figure label="160px 检视 · 平静">
          <PetW3 size={160} mood="calm" attention={0} />
        </Figure>
        <Figure label="160px 检视 · 有待办 ×7">
          <PetW3 size={160} mood="alert" attention={7} />
        </Figure>
        <Figure label="160px 检视 · 全清">
          <PetW3 size={160} mood="satisfied" attention={0} />
        </Figure>
      </Frame>

      <section
        className="rounded-[5px] p-6"
        style={{ background: "var(--cl-surface)", border: "1px solid var(--border-mid)" }}
      >
        <h2 className="text-[15px] font-semibold text-ink-primary">设计语言来源（第三轮）</h2>
        <ul
          className="mt-3 space-y-2 text-xs leading-[1.8]"
          style={{ color: "var(--cl-neutral)" }}
        >
          <li>
            <span className="font-medium text-ink-primary">衔尾环（W1/W3）</span>
            　—　品牌叙事：ContentLoop 的「环」由角色自己的尾巴咬出来（ouroboros），
            生物即 logo；仪表化沿用导航图标 set XIII 的刻度语言与 EvidenceMark 的金色
            tick bezel——弧段即 tick，待办数 = 点亮段数。
          </li>
          <li>
            <span className="font-medium text-ink-primary">表情系统（W2/W3）</span>
            　—　Codex 内置宠物启发：鲜明的生物身份靠「心情」成立。三态映射真实数据态
            （平静 / 有待办 / 全清），全清时身体摊平是「放松一摊」的身体语言；
            它不是装饰——眼神与嘴型就是注意力状态本身。
          </li>
          <li>
            <span className="font-medium text-ink-primary">史莱姆基底</span>
            　—　第二轮定稿：metalforge GLOB 的摊坐软泥形态 + 双层 radial 体积 +
            specular 高光 + DotTexture 点阵（呼应 Radar 空态）。
          </li>
          <li>
            <span className="font-medium text-ink-primary">双线框金牌（W2）</span>
            　—　B+ 按钮的印刷 keyline 工艺（主环 + 内缩发丝线）。
          </li>
        </ul>
      </section>
    </div>
  );
}
