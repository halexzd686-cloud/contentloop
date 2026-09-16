# M7 Summary — Visual Redesign V2（生产移植）

## Completed
- M7 视觉系统从 `/dev/m7-prototype/*` 冻结原型逐页移植到生产路由，P1–P8 全部完成并逐页验收
- 六个正式路由全部换为 Editorial SaaS V2 呈现：Home / Radar / Studio / Pipeline / Analytics / Settings + Gateway 落地页
- 生产数据、业务逻辑、API 一律未动；所有改动为呈现层
- 中途修复：Studio 徽标对齐（固定动作槽）、Pipeline 1440 溢出、Studio 宽屏密度、Radar 搜索（方向 D 展开式）、AI 按钮点击态（按钮消失→ThinkingOrbs）、输入框双层描边、喷泉页面加载、乱码临时数据清理

## Architecture Decisions
- **动画角色冻结**：入场 = Gateway Halftone 弧扫（1.4s 后静止）；AI 推理 = ThinkingOrbs V2（gyro，canvas）；数据读取 = RibbonPillLoader（lemniscate ∞ + 胶囊 pill，MetalForge ribbon 风格）；系统处理 = SpiralLoader；页面切换 = FountainLoader
- **AI 动作按钮**：`components/ui/ai-action-button.tsx`（A2 极光描边：conic 流光 + 呼吸光晕 + 符号自转；点击无过渡动效，直接触发）——四处 AI 入口统一（Studio 简报/平台适配、Radar 分析、Analytics 诊断）
- **轨迹动作**：NodeArrow（`components/ui/node-arrow.tsx`，箭头 C 双节点）仅用于真实下一阶段，每页 ≤2-3 处
- **Index Tabs** 为全站筛选/切换统一语言（文字 + 2px 绿下划线）；选中对象 = 2px 绿 rail + 淡绿底
- **Studio 三栏**：Sources 218px ｜ 文档页 max-w-960 ｜ Loop AI 248px；母稿模块发丝化（无卡片）
- **Pipeline**：五列收进 document 看板面板（B）+ 右侧 230px 待录入数据栏（C，可点击直达录入弹窗）
- **Analytics**：概览数字条（方案 C，Cormorant 大数字 + 中位数）+ 账本式事实区 + 基线四列网格；Loop AI 检查器 320px
- **Settings**：Utility Index 侧栏 + Configuration Ledger；Platform Playbook 仍缺席（见 M8-backlog）
- ShinyText 从 Studio 检查器移除（原型以金点+静态提示替代）；`lib/ai-visual` 与组件文件保留，测试仍覆盖

## Schema Changes
- 无

## Important Files
- 动画：`components/motion/thinking-orbs.tsx`、`ribbon-pill-loader.tsx`、`fountain-loader.tsx`、spiral（globals.css）
- 共享：`components/ui/ai-action-button.tsx`、`node-arrow.tsx`；AI magic CSS 在 `app/globals.css`（`.ai-magic-btn*`）
- 页面：`app/app/{page,radar,studio,pipeline,analytics,settings}`；Gateway：`app/page.tsx` + `components/gateway/`
- 原型冻结参考：`app/dev/m7-prototype/*`

## Known Issues
- Gateway 在 headless 截图中节点标签过小（真实浏览器已验收，无碍）
- Tests/Learnings section 组件（Analytics 下部）维持 M5.6 样式，未深改
- Master/Platforms/Review 面板内部沿用旧结构，仅套文档外壳

## Deferred
- 平台规范 Playbook（GET API + UI）、manual checkpoint（M8-backlog）
- Analytics「关键观察」确定性结论区（生产未实现该数据，未虚构）

## Frozen Constraints
- 色板：#7C9482 / #D4B26A / #C8C9CB / #626660 / #20231F / #F5F6F3 / #FBFBF8 / #EDEFEA；功能性小字必须 #626660，#8B8E87 仅装饰
- 字体：Noto Sans SC（主）/ Noto Serif SC（文档标题）/ Cormorant（编号·概览数字）/ Playfair（评分）
- 五阶段看板、六个导航、24h/72h 双 checkpoint、留空≠N/A≠0、AI 只建议不持久化
- @keyframes 内禁止 CSS 变量（Spiral 教训）；canvas 动效统一契约（RAF cleanup、DPR≤2、离屏暂停、reduced-motion 静态帧）

## Next
- M8：Playbook GET API + 设置页 UI、manual checkpoint 决策、Tests/Learnings section 视觉对齐
