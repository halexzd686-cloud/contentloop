# M7 Phase A — Design Tokens + App Shell + Gateway

## Scope

M7 视觉重设计第一阶段：全局 M7 token 层、Editorial Rail（App Shell）、Gateway（含 Loop Evidence Mark / Halftone Reveal / Portal Button / 直达偏好）、响应式与无障碍。六个页面正文**未**重设计（属 Phase B），仅在新 Shell 中验证功能完好。

## Frozen constraints respected

- M5.7 Functional Freeze：零 schema / 路由 / 工作流 / API / 数据语义改动；直达偏好为任务书批准的 UX-only 例外（纯 localStorage）
- M6 中文术语：六项导航为冻结术语；Gateway 无 slogan（用户明确移除"让每次表现…"）
- M7-D17.6 motion spike 未触碰；Thinking Orbs 未接入生产；Spiral 未改动
- 动画角色：Entrance = Halftone（Gateway）；页面加载仍用骨架屏；无角色混用
- 直达偏好：无 DB 字段、无迁移、无 Supabase、无 Settings 新增区域

## Design tokens implemented

`app/globals.css` 新增 `--cl-*` 权威层，旧 token 名重映射到 M7 色板（Phase B 前页面正文保持功能可用）：

| M7 token | 值 | 语义 | 旧 token 映射 |
|---|---|---|---|
| `--cl-primary` | #7C9482 | current/selected/主行动 | `--mint-600` |
| `--cl-gold` | #D4B26A | evidence/attention/focus | `--warning` |
| `--cl-silver` | #C8C9CB | 结构线/非活跃图标/track | `--border-strong` |
| `--cl-neutral` | #626660 | metadata/helper | `--ink-secondary` |
| `--cl-ink-strong` | #20231F | strong ink | `--ink-primary` |
| `--cl-paper` | #F5F6F3 | workspace paper | `--canvas` |
| `--cl-surface` | #FBFBF8 | document surface | `--workspace` |
| `--cl-overlay` | #FFFFFF | overlay | — |
| `--cl-sidebar` | #EDEFEA | rail surface（silver 衍生） | — |

- `--border` = rgba(200,201,203,0.65)（结构性 1px、降透明度）；`--danger` 保留 #B85B57（Gold 不作 danger）
- 半径 token 收敛到 3/5/7/9（checkbox 3、button/input 6、card 7、modal 9）
- 全局 `:focus-visible` = 2px gold + offset
- `@theme inline` 同步映射 `cl-*` 供 Tailwind 类使用
- 字体（`app/layout.tsx`，next/font 自托管）：Noto Sans SC（UI/正文）、Noto Serif SC（中文 editorial，400/600）、Cormorant Garamond（wordmark 专用，500/600）；`--font-brand` 专供 wordmark
- 排版基准：Gateway wordmark 40px / Shell wordmark 24px（`text-2xl`）Cormorant Semibold；导航 13px；工作区标签 11px tracking

## App Shell implementation

`components/layout/sidebar.tsx`（重写）+ `app-shell.tsx`：

- Editorial Rail：全高、`--cl-sidebar` 表面、无阴影、右侧 1px 结构分隔线
- 宽度 196px @1280 → 216px @1440+（`--sidebar-width` + media query）；**V1 无手动折叠**（已移除折叠按钮与底部区域）
- 内容：Cormorant wordmark 24px → "工作区" 组标签 → 五个流程导航 → 间距分隔 → 设置（无重分隔线/卡片）
- 导航行 40px；图标 18px、stroke 1.75（lucide）；非活跃 Neutral 图标 + secondary 文字
- 活跃态 = 2px `--cl-primary` 左 rail（20px 高）+ primary 图标 + Strong Ink 600 文字；**无**圆角色块 / 填充 pill / 大色块
- 无 avatar / 问候 / 日期 / 铃铛 / workspace 选择器 / 版本号 / 折叠按钮
- `aria-current="page"` 标记活跃路由；`aria-label="主导航"`

## Gateway implementation

`app/page.tsx` → `components/gateway/gateway.tsx`（client）：

- Brand Gateway，极简：Cormorant 40px wordmark + Portal Button + 直达偏好 + 右侧 Evidence Mark
- **无** slogan / 产品说明 / 特性列表 / 顶部导航 / 页脚 / GitHub / 帮助链接
- 左 42% / 右 58%，无可见分隔线；左侧大量负空间，wordmark 位于中上区域
- Portal Button（Gateway 专属签名控件，不复用到内部按钮）：206×50、r=6px、`--cl-primary` 底、近白文字、无阴影/发光/缩放；右侧克制的方向性终端箭头（真实下一阶段过渡，符合"Directional Only When Advancing"）；hover 仅轻微加深
- 直达偏好：语义化 checkbox 16×16、r=3px、未选 silver 边框、选中 primary、gold focus-visible（全局规则）

## Loop Evidence Mark implementation

`components/gateway/evidence-mark.tsx`（Canvas 2D，零依赖）：

