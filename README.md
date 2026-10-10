# ContentLoop

<p align="center">
  <strong>让每次表现，成为下一次创作的依据。</strong>
</p>

<p align="center">
  面向 3–5 人内容团队的 AI 内容运营工作台。<br>
  把选题、生产、发布、复盘串成一条真实的数据闭环，覆盖 小红书 / Bilibili / 抖音。
</p>

<p align="center">
  <a href="#在线体验">在线体验</a> ·
  <a href="#快速开始">快速开始</a> ·
  <a href="#使用指南">使用指南</a> ·
  <a href="#核心闭环">核心闭环</a> ·
  <a href="#它能帮你做什么">它能帮你做什么</a> ·
  <a href="#ai-帮什么不决定什么">AI 边界</a> ·
  <a href="#技术栈">技术栈</a>
</p>

![ContentLoop 落地页](docs/media/gateway.png)

## 在线体验

<https://contentloop-howard15.vercel.app>

部署在 Vercel + Supabase。实例里没有登录墙（V1 定位是单团队私有工具），演示数据带 DEMO 标识、与真实数据隔离。

## ContentLoop 是什么

内容运营的信息散落在选题想法、文档、平台草稿、发布记录和表格里。结果是：团队不断生产内容，却很少把真实表现沉淀成下一次可复用的知识。大多数 AI 工具止步于"生成"——ContentLoop 关心闭环的另一半：**度量、诊断、验证与经验回流**。

## 核心闭环

```text
选题线索 → 内容 → 平台版本 → 发布 → 24h/72h 数据 → 诊断 → 运营测试 → 运营经验 → 下一条内容
```

这个闭环不是演示图：它用一条真实发布的 B站视频完整跑通过——从 AI 选题分析开始，到沉淀出一条可被下一条内容引用的运营经验为止（见 `docs/progress/M9-summary.md` 的真实数据走环记录）。

## 它能帮你做什么

| 模块 | 做什么 |
| --- | --- |
| 首页 | 此刻什么需要你处理：待录入数据、待审核、进行中的测试 |
| 选题雷达 | 把零散线索变成有依据的选题决定（AI 分析 + 人决定选用或跳过） |
| 内容工作台 | 把选题做成结构化资产：内容简报 → 内容母稿 → 平台版本（AI 起草，OLD/NEW 对照，人确认） |
| 内容流程 | 五列看板跟踪每条内容的阶段；发布必须有真实发布记录（标题/时间/链接） |
| 数据复盘 | 真实指标 vs 自身历史基线（近 20 条中位数）+ 关键观察 + AI 诊断 |
| 设置 | 指标定义引擎（别名/派生公式）与三平台内容规范 |

![内容工作台](docs/media/studio.png)

![数据复盘与关键观察](docs/media/analytics.png)

## AI 帮什么，不决定什么

| 场景 | AI 做的 | 人必须做的 |
| --- | --- | --- |
| 线索分析 | 带证据分层给出评估 | 选用或跳过 |
| 简报草稿 | 起草八个简报字段 | 审核、应用、确认 |
| 平台适配 | 把母稿改写为平台草稿 | 接受或拒绝 |
| 表现诊断 | 基于真实指标提出解读 | 编辑并保存（或放弃） |
| 经验草稿 | 从已完成测试起草措辞 | 编辑并保存 |

**AI 不能**：确认简报、发布、下测试结论、保存经验、修改平台规范。没有配置 AI key 时，所有手动流程照常可用。AI 结构化输出写入前一律经 Zod 校验。

## 数据信任

- **留空 ≠ N/A ≠ 0** —— 留空是还没录入，N/A 是本次没有该项数据，0 是真实测到的 0
- **基线 = 自己账号的中位数** —— 绝不引用行业基准
- **演示数据清晰隔离** —— DEMO 内容可见可体验，但不进入运营基线
- **证据定格** —— 诊断和测试结论保存时定格，数据变化会明确提示，绝不静默复用
- **运营测试不做统计显著性检验** —— 它是人对证据的对比判断，不是伪科学打分

