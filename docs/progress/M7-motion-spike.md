# M7 — Motion Spike（Thinking Orbs / Spiral Loader 技术验证）

> 结论：**PASS WITH LIMITATIONS**（详见 Known Limitations）。两个动效系统在 Web 上技术可行，无新依赖，可进入 M7 Phase A 前的最终决策。

## Implementation approach

- **ThinkingOrbs**（`components/motion/thinking-orbs.tsx`）：自研 Canvas 2D gyro 轨道系统——5 个受控点（4 结构 + 1 金色洞察点）沿倾斜轨道运行，深度 z 驱动大小/透明度，轨道平面缓慢进动产生 gyro 感。非随机粒子、非弹跳点、非通用 spinner。
- **SpiralLoader**（`components/motion/spiral-loader.tsx`）：纯 SVG + CSS 旋转——外环激活弧 + 内圈螺旋弧（标志性 glyph），track 环 #C8C9CB、active #7C9482、背景透明。

## Dependencies added

无。零新 npm 依赖（无 OGL/WebGL/Lottie/GSAP）。

## License / source attribution

MetalForge 链接仅作视觉/动效参考（未复制其代码）；两个组件均为 ContentLoop 自研实现，无第三方代码。

## ThinkingOrbs technical architecture

- Canvas 2D；`requestAnimationFrame` 驱动；**每帧零 React re-render**（全部 canvas 直写）
- DPR 上限 2；`ResizeObserver` 响应尺寸变化
- `IntersectionObserver` 离屏暂停 + `document.hidden` 切后台暂停
- `prefers-reduced-motion`：静态代表性轨道帧（轨道线+定位点），无动画
- 每视口原则上一个实例激活（使用方职责；组件自身不做全局锁）
- 无 pill 包裹；light-surface 原生；Chromium 验证

## Spiral technical architecture

- SVG 双圆（track + active arc）+ 内圈螺旋弧；`stroke-dasharray` 控制弧长
- CSS `spiral-rotate` 1.6s/2.4s 双速反向；`@media (prefers-reduced-motion: reduce)` 下完全静态
- 16px 在标准按钮内清晰可读（实拍验证）；inline-block + 固定盒 + `flex-shrink:0` 无布局位移

## Reduced-motion strategy

两者均静态化且不丢失状态语义：Orbs 显示静态轨道帧，Spiral 显示静态 glyph；处理状态始终由相邻文字承担（"正在分析线索…"/"保存中…"）。

## Browser notes

- Chromium（headless + 正常）实测；页面 200，无 hydration/运行时错误
- ThinkingOrbs 静态截图会显得稀疏——动效密度需在真实浏览器评估（canvas 每帧重绘 5 点 + 轨道线，开销极小）

## Performance observations

- Orbs：5 点 + 5 轨道线的 canvas 绘制，无掉帧风险；unmount 即停（RAF cancel 实测于代码路径）；tab hidden 停；离屏停
- Spiral：纯 CSS transform 旋转，无 JS 开销，16px 无抖动、无 layout shift
- 滚动/输入响应不受影响（动效不占用主线程 React 工作）

## Known limitations

1. ThinkingOrbs 的"gyro 质感"为 2D 投影近似（非真 3D）；静态截图无法体现动效，最终密度/速度应在 M7 页面集成时于真实浏览器微调
2. jsdom 无 canvas 2D 上下文，ThinkingOrbs 的 RAF 生命周期由浏览器实测覆盖（组件代码路径含完整 cleanup），测试仅覆盖 Spiral + CSS 契约
3. "每视口仅一个活跃实例"由使用方保证（组件不自锁）

## Recommendation

**PASS WITH LIMITATIONS** —— 技术可行、性能干净、零依赖；Orbs 密度微调留待 M7 页面集成时的真实浏览器评审。

## Visual Fidelity Pass（M7-D17.6B）

针对首轮结论"Thinking Orbs 同心圆 spinner 感过重 / Spiral 像断裂圆环"的纯视觉保真重写，工程架构（Canvas 2D + RAF 生命周期 / SVG+CSS）全部保留。

### Thinking Orbs — 几何与深度模型

