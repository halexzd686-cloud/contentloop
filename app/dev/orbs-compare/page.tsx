"use client";

import { ThinkingOrbs } from "@/components/motion/thinking-orbs";
import { ThinkingOrbsV2 } from "@/components/motion/thinking-orbs-v2";

/**
 * /dev/orbs-compare — human review surface: current frozen ThinkingOrbs
 * vs the v2 design-fidelity iteration (MetalForge gyro reference).
 * Side-by-side live animation at 48/56px + reduced-motion static frames.
 */

function Cell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-[7px] px-10 py-8"
      style={{ background: "#FBFBF8", border: "1px solid rgba(200,201,203,0.4)" }}
    >
      {children}
      <span className="text-xs" style={{ color: "#626660" }}>{label}</span>
    </div>
  );
}

export default function OrbsComparePage() {
  return (
    <div className="min-h-screen px-10 py-10" style={{ background: "#F5F6F3", color: "#20231F" }}>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600&display=swap"
      />
      <p className="text-[11px] font-medium tracking-[0.14em]" style={{ color: "#8B8E87" }}>
        DEV ONLY · /DEV/ORBS-COMPARE
      </p>
      <h1 className="mt-2 text-[22px] font-semibold">Thinking Orbs：现行版 vs V2（对照 MetalForge gyro 参考）</h1>
      <p className="mt-2 max-w-[720px] text-[13px] leading-[1.7]" style={{ color: "#626660" }}>
        左侧为现行冻结组件；右侧为按参考重做的 V2（可见精密轨道环、全局进动、深度遮挡、轴心、远点消色、金点解析环）。均为真实动效。
      </p>

      <div className="mt-8 grid grid-cols-2 gap-6">
        <div>
          <p className="mb-4 text-[13px] font-semibold" style={{ color: "#8B8E87" }}>现行版（冻结中）</p>
          <div className="flex gap-5">
            <Cell label="56px"><ThinkingOrbs size={56} /></Cell>
            <Cell label="48px"><ThinkingOrbs size={48} /></Cell>
            <Cell label="静态帧"><ThinkingOrbs size={56} staticFrame /></Cell>
          </div>
        </div>
        <div>
          <p className="mb-4 text-[13px] font-semibold" style={{ color: "#3F7455" }}>V2 迭代稿</p>
          <div className="flex gap-5">
            <Cell label="56px"><ThinkingOrbsV2 size={56} /></Cell>
            <Cell label="48px"><ThinkingOrbsV2 size={48} /></Cell>
            <Cell label="静态帧"><ThinkingOrbsV2 size={56} staticFrame /></Cell>
          </div>
        </div>
      </div>

      <div className="mt-10 max-w-[720px] text-[12.5px] leading-[1.8]" style={{ color: "#626660" }}>
        <p className="font-semibold" style={{ color: "#20231F" }}>V2 相对 V1 的变更点</p>
        <ul className="mt-2 list-disc pl-5">
          <li>轨道环从几乎不可见（alpha 0.16–0.2）提升为可读的仪器轨道（alpha 0.36–0.5，前弧再加强）</li>
          <li>新增全局 yaw 进动：整个陀螺作为一个仪器整体缓慢旋转（轨道环也参与投影进动）</li>
          <li>前弧重绘：轨道环前缘覆盖远处粒子，形成真实深度遮挡</li>
          <li>新增中心轴心点，构图有锚点</li>
          <li>远处粒子降透明度并消色为结构银；近处粒子加深为深绿，纵深对比更强</li>
          <li>金色洞察点转到轨道前侧时解析出一圈金环</li>
        </ul>
      </div>
    </div>
  );
}