- 一条**开放**结构化轨迹（cubic bezier，左下→右上，非闭环/非无限符号/非流程图）
- 五个意义节点：Signal → Content → Publication → **Evidence** → Learning；主路径 `--cl-primary`，结构部分 `--cl-silver`
- Evidence = 最强节点：金色核心 + 解析出的金色环
- Learning 之后：沿曲线出射方向的渐隐 silver 点列（开放延续，非闭合）
- Halftone 为支撑结构：确定性网格点场（mulberry32 种子 7），靠近轨迹的点更深更绿，远点稀疏浅 silver
- `role="img"` + 中文 aria-label

## Halftone implementation

- 时序（≈1.6s，smoothstep 相位）：稀疏点渐入 → 轨迹逐步绘出（path 点随轨迹经过而增强）→ 五节点依次解析 → Evidence 金环解析 → Learning 与开放尾迹出现 → **静止**
- 结束后 RAF 完全停止，无永久粒子场、无背景循环动画
- 工程要点（本阶段实际修复）：
  - canvas 由 CSS 填满容器，JS 只写 backing store；**禁止**写 `canvas.style`（曾导致 ResizeObserver 反馈循环 → 空白）
  - RO 回调 rAF 防抖
  - **rAF 饥饿完成保障**：`setTimeout(REVEAL_MS+120)` 兜底绘制最终帧——隐藏 tab / 节流的 headless 环境下标记也必然解析
  - DPR ≤ 2；reduced-motion / document.hidden → 立即绘制最终静态帧

## Direct-entry preference

- key：`contentloop.direct-entry`，仅 localStorage；勾选写 `"1"`，取消移除
- 行为：默认/未勾选 → `/` 展示 Gateway；已勾选 → `/` 挂载时 `router.replace("/app")`（决策期仅渲染 paper 底色，无 Gateway 闪烁）
- **开发/测试路径**：`/?gateway=1` 强制展示 Gateway（即使偏好已勾选）——即本节标题路径
- localStorage 不可用时：永远展示 Gateway，偏好不持久（静默降级）

## Responsive behavior

- **1280**：Sidebar 196px；Gateway 42/58 构图平衡；工作区功能完整
- **1440**（权威基线）：Sidebar 216px；Gateway 平衡
- **1920**：Sidebar 保持 216px 不扩展；Gateway 平衡
- 无移动端重设计（本阶段不做）

## Accessibility / reduced motion

- 语义 nav / link / checkbox；键盘可达；`:focus-visible` 2px gold + offset 全局生效
- Evidence Mark：`role="img"` + 描述性 aria-label
- reduced-motion：Halftone 直接呈现最终静态帧；无动画依赖的信息
- 未牺牲可读性迁就生成图

## Tests

- **408/408 通过**（基线 398 + 新增 10）
- 新增 `tests/m7-phase-a.test.tsx`：Gateway 渲染/wordmark/portal/checkbox 文案、无 slogan/nav/footer、Evidence Mark 可访问名、checkbox 写/删 localStorage、偏好跳转 `/app`、`?gateway=1` 强制展示；Rail 六项冻结目标与顺序、`aria-current` 活跃标记、首页精确匹配、无折叠控件
- lint ✅ / typecheck ✅ / production build ✅
- 冻结域测试零改动

## Screenshots captured

`.shots/`（未入库，已加 .gitignore）：

- `gateway-1280.png` / `gateway-1440.png` / `gateway-1920.png`
- `shell-home-1280.png` / `shell-home-1440.png` / `shell-home-1920.png`
- `mark-debug*.png`（Evidence Mark 隔离排障过程稿）

## Files changed

- `app/globals.css`（M7 token 层、半径、focus-visible、sidebar 宽度）
- `app/layout.tsx`（Noto Sans SC / Noto Serif SC / Cormorant Garamond，lang="zh-CN"）
- `components/layout/sidebar.tsx`（重写为 Editorial Rail）
- `components/layout/app-shell.tsx`（注释/表面微调）
- `app/page.tsx`（Gateway 替代 redirect）
- `components/gateway/gateway.tsx`（新）
- `components/gateway/evidence-mark.tsx`（新）
- `tests/m7-phase-a.test.tsx`（新，10 例）
- `.gitignore`（`.shots/`）

## Known limitations

1. headless 一次性截图无法可靠捕获 Halftone 中间帧（虚拟时间下 rAF 基本不触发）；最终静态帧已截图验证，reveal 过程以 smoothstep 相位逻辑 + 兜底计时器保证——真实浏览器人工复核入口：`/?gateway=1`
2. 旧页面正文沿用重映射后的 token（色彩已偏向 M7 色板但未按 M7 版式重排）——Phase B 范围
3. wordmark 末尾 p 的"开放延续"字形处理未做（Readability wins，按任务书允许）
4. 检查框勾选状态的视觉在真实浏览器 hover/focus 细节待 Phase B 统一复核

