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

## Halftone Reveal（Entrance 角色）可行性备忘

Gateway 的 Halftone Reveal 不在本任务集成范围。实施路径核查结论：

- 官方 React Bits HalftoneReveal 是 **OGL/WebGL shader**（M4.4 已因此拒绝官方版；该理由在本项目仍然成立）
- 可行路径（M7 Gateway 集成时决策）：(a) 接受 `ogl` 依赖 vendor 官方版；(b) 扩展现有自定义 DotTexture 为带 reveal 动效的 canvas 2D/CSS 实现（零新依赖，推荐方向）；(c) 静态 editorial 帧
- reduced-motion 必须提供静态帧；性能上 canvas 2D halftone 一次性 reveal 无持续开销
- 无论哪条路径：Entrance 角色仅 Halftone，不与 Thinking Orbs / Spiral 混用

## Modified files

- `components/motion/thinking-orbs.tsx`（新）
- `components/motion/spiral-loader.tsx`（新）
- `app/globals.css`（spiral 动画 + reduced-motion 规则）
- `app/dev/motion-spike/page.tsx`（新，dev-only 验证页，不在导航）
- `tests/motion-spike.test.tsx`（新）
- `docs/progress/M7-product-alignment-audit.md`（新，Phase 0）