## 深色模式与设计

双主题（浅色纸面 / 深色仪器），全部颜色走设计令牌；动效组件（AI 思考、加载、落地页光环）双主题适配。侧栏宠物「小环」把待办数变成它的状态。

![深色模式](docs/media/dark-mode.png)

## 快速开始

```bash
pnpm install
cp .env.example .env   # 填 DATABASE_URL（必需）和 AI_API_KEY（可选）
pnpm db:migrate        # 应用迁移
pnpm db:seed           # 基础配置（品牌/成员/方向/规范/指标定义）
pnpm db:seed:demo      # 可选：演示数据，足够体验完整闭环
pnpm dev               # http://localhost:3000
```

没有 AI key 也能跑：所有 AI 入口降级为手动流程。

## 使用指南

给第一次进来的协作者：ContentLoop 不是一个"AI 生成器"，而是一条工作流水线。你每天的工作就沿着这条流水线往前走，每一步的产物都是下一步的输入。

### 第一次使用：5 分钟准备

1. **设置 → 团队成员**：把自己加进成员列表（seed 里已有示例成员，可改可删）
2. **设置 → 品牌信息**：确认品牌定位和内容方向（Content Pillar）符合你们实际做的账号
3. **设置 → 指标定义**：看看指标别名和派生公式（如"播赞比"）是否符合团队口径，不符合就在这里改——全站的指标计算都以这里为准
4. 右上角月亮图标可切换深色模式；侧栏底部的宠物「小环」会随待办数量变化状态

### 日常走环：七步

> 原则：**每一步都是人做决定，AI 只负责起草和建议。** 任何时候卡住了，首页「待处理」会告诉你下一步该做什么。

**第 1 步 · 选题雷达——把想法变成决定**

看到一个选题灵感（刷到的视频、群里的讨论、自己的点子），在「选题雷达」新建线索，粘贴原始材料。点「AI 分析」，它会给出评分、证据分层（哪些是事实、哪些是推断）和可选角度。**评分只是参考**，你决定「选用」还是「跳过」。

**第 2 步 · 内容简报——先想清楚为什么做**

选用线索后创建内容项目，进入「内容工作台」的简报页。八个字段（目标受众、核心观点、角度……）逐个填；可以点「AI 生成简报草稿」让它先起草，你改完再「确认简报」。**简报不确认，后面无法正式生产**——这是刻意的门槛。

**第 3 步 · 母稿 → 平台版本——一次写作，多平台适配**

在「母稿」页写与平台无关的完整内容。然后到「平台版本」页，选目标平台（小红书 / B站 / 抖音），点「AI 适配」。改动以 **OLD / NEW 对照**展示，逐条「接受」或「拒绝」——AI 永远不会静默覆盖你的文字。右栏 Loop AI 生成内容较长时，点栏边箭头可展开为宽幅审阅视图。

**第 4 步 · 审核——只能由人完成**

到「审核」页完成五项检查清单，点「审核通过」。此后内容在「内容流程」看板进入「待发布」列。看板只有五列：规划中 / 进行中 / 审核中 / 待发布 / 已发布，一条内容一张卡。

**第 5 步 · 发布——记录事实，不是改状态**

内容真的发出去了，回到看板卡片点「标记已发布」，填**平台、最终标题、发布时间、链接**四要素。只拖卡片不改状态不算发布——没有发布记录，后面就没有数据可复盘。

**第 6 步 · 录数据——24h / 72h 两个时间点**

发布后约 24 小时和 72 小时，首页会提醒「待录入数据」。点进去填播放、点赞、评论、收藏等真实数字。规则只有三条：

- 没拿到的数据**留空**，不要填 0（留空 ≠ N/A ≠ 0）
- 千位逗号直接贴：`18,600` 能正常识别
- 填完到「数据复盘」看：当前值 vs 自己账号近 20 条的中位数基线，「关键观察」区自动标出明显高/低于基线的指标，右栏可让 AI 生成诊断（证据不足时它会明说 `insufficient_evidence`，不会硬编结论）

