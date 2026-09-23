# M9 Summary — 响应式适配 + Loop AI 审阅展开 + 深色模式

> 三项均为用户提出并逐项拍板（2026-09-18）。顺序：① 响应式 → ② Loop AI 展开 → ③ 深色模式。

## Completed

### ① 分辨率适配（AGENTS §27 规范内）
- 六页 + Studio 详情 + Gateway × 六档（1024/1280/1366/1440/1920/2560 CSS 宽度）headless Chrome 实拍审计（48 张，`.shots/m9-responsive/`）
- **Pipeline 看板**：列 `minmax(190px,1fr)` + 面板内 `overflow-x-auto`——CJK 标题不再逐字换行
- **侧栏**：<1280 自动折叠为 64px 纯图标（「CL」字标，用户拍板，更新 M7 "no manual collapse" 注记）
- **CollapsibleRail**（`components/layout/collapsible-rail.tsx`）：<1200 时 Analytics 320px 检查器 / Studio 248px Loop AI 栏折叠为浮动入口 + 覆盖式滑出
- Analytics checkpoint tabs `whitespace-nowrap`；Studio 简报头部 flex-wrap 守卫

### ② Loop AI 审阅展开
- 右栏头部「‹」→ 覆盖式从右向左滑出 `min(720px,92vw)`，「›」/Esc/面板外点击收起；260ms，reduced-motion 瞬切
- **children 不重挂载**（同一宿主元素切 className + invisible 占位撑布局）——未保存的 AI 提案编辑不丢
- 展开态经 `[data-loop-ai-expanded]` 后代 CSS 切审阅排版（14.5px/1.8、15px 区块标题、600px 内容列）
- <1200 浮动入口同样打开 720px 审阅版（统一一档）
- 4 个交互测试（`tests/collapsible-rail.test.tsx`）：展开/收起/Esc/窄屏入口、children DOM 引用保持

### ③ 深色模式（**用户拍板修订 AGENTS §3**，移除 Dark mode 禁令）
- **令牌架构**：`app/globals.css` `:root` 浅色（逐像素不变）+ `[data-theme="dark"]` 深色全量映射；用户指定三色 #658761（主强调）/#DFA05D（语义金）/#AC5045（仅危险）+ ink 家族反演底色（#1A1C19 canvas / #232620 文档面）；换纸不换版
- **切换**：侧栏底部日/月钮（手动 + localStorage["cl-theme"] 持久化 + `cl-themechange` 事件）；`app/layout.tsx` 防 FOUC 内联脚本（也接受 `?theme=dark` 查询参数，供实拍/分享）
- **扫荡**：生产代码 ~220 处硬编码色 → 令牌（9 个并行子任务；`app/dev/**` 冻结原型有意不扫）
- **动效适配**：`lib/theme.ts`（getComputedStyle 运行时解析 + cl-themechange 订阅）——canvas 实测不支持 var()；ThinkingOrbs/RibbonPill/EvidenceMark/Halftone 全部运行时解析+主题切换重绘；SVG 组件改 style 形式；.ai-magic-btn 深色覆写块；@keyframes 零变量原则保持

## Architecture Decisions
- 响应式只做 max-width/minmax 护栏 + §27 允许的折叠，不做移动优先重设计
- CollapsibleRail 是 ②③ 的基座：① 的窄屏折叠、② 的审阅展开同一组件
- 深色模式 = 纯令牌切换，零结构变化；浅色模式逐像素不变的验收方式 = 令牌浅色值=原硬编码值
- canvas 组件契约新增：色值一律运行时解析 + 主题事件重绘（RAF 契约不变）

## Schema Changes
- 无

## Important Files
- `components/layout/collapsible-rail.tsx`、`components/layout/sidebar.tsx`（折叠 + 主题钮）
- `app/globals.css`（双主题令牌块 + .ai-magic-btn 深色覆写 + 侧栏折叠 media query）
- `lib/theme.ts`（canvas 主题解析）、`app/layout.tsx`（防 FOUC）
- `tests/collapsible-rail.test.tsx`
- 实拍：`.shots/m9-responsive/`（审计 48 张 + 修复复拍 + dark-* 7 页深色 + light-check 回归）

## Known Issues
- 瞬态加载动效（ThinkingOrbs/RibbonPill）的深色态未经实拍（canvas 令牌路径已由 Gateway Halftone 深色实拍间接验证）
- 断点跨越时 CollapsibleRail children 重挂载一次（resize 边缘场景，① 起即如此）

## Deferred
- `app/dev/**` 冻结原型不做深色适配（非生产路由）
- Test 是否支持 manual checkpoint（M8 遗留待决策）
- Analytics「关键观察」确定性结论区（M7 遗留，需定数据来源）

## Frozen Constraints（更新）
- AGENTS §3 已移除 Dark mode 禁令（2026-09-18 用户拍板）；设计文档 §2.1 已改为双主题章
- M7 色板冻结扩展为：浅色板 + 深色板双冻结（色值见 globals.css，改动需用户批准）
- 其余 M7/M8 冻结约束全部继承

## Verification
- typecheck ✅ / lint 0 error（8 warning 既有基线）✅ / tests **413/413** ✅ / build ✅
- ① 修复复拍：pipeline-1366/1024、analytics-1024、studio-detail-1024 全部达标
- ② 内联「‹」实拍（1440）+ 4 交互测试
- ③ 深色实拍 7 页（含 Gateway canvas）+ 浅色回归无变化

## Next
- V1 真实数据走环（§42 已在 M8 用 DEMO 彩排全通，待团队真实内容验证）
- 两个遗留决策：Test manual checkpoint、「关键观察」数据来源

