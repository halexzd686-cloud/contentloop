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