- **轨道模型**：3 个相互独立的投影轨道平面，各自有不同 tiltX / rotZ / 椭圆比率 / 半径 / 进动速度与相位漂移——不再是共享中心朝向的同心圆。静态帧即可见倾斜椭圆轨道（56px 下清晰）。
- **粒子**：8 个受控粒子（3 primary #7C9482 + 3 structural #C8C9CB + 1 neutral #626660 + 1 唯一金色洞察点 #D4B26A），按轨道平面与相位分配，任意帧呈"平衡但不镜像"的非对称排布。
- **深度模型**：painter 算法远→近绘制；深度同时驱动粒子尺寸与不透明度，近处 primary 粒子用深色 #5F7A68 加强。前/后粒子的大小-透明度差异在 48px 与 56px 均可感知（3× 截图确认）。
- **轨道线**：细、低透明、Structural Silver，仅作次级结构线索；第一眼看到的是空间粒子而非"环"。
- **光学尺寸处理**：48px（compact）省略第 3 条轨道线、降低轨道透明度、加强主粒子对比；56px 全细节，三轨道平面全部可见。

### Spiral Loader — 真螺旋路径

- **路径方案**：24×24 viewBox 内以代码生成阿基米德螺旋（r = a + bθ）path + 数值长度；track 为整条淡色路径，active 段（42% 弧长）以 `stroke-dashoffset` 沿螺旋行进（`spiral-travel` keyframes）。静态截图已可辨"螺旋"，不再依赖旋转伪装。
- **光学变体**：16px = 1.4 圈 / stroke 2.4（轮廓最简最强）；24px = 1.6 圈；32px = 1.9 圈 / stroke 2.5（细节最足）。16px 在"保存中… / 导入中…"按钮上下文内清晰可读。
- 旧的 `.spiral-loader-arc` 双弧结构与 `spiral-rotate` 已移除；CSS 契约测试同步更新为 `.spiral-loader-active` + `spiral-travel`。

### 视觉验证

- 生产 build + 独立临时端口截图（1440 全页 + 3× DPR 局部）：Orbs 呈 gyro 空间感、深度明确、金点唯一；Spiral 16/24/32 均为可辨螺旋、无布局抖动。
- 自动录屏不可用（headless Chrome 无录屏能力）；手动复核：打开 `/dev/motion-spike`，观察 48/56px Orbs 的倾斜轨道进动与前后景深，以及 16px Spiral 沿螺旋行进的激活段。
- 已知局限：2D 投影近似非真 3D；48px 轨道线刻意弱化（compact 设计决策），gyro 感主要由运动中的粒子深度传达。

### Verdict

- Technical：**PASS**
- Visual Fidelity：**PASS**（Thinking Orbs 与 Spiral 均达到验收标准；48px 轨道线弱化为有意决策）

## Halftone Reveal（Entrance 角色）可行性备忘

Gateway 的 Halftone Reveal 不在本任务集成范围。实施路径核查结论：

- 官方 React Bits HalftoneReveal 是 **OGL/WebGL shader**（M4.4 已因此拒绝官方版；该理由在本项目仍然成立）
- 可行路径（M7 Gateway 集成时决策）：(a) 接受 `ogl` 依赖 vendor 官方版；(b) 扩展现有自定义 DotTexture 为带 reveal 动效的 canvas 2D/CSS 实现（零新依赖，推荐方向）；(c) 静态 editorial 帧
- reduced-motion 必须提供静态帧；性能上 canvas 2D halftone 一次性 reveal 无持续开销
- 无论哪条路径：Entrance 角色仅 Halftone，不与 Thinking Orbs / Spiral 混用

## Modified files

- `components/motion/thinking-orbs.tsx`（D17.6B 重写为 gyro 多轨道平面模型）
- `components/motion/spiral-loader.tsx`（D17.6B 重写为真阿基米德螺旋）
- `app/globals.css`（spiral-travel 动画 + reduced-motion 规则）
- `app/dev/motion-spike/page.tsx`（dev-only 验证页，不在导航；D17.6B 新增静态帧预览行）
- `tests/motion-spike.test.tsx`（D17.6B 更新 CSS 契约断言）
- `docs/progress/M7-product-alignment-audit.md`（新，Phase 0）