## V1 真实数据走环（2026-09-22，用户真实 B站帖子）

§42 环路首次以**真实内容+真实数据**走通：Signal(ce562667) → AI 分析 → Content(ab7ea3cb) → Brief（AI 草稿+人改写）→ 母稿 → B站 AI 适配（hasPlaybook=true）→ 审核 → 真实发布登记（BV1wmeG6bE47，2026-09-17 发布）→ 真实 24h（7899/300/4/46）+ 72h（3.3w/600/17/89）→ 基线（n=1）→ 诊断（low confidence 如实）→ 双真实作品对比测试（评论率 0.27% vs 0.09%，win）→ Learning（如实标注样本极小）→ 新内容应用（application d69ac4aa）。全程无 DEMO 标，进真实基线队列。

**真实运营发现（产品洞察）**：工作区品牌上下文为 AI 内容向，AI 对游戏选题打 15/25 分且角度强行向 AI 靠——「AI 锚定品牌上下文」对跨题材团队是真实摩擦点；人审稿/自选角度路径正常工作（人掌控原则成立）。基线 n=1 时诊断如实低置信度、测试结论如实标注样本不足——证据纪律在真实数据下成立。

数据近似说明：capturedAt 按到期点 +20min 近似（用户未提供实际观察时间）；URL 去跟踪参数存规范链接；内容方向留空（现有方向为 AI 类）。

## 追加决策（2026-09-22，用户确认）

- 三角洲游戏帖为用户「试工具」的一次性内容，主业为 AI 内容：两条游戏内容（八 boss 帖 + 二期）已标 DEMO（记录与数据完整保留、界面带 DEMO 徽标，但退出真实基线队列，避免离群值扭曲 AI 主业基线）
- 由此衍生的测试结论与 Learning 记录保留（诚实得出的证据不删除）
- 转型预案无需提前建设：未来新增内容方向 + 改写平台规范均为设置页操作

## 追加功能（2026-09-23，用户拍板两个遗留项都做）

- **Test 支持 manual checkpoint**：`createTestSchema` 与 `CHECKPOINTS` 同源；迁移 `0012_silky_the_hand.sql` 放宽 tests.checkpoint CHECK 至 ('24h','72h','manual')（纯 DROP/ADD CHECK，已应用到真实 Supabase 并验证）；创建对话框新增「手动」选项（checkpointLabel）；实测 manual 测试创建 201 + discard 清理无遗留
- **「关键观察」规则化结论区**：`lib/metrics/observations.ts` 纯函数（ratio≥2 显著高于 / ≤0.5 显著低于 / median=0 不带倍数 / 无基线空数组），`getAnalyticsDetail` 加 observations 字段（baseline 失败边界不变）；UI 在概览与表现事实之间，账本语言 + 状态点 + 「确定性规则 · 非 AI」标注；13 个新测试
- 测试基线 427/427；关键观察区已用真实数据实拍验证

## AI 按钮重设计（2026-09-23，用户拍板）

- M7 A2 极光按钮（conic 流光+呼吸+自转三个待机动画）判定过度设计，违反 §24「无持续待机动画」精神 → 重设计为 **B+ 双线框**：1px 主绿描边 + 2px 内缩发丝 keyline + 静态轨道符号（不再自转）；hover 淡绿底+内线加深（150ms）；零待机动画
- 用户明确否决 B++ 的 serif「Loop AI」前缀（面板身份已说明，不多余）
- `components/ui/ai-action-button.tsx` 重写（class 更名 ai-action-btn）；globals.css 删除全部 .ai-magic-btn 及三个 keyframes + 深色覆写块；五处入口（Studio 简报/平台适配、Radar 分析、Analytics 诊断×2、设置规范起草）共用组件零改动自动生效
- 对比原型页：`app/dev/ai-button-variants`（dev-only）；生产实拍验证（Analytics 诊断区）

## 小环（侧栏宠物，2026-09-23 用户拍板新增）

- **形象**：SVG 手绘薄荷绿团子（GLOB 风格胶囊眼），零素材全令牌，深色自动适配；40px / 折叠侧栏 28px
- **位置**：侧栏底部，主题切换钮上方
- **功能**（接真实数据）：GET /api/attention 紧凑接口（语义与 lib/home buildHomeModel 同源，isDemo 排除）→ 金色数字徽章 + 「需要关注」面板（待录入指标/待审核/进行中测试，点击直达）；有待办时眼神朝面板方向
- **动效**（§25 例外已修订入 AGENTS）：~6s 一次 150ms 眨眼；拖拽倾斜 ±15° 松手 260ms 回正（位移 ≤5px 判为点击）；reduced-motion 全静止
- 文件：lib/attention.ts（纯函数）+ app/api/attention/route.ts + components/layout/sidebar-pet.tsx；lib/contents.ts 抽取 listContents 消除查询漂移；tests/attention.test.ts 6 用例
- 验收：typecheck/lint/build ✅，测试 433/433，三态实拍（浅/深/窄折叠）

## 小环设计探索（2026-09-23，结论：保持现状）

- 第一轮生产版（平涂团子+胶囊眼+金牌徽章）上线后，用户判定"有点普通"，进行了三轮设计探索（原型页 app/dev/pet-variants，dev-only 保留）：R1 仪表环/体积感/轨道眼 → R2 史莱姆形态四案 → R3 衔尾环/表情系统/融合
- **最终决策：保持生产现状，不替换**。探索资产留在 dev 页备查，若日后重启可直接从 R3-W3（衔尾环+表情系统）续起
- AI 按钮重设计（B+ 双线框）已上线，与小环现状风格协调