**第 7 步 · 测试 → 经验——让数据沉淀成方法**

基于诊断可以建一个「运营测试」（A/B、前后对比、内容对比等），做完后由你下结论（有效 / 有取舍 / 不明确 / 无效）。有价值的结论点「生成经验草稿」，编辑保存为「运营经验」。下次写简报时，相关经验会被推荐出来，点「应用」即完成闭环——**表现真正成了下一次创作的依据**。

### 一个真实案例

这条流水线用一条真实发布的 B站视频完整跑通过（视频：《从夯到拉锐评中美七大桌面办公AI agent》）：

1. 选题雷达录入选题 → AI 分析后选用
2. 内容工作台完成简报 → 母稿 → B站版本适配
3. 审核通过 → 待发布 → 发布后录入真实发布记录
4. 24h 数据：播放 3,066 / 点赞 44 / 评论 3 / 收藏 446；72h：8,890 / 97 / 11 / 773
5. 数据复盘显示**收藏率显著高于基线**（工具属性内容的典型信号）→ AI 诊断给出解读
6. 由此创建运营测试验证假设 → 沉淀为一条「运营经验」
7. 新建下一条 AI 方向内容时，这条经验在简报页被推荐并应用

### 协作者常见问题

| 问题 | 答案 |
| --- | --- |
| 看到带 DEMO 标记的内容 | 演示数据，随便点随便改，不会污染真实基线 |
| 我没有 AI key | 不影响：分析、简报、适配都能手动做，AI 只是加速器 |
| 数据填错了 | 数据复盘页可以补录/修正；已保存的诊断会提示证据已变化，不会静默复用旧结论 |
| 指标口径和团队不一致 | 去「设置 → 指标定义」改公式或别名，别在别处纠结 |
| 想加新平台 | V1 只支持小红书 / B站 / 抖音，这是范围决策 |

## 它明确不做什么

多租户/权限系统、平台自动发布与数据同步、爬虫、统计显著性引擎、自动化经验应用、移动端优先。这些是范围决策，不是缺失。

## 技术栈

- **Next.js 16 + React 19 + TypeScript** — 全栈单仓库
- **Tailwind CSS 4** — 令牌驱动的 editorial 设计系统（双主题）
- **Drizzle ORM + Supabase PostgreSQL** — 20 张表、可提交的迁移链
- **DeepSeek（OpenAI 兼容）** — 单 provider 协议客户端
- **Vitest + jsdom** — 430+ 单元与组件测试
- **部署** — Vercel（数据库走 Supabase Session Pooler）

## 文档

规格文档：[PRD](docs/ContentLoop_PRD_v1.md) · [数据模型](docs/ContentLoop_data-model_v1.md) · [设计](docs/ContentLoop_design_v1.md) · [演示脚本](docs/demo-script.md)（含 2–3 分钟面试简版）。里程碑记录：`docs/progress/M0–M9`。

---

# Technical Runbook

## Requirements

Node.js 20+, pnpm, PostgreSQL 14+ (Supabase recommended; use the **Session Pooler** URI — direct `db.*.supabase.co` connections are IPv6-only and unreachable from Vercel serverless).

## Commands

```bash
pnpm dev / build / start / test / lint / typecheck
pnpm db:migrate      # committed migrations only (db/migrations)
pnpm db:seed         # idempotent bootstrap
pnpm db:seed:demo    # optional demo fixtures (isDemo=true, excluded from baselines)
```

## Environment

Server-only: `DATABASE_URL` (required), `AI_API_KEY` (optional), `AI_BASE_URL` / `AI_MODEL` (optional overrides). No `NEXT_PUBLIC_*` variables.

## Deployment

Vercel: set env vars, deploy as-is. AI routes declare `maxDuration = 60`. Fallback: any Docker/VPS with `pnpm build && pnpm start`.

## Security boundary

V1 has no application-level auth by design (single-team private tool). Do not expose a writable instance to the public internet without hosting-level access control. Human confirmation is a workflow boundary, not authentication.

Live demo: https://contentloop-howard15.vercel.app