## Functional conflicts

无。

## Phase A verdict

**PASS**（工程合规）→ 人工视觉验收未过 → 见下方 Phase A.1 修正

## Phase A.1 Visual Fidelity Correction

### 为何初版未通过人工视觉验收

初版满足文本/数值合规，但真实浏览器视觉偏离已批准的高保真方向：Evidence Mark 读起来像上升增长曲线；halftone 像弥散背景点场；Gateway 视觉锚点过小过弱；导航图标仍是通用图标库符号；活跃 rail 太弱；紧凑 wordmark 光学重量不足；Home 头部残留已移除的展示元素。

### Evidence Mark 几何变更

- 单调上升 Bezier → **折叠/开放轨迹**（Catmull-Rom 过五节点）：Signal 顶部 → Content → Publication（最右环点）→ **折返**下左 → Evidence → Learning（更低水平线）→ 开放尾迹向右溶解
- 两次显著变向（Publication 折返、Learning 转右），非单调、非增长曲线、非闭环
- 节点层级重做：Signal 小银点 / Content 绿环 / Publication 银环 / **Evidence = 绿核 + 金环 + 金色 halftone 爆发（视觉重心）** / Learning 绿点 + 淡环（非最高点/最右点）
- 标签（参考图授权）：Signal/Content/Publication/Evidence/Learning，Cormorant italic 13.5px 设计单位，Neutral 灰 / Evidence 用暗金 #AE8A44，次级克制
- 尾迹：Learning 之后 9 个渐隐点（绿→银），开放溶解，非实线

### Halftone 密度变更

- 从均匀网格点场 → **语义密度**：`regionWeight(t)` 沿轨迹加权（Signal 稀疏 0.22，Evidence 峰值 1.0），拒绝采样 + 法向偏移 `pow(rand,1.7)` 快速衰减
- Evidence 周围 120 点金色径向爆发（随半径衰减）
- 仅 22 个极淡环境点防止裁切感；右侧区域不再被均匀填充

### 光学尺度修正（Gateway）

- Wordmark 40px → **72px**（参考图光学重量为准，不盲从数值）
- Portal Button 206×50 → **280×60**，文字 16px，r=8px；与 wordmark 间距 96px
- Checkbox 行 13px → 14px
- Evidence Mark 容器 620px → **700px**，成为真正的品牌锚点

### 自定义导航图标

- 新增 `components/icons/nav-icons.tsx`：六个本地 Loop 轨迹语言 SVG（24 viewBox / stroke 1.8 / 圆帽 / 节点 ≥r1.9 保证 18px 可读）
- 首页 = 开放工作区框 + 返回轨迹；选题雷达 = 信号点 + 扫描针 + 扇形弧（非靶心）；内容工作台 = 文档 + 穿越轨迹（非铅笔）；内容流程 = 三节点 + 一条连续缓波路径（非看板）；数据复盘 = 证据节点 + 回环轨迹（Loop DNA 最强）；设置 = 三条参数轨道 + 控制节点（非齿轮）
- Sidebar 不再引入 lucide 导航图标

### 活跃标记修正

- 20px → **24px × 2px** primary rail，与图标/文字中线对齐；无色块、无 pill、无 glow——编辑级索引标记

### Wordmark 修正（Shell）

- 24px → **26px** Cormorant Semibold，光学重量对齐参考图；不分色、不全大写

### Home 头部清理

- 移除重复的"工作区" eyebrow 与"让每次表现…" slogan；头部仅剩 **首页**
- **Home 正文未重设计**（待处理/继续创作/跟进中 卡片/密度/列宽全部保持旧呈现，Phase B 范围）

### 对比截图

- `.shots/a1-gateway-{1280,1440,1920}.png` vs Reference A
- `.shots/a1-shell-{1280,1440,1920}.png` + `a1-shell-3x.png` vs Reference B
- 显式回答：mark 不再像增长图表 ✅；Evidence 是视觉重心 ✅；halftone 聚集语义结构 ✅；左右锚点足够强 ✅；页面仍极简 ✅；图标具专有感 ✅；活跃标记意图清晰 ✅；wordmark 光学重量足够 ✅；sidebar 仍克制 ✅；无伪 SaaS 元素 ✅；Home 头部仅剩首页 ✅

### 测试 / 构建

- 408/408 ✅（无域测试改动）/ lint ✅ / typecheck ✅ / build ✅

### 与参考图的残余差异

1. 1280 下 Publication 标签贴近右缘（可读但紧）；1920 余量正常
2. Halftone 爆发的径向"弧线感"弱于参考图（参考为更规则的同心弧排布）
3. 选题雷达图标在 18px 下弧线较淡，针形主导
4. Reference B 中的顶栏/头像/问候/收起按钮为任务书 §14 明确禁止项，未实现（有意差异）

### Phase A.1 verdict

**PASS**（视觉已实质逼近批准方向，残余差异均为次级细节或有意取舍）→ 待人工最终验收
