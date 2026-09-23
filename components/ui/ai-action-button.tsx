"use client";

/**
 * AiActionButton — Loop AI 生成入口（M9 重设计，B+ 方案）。
 *
 * 设计（用户拍板 2026-09-23，取代 M7 A2 极光版）：
 * - 零待机动画（§24 契约：无持续待机动画）——1px 主绿描边 +
 *   2px 内缩发丝 keyline（印刷双线框）+ 静态轨道符号
 * - hover：淡绿底 + 内线加深（Fast 150ms）
 * - 点击无过渡动效，直接触发；生成中由调用方换 ThinkingOrbs
 * - 双主题：全部走令牌
 *
 * Used for every genuine AI generation entry (brief draft, platform
 * adapt, signal analyze, performance analyze, playbook draft).
 */
export function AiActionButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} className="ai-action-btn w-full">
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth="1.7"
        strokeLinecap="round"
        aria-hidden
      >
        <ellipse
          cx="12"
          cy="12"
          rx="8.5"
          ry="3.6"
          transform="rotate(-24 12 12)"
          style={{ stroke: "var(--cl-primary)" }}
        />
        <ellipse
          cx="12"
          cy="12"
          rx="8.5"
          ry="3.6"
          transform="rotate(38 12 12)"
          opacity="0.55"
          style={{ stroke: "var(--cl-primary)" }}
        />
        <circle cx="12" cy="12" r="1.9" style={{ fill: "var(--cl-primary)" }} stroke="none" />
        <circle cx="18.6" cy="7.8" r="1.3" style={{ fill: "var(--cl-gold)" }} stroke="none" />
      </svg>
      <span>{label}</span>
    </button>
  );
}
