"use client";

import { ThinkingOrbs } from "@/components/motion/thinking-orbs";
import { SpiralLoader } from "@/components/motion/spiral-loader";
import { FountainLoader } from "@/components/motion/fountain-loader";
import { Button } from "@/components/ui/button";

/** Reduced-motion preview without flipping the OS setting: the same
 *  static gyro frame the component draws under prefers-reduced-motion. */
function StaticOrbsPreview() {
  return <ThinkingOrbs size={48} staticFrame />;
}

/**
 * M7 motion spike — isolated dev-only validation surface.
 * NOT in production navigation. No domain records are created.
 * Visual/technical validation only.
 */

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 border-b border-border py-4">
      <span className="w-40 shrink-0 text-xs text-ink-secondary">{label}</span>
      <div className="flex items-center gap-6">{children}</div>
    </div>
  );
}

export default function MotionSpike() {
  return (
    <div className="min-h-screen bg-canvas p-10 text-ink-primary">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
        Dev only · /dev/motion-spike
      </p>
      <h1 className="mt-2 text-2xl font-semibold">Motion Spike</h1>
      <p className="mt-1 text-sm text-ink-secondary">
        M7 动效系统技术验证。不产生任何业务记录。
      </p>

      <section className="mt-8">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
          Thinking Orbs（AI 推理）
        </h2>
        <div className="mt-2 rounded-[10px] border border-border bg-workspace px-6">
          <Row label="48px · 正常动效">
            <span className="py-3">
              <ThinkingOrbs size={48} />
            </span>
            <span className="text-sm text-ink-secondary">正在分析线索…</span>
          </Row>
          <Row label="56px · 正常动效">
            <span className="py-3">
              <ThinkingOrbs size={56} />
            </span>
            <span className="text-sm text-ink-secondary">正在生成内容简报…</span>
          </Row>
          <Row label="Reduced Motion 静态帧">
            <StaticOrbsPreview />
            <span className="text-xs text-ink-secondary">
              系统开启 prefers-reduced-motion 时：静态 gyro 帧 + 状态文字保留，无动画。
            </span>
          </Row>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
          Spiral Loader（系统处理）
        </h2>
        <div className="mt-2 rounded-[10px] border border-border bg-workspace px-6">
          <Row label="16px · 按钮上下文">
            <Button variant="primary" size="sm" disabled>
              <SpiralLoader size={16} />
              <span className="ml-1.5">保存中…</span>
            </Button>
            <Button variant="secondary" size="sm" disabled>
              <SpiralLoader size={16} />
              <span className="ml-1.5">导入中…</span>
            </Button>
          </Row>
          <Row label="24px · 局部处理">
            <SpiralLoader size={24} />
            <span className="text-sm text-ink-secondary">正在处理…</span>
          </Row>
          <Row label="32px · 较大处理（少用）">
            <SpiralLoader size={32} />
          </Row>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
          Fountain Loader（页面/组件切换加载）
        </h2>
        <div className="mt-2 rounded-[10px] border border-border bg-workspace px-6">
          <Row label="30px · 页面切换加载">
            <FountainLoader size={30} label="正在加载内容工作台" />
          </Row>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
          色彩 tokens
        </h2>
        <div className="mt-2 flex gap-6 rounded-[10px] border border-border bg-workspace p-6 text-xs text-ink-secondary">
          {[
            ["#7C9482", "Primary（主轨道/激活弧）"],
            ["#C8C9CB", "Structural（结构轨道/底色环）"],
            ["#D4B26A", "Insight node（洞察点）"],
            ["#626660", "Neutral（轨道线）"],
          ].map(([hex, desc]) => (
            <div key={hex} className="flex items-center gap-2">
              <span
                className="h-5 w-5 rounded-[6px] border border-border"
                style={{ background: hex }}
              />
              <span>
                {hex} — {desc}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
