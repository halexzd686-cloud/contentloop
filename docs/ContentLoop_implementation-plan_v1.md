# ContentLoop V1 — Implementation Plan

> **文档角色**：开发执行真相源（Source of Truth for Delivery & Execution）  
> **适用版本**：V1（3–5 人小型内容团队）  
> **开发周期**：3–4 周  
> **建议节奏**：28 天以内完成完整 V1，但第 7–10 天必须形成可运行 MVP 并开始真实 Dogfooding  
> **依赖文档**：`ContentLoop_PRD_v1.md`、`ContentLoop_data-model_v1.md`、`ContentLoop_design_v1.md`

---

# 0. 开发总原则

ContentLoop V1 必须遵守：

> **先跑通业务闭环，再补产品完成度。**

开发优先级不是：

```text
Landing
→ Animation
→ Dashboard
→ Mock Data
```

而是：

```text
Data Model
→ Core Workflow
→ Real Publication
→ Real Metrics
→ Diagnosis
→ Test
→ Learning Loop
→ UI Polish
```

V1 最重要的不是“页面数量”，而是：

> **一条真实内容是否可以从 Signal 一直走到 Learning，再影响下一条 Content。**

---

# 1. 四份规格的优先级

Coding Agent 每次执行任务前必须读取并遵守：

## Product Scope
`ContentLoop_PRD_v1.md`

负责：

- 功能范围
- 页面结构
- 业务流程
- Out of Scope

## Data Structure
`ContentLoop_data-model_v1.md`

负责：

- Entity
- Relationship
- State
- Field
- Data boundary

## UI / UX
`ContentLoop_design_v1.md`

负责：

- Layout
- Color
- Typography
- Component
- Motion
- Responsive

## Delivery
`ContentLoop_implementation-plan_v1.md`

负责：

- 开发顺序
- Task
- Milestone
- Acceptance

若文件之间冲突：

```text
业务逻辑 → PRD
数据关系 → data-model
视觉交互 → design
开发顺序 → implementation-plan
```

Coding Agent 不得自行“综合理解”后覆盖明确规则。

---

# 2. 技术栈建议

V1 推荐保持单体、低运维复杂度。

## Frontend / Full-stack

```text
Next.js
TypeScript
App Router
pnpm
```

## Database

推荐：

```text
PostgreSQL
```

开发便利优先可使用：

```text
Supabase
```

但不要把产品设计成 Supabase 管理后台。

## ORM

二选一：

```text
Drizzle ORM
```

或：

```text
Prisma
```

推荐选择团队最熟悉的一种，不为“最佳实践”反复切换。

## Validation

```text
Zod
```

所有 AI Structured Output、Platform Data、Import Mapping 都必须经过 Schema Validation。

## UI

推荐：

```text
Tailwind CSS
shadcn/ui（只作为基础组件骨架）
Lucide Icons
```

注意：

> shadcn/ui 不是视觉设计真相源。

必须按 `design.md` 二次定制，不能直接保留默认视觉。

## Motion

```text
Motion / Framer Motion
```

React Bits 仅：

- EchoText
- HalftoneReveal
- Prism

## Charts

推荐：

```text
Recharts
```

或其他稳定常规图表库。

不得为了视觉效果自己造 3D 数据可视化。

## AI Layer

使用一个统一 AI Provider Adapter。

V1 只需支持当前选定的一个模型。

接口抽象可类似：

```ts
interface AIProvider {
  generateStructured<T>()
  generateText()
}
```

但不要开发多 Provider Router UI。

## File Import

CSV：

```text
Papa Parse
```

Excel：

```text
SheetJS / xlsx
```

## Optional Analytics Worker

只有在 JS 数据处理明显不方便时再加入：

```text
Python / FastAPI
```

V1 默认优先 TypeScript 单体。

---

# 3. 推荐项目结构

```text
contentloop/
│
├── app/
│   ├── (marketing)/
│   │   └── page.tsx
│   │
│   ├── app/
│   │   ├── page.tsx
│   │   ├── radar/
│   │   ├── studio/
│   │   ├── pipeline/
│   │   ├── analytics/
│   │   └── settings/
│   │
│   └── api/
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── home/
│   ├── radar/
│   ├── studio/
│   ├── pipeline/
│   ├── analytics/
│   ├── settings/
│   └── motion/
│
├── lib/
│   ├── ai/
│   ├── analytics/
│   ├── imports/
│   ├── metrics/
│   ├── baseline/
│   ├── validation/
│   └── db/
│
├── db/
│   ├── schema/
│   ├── migrations/
│   └── seed/
│
├── types/
│
├── public/
│
├── docs/
│   ├── ContentLoop_PRD_v1.md
│   ├── ContentLoop_data-model_v1.md
│   ├── ContentLoop_design_v1.md
│   └── ContentLoop_implementation-plan_v1.md
│
└── tests/
```

不要求完全一致，但模块边界必须清晰。

---

# 4. 开发阶段总览

建议分为 5 个 Milestone：

```text
M0 — Foundation
M1 — Core Content Workflow
M2 — Real Publication & Analytics
M3 — Test & Learning Loop
M4 — Productization & Portfolio
```

时间建议：

| Milestone | 时间 |
|---|---:|
| M0 Foundation | Day 1–2 |
| M1 Core Workflow | Day 3–8 |
| M2 Analytics | Day 9–16 |
| M3 Learning Loop | Day 17–21 |
| M4 Productization | Day 22–28 |

第 7–10 天必须具备可运行 MVP。

---

# 5. M0 — Foundation

## 时间

Day 1–2

## 目标

建立一个稳定的项目骨架，使后续 Coding Agent 不需要反复重构核心结构。

---

## 5.1 初始化项目

完成：

- Next.js
- TypeScript
- pnpm
- Tailwind
- UI primitives
- Lint
- Formatter
- Environment config

验收：

```text
pnpm dev
pnpm lint
pnpm build
```

均正常。

---

## 5.2 建立 Design Tokens

先建立：

- Canvas
- Workspace
- Ink
- Mint
- Semantic colors
- Radius
- Border
- Motion durations

不得等所有页面开发完再统一样式。

验收：

- Button
- Input
- Card
- Chip
- Tabs
- Drawer
- Modal

至少有一个 Story / Demo route 或内部组件页用于验证。

---

## 5.3 Database Schema

首先完成核心表：

```text
brands
team_members
content_pillars
platform_playbooks
metric_definitions

signals
competitor_references

contents
sources
content_briefs
content_masters
platform_versions
content_reviews

publications
metric_snapshots

diagnoses
tests
test_publications
learnings
learning_applications
```

轻量表可后续补：

```text
content_version_history
metric_import_jobs
```

---

## 5.4 Seed Data

创建最少 Seed：

```text
1 Brand
3 Team Members
3 Content Pillars
3 Platform Playbooks
5 Signals
3 Contents
```

Seed 必须标记为：

```text
DEMO
```

不要把 Seed Data 当真实运营数据。

---

## M0 Acceptance

必须达到：

- App Shell 可访问
- Sidebar 正常
- 数据库 Migration 正常
- Seed 正常
- Design Tokens 建立
- 不出现未经批准一级导航

---

# 6. M1 — Core Content Workflow

## 时间

Day 3–8

## 目标

打通：

```text
Signal
→ Content
→ Studio
→ Review
→ Pipeline
```

第 8 天前必须能够真实创建一条可发布内容。

---

# 7. Day 3 — Radar Core

完成：

## Signal List

- All
- New
- Selected
- Skipped

## Add Signal

- URL
- Idea

## Signal Card

展示：

- Source
- Title
- Time
- Summary
- Topic Score
- Status

## Quick Review

先实现静态业务结构：

- Why It Matters
- Audience Match
- Content Risk
- Possible Angles

## Skip

- Skip Reason

## Create Content

确认：

- Platform
- Angle
- Owner

然后创建 Content。

---

## Radar 暂时不做

Day 3 不做：

- Halftone
- Competitor AI
- 高级 AI Analyze
- Motion polish

先跑业务。

---

## Day 3 Acceptance

用户能：

```text
Add Signal
→ Select
→ Create Content
```

数据库关系正确。

---

# 8. Day 4–5 — Studio Brief & Master

完成：

## Studio Layout

三栏：

- Sources
- Workspace
- Loop AI placeholder

## Brief

完整 8 字段。

支持：

- Save
- Auto Save
- Approve

## Content Master

模块：

- Hook
- Core Message
- Section
- Demo
- Evidence
- Conclusion
- CTA

支持：

- Add
- Edit
- Reorder
- Delete module

---

## Day 5 Acceptance

用户可以：

```text
Signal
→ Content
→ Brief
→ Approve Brief
→ Build Content Master
```

刷新浏览器后内容不丢失。

---

# 9. Day 6 — Platform Versions

完成：

## Xiaohongshu

- Cover Copy
- Title
- Opening
- Body
- CTA
- Tags

## Bilibili

- Title
- Cover Copy
- Opening Hook
- Script
- Chapters
- Description

## Douyin

- Hook
- Script
- Rhythm Notes
- CTA

实现：

```text
Content 1 → N PlatformVersion
```

平台 Version 必须相互独立保存。

---

# 10. Day 7 — Review & Pipeline

完成：

## Review Checklist

- Facts Confirmed
- Title/Cover Match
- Platform Fit
- Risk Checked
- Human Reviewed

## Approve

Checklist 全部通过后：

```text
PlatformVersion → approved
```

## Pipeline

5 列：

- Planning
- In Progress
- Review
- Scheduled
- Published

实现 Drag & Drop。

---

## Day 7 Acceptance

至少一条 Content：

```text
Radar
→ Studio
→ Human Review
→ Pipeline Scheduled
```

完整可跑。

这一天起项目具备 MVP 雏形。

---

# 11. Day 8 — Publication

完成：

## Mark as Published

Modal：

- Platform
- Final Title
- Published At
- URL
- Cover optional
- Notes optional

写入：

```text
Publication
```

注意：

PlatformVersion 与 Publication 必须分开。

完成后自动建立：

- 24h data due
- 72h data due

可以通过计算得到，不必创建复杂 Scheduler。

---

## Day 8 Acceptance

用户可以真实在平台发布内容，然后把：

```text
URL
Published At
Final Title
```

记录回 ContentLoop。

从 Day 8 起建议开始真实 Dogfooding。

---

# 12. M1 禁止事项

M1 阶段严禁：

- Landing 优化
- React Bits 大量接入
- 全局 Ask Loop
- 复杂 Calendar
- Experiment Lab
- 多模型
- Dark Mode

如果 Coding Agent建议“顺手做”，拒绝。

---

# 13. M2 — Real Analytics

## 时间

Day 9–16

## 目标

这是 ContentLoop V1 最重要的阶段之一。

打通：

```text
Publication
→ Metrics
→ Derived Metrics
→ Baseline
→ Diagnosis
```

Analytics 优先级高于视觉润色。

---

# 14. Day 9 — Quick Metric Update

完成单条 Publication：

```text
24h
72h
```

手工填写原始指标。

根据平台允许输入：

- impressions
- views
- likes
- saves
- comments
- followers_gained

缺失允许 null。

---

## Day 9 Acceptance

用户可以对一条真实 Publication 创建：

- 24h Snapshot
- 72h Snapshot

且两者不互相覆盖。

---

# 15. Day 10–11 — Metric Engine

完成：

## Metric Definitions

创建默认：

- Like Rate
- Save Rate
- Comment Rate
- Follow Rate

只有存在所需字段时才计算。

例如：

```ts
safeDivide(likes, views)
```

若 views：

- 0
- null

必须返回：

```text
N/A
```

而不是 Infinity 或伪 0%。

---

## Metric Alias

Settings 支持：

- Display Name
- Alias
- Numerator
- Denominator

---

## Day 11 Acceptance

同一 Snapshot 可以稳定输出：

- raw metrics
- derived metrics

且明确 Formula。

---

# 16. Day 12 — Baseline Engine

实现：

## Account Baseline

条件：

- Same Platform
- Last N comparable Publications
- Metric exists

默认：

```text
N = 20
Median
```

## Pillar Baseline

再加：

- Same Content Pillar

计算必须忽略 null。

---

## Baseline Acceptance

单条内容能够显示：

```text
Save Rate
7.3%

Account median
4.8%

Pillar median
6.1%
```

并正确计算 delta。

---

# 17. Day 13 — Analytics UI

完成：

## Account Summary

- 7 Days
- 30 Days

## Content Performance List

字段：

- Content
- Platform
- Published At
- Pillar
- Views
- Like Rate
- Save Rate
- Snapshot status
- Indicator

## Detail

左：

- Metrics
- Baseline
- Funnel

右：

- Loop Analysis placeholder

---

# 18. Day 14 — CSV / XLSX Import

完成：

```text
Upload
→ Detect Columns
→ Suggest Mapping
→ Human Confirm
→ Import
```

V1 可以先使用：

- Rule-based field aliases
- Fuzzy matching

AI Mapping 作为增强，不要求第一版完全依赖 LLM。

字段不确定：

```text
Needs Mapping
```

不得自动错误导入。

---

## Import Acceptance

至少测试：

### Case A

标准中文字段。

### Case B

字段名称不同但语义接近。

### Case C

缺少部分指标。

### Case D

出现未知列。

系统必须可恢复。

---

# 19. Day 15–16 — Structured Diagnosis

实现 Analytics AI。

输入必须包含：

- Current Snapshot
- Metric Definitions
- Account Baseline
- Pillar Baseline

输出固定 Schema：

```ts
{
  whatHappened,
  evidence[],
  possibleReasons[],
  confidence,
  nextActions[]
}
```

要求：

- evidence max 3
- possibleReasons max 2
- nextActions max 3

支持：

```text
insufficient_evidence
```

---

## Diagnosis Validation

AI 输出必须经过 Zod。

无法通过：

- retry
- 或显示 graceful failure

不得直接把 malformed JSON 写入数据库。

---

## Day 16 Acceptance

用户可以完成：

```text
真实 Publication
→ 24h / 72h Data
→ Baseline
→ AI Diagnosis
```

此时 ContentLoop 已经具备核心运营价值。

---

# 20. M3 — Test & Learning Loop

## 时间

Day 17–21

## 目标

真正完成：

```text
Diagnosis
→ Test
→ Learning
→ Next Content
```

---

# 21. Day 17 — Create Test

Analytics 中加入：

```text
Create Test
```

Drawer 字段：

- Title
- Hypothesis
- Change
- Primary Metric
- Keep Consistent
- Compare With
- Method

Method：

- AB
- Sequential
- Before/After
- Content Comparison

---

# 22. Day 18 — Test Result

Analytics：

```text
Performance | Tests
```

Tests 分：

- Running
- Concluded

Conclude Test：

选择：

- Win
- Trade-off
- No Clear Result
- Loss

填写：

- Conclusion

不要自动根据单指标判 Winner。

---

# 23. Day 19 — Learning

Concluded Test：

按钮：

```text
Save Learning
```

AI 可以：

```text
Generate Learning Draft
```

用户：

- Edit
- Confirm

保存：

- Text
- Platform
- Pillar
- Evidence
- Related Test

---

# 24. Day 20 — Relevant Learning

Studio 打开 Content 时：

根据：

- platform
- pillar

匹配 Learning。

展示：

```text
Relevant Learning
[Apply] [Dismiss]
```

点击 Apply：

写入：

```text
LearningApplication
```

AI 后续生成 / rewrite 可读取该 Learning。

---

# 25. Day 21 — Full Loop E2E

必须完成一次完整测试：

```text
Signal A
↓
Content A
↓
Publication A
↓
Metrics
↓
Diagnosis
↓
Test
↓
Learning #1
↓
Content B
↓
Relevant Learning #1
↓
Apply
```

这一天是 V1 最关键的业务验收日。

如果这条路径未通过：

> 不进入大规模 UI polish。

---

# 26. M4 — Productization

## 时间

Day 22–28

## 目标

将“能跑的系统”提升成：

> **可以每天使用，也适合作品集展示的完整产品。**

这一阶段不再主动增加业务模块。

---

# 27. Day 22 — Home

完成：

- Greeting
- Today
- Priority Item
- Secondary actions
- Loop Insight
- 4 pinned metrics
- Content Flow
- Signals
- + New

Priority 不需要复杂 AI Priority Engine。

可采用确定性规则：

```text
Overdue
Review due
Scheduled today
Metric review due
```

---

# 28. Day 23 — Calendar + Pipeline Polish

完成：

## Calendar

- Week
- Month
- Drag unpublished
- Editorial Calendar visual

## Pipeline

- Content Drawer
- Overdue
- Breaking
- Platform sub-status
- Archive behavior

---

# 29. Day 24 — Studio Advanced

加入：

## Source-linked Writing

关键 Fact 可关联 Source。

## AI Diff

Old / New / Accept / Reject。

## Content QA

- Facts
- Platform Fit
- Promise Match
- Risk

## Visual Brief

---

# 30. Day 25 — Radar Advanced

加入：

## Competitor References

1–5 URLs。

## Competitor Breakdown

- Angle
- Hook
- Structure
- What Works
- What To Avoid

## Content Gap

避免虚假百分比。

## HalftoneReveal

只加入重点 Signal。

---

# 31. Day 26 — Playbook + Settings

完成：

## Brand
## Team
## Playbooks
## Metrics

Playbook：

- Voice
- Title Style
- Hook
- Structure
- CTA
- Avoid
- Good Examples

允许：

```text
Generate Draft
```

但人保存。

Learning 可以：

```text
Add as Rule
```

---

# 32. Day 27 — Ask Loop + Motion

加入轻量 Ask Loop。

仅当前页面 Context。

## Home

当前运营摘要。

## Radar

当前 Signal。

## Studio

当前 Content / Sources / Playbook。

## Analytics

当前 Publication / Metrics / Baseline。

同时完成：

- EchoText
- Prism
- Motion Tokens
- Loading
- Empty States
- Success feedback

必须按 design.md 限制。

---

# 33. Day 28 — Landing + Portfolio Mode

最后才做 Landing。

建议 Landing 仅讲三个核心价值：

## Discover
Radar

## Create
Studio

## Learn
Analytics → Learning

Hero：

```text
ContentLoop

From topic to content,
from data to the next decision.
```

CTA：

- Enter Demo
- Open Workspace

允许：

- EchoText
- Prism
- Halftone

Landing 不得拖慢 `/app` 性能。

---

# 34. Demo Workspace

Portfolio 必须准备 Demo Workspace。

建议包含：

```text
5–10 Signals
6–12 Contents
3 Platforms
10+ Publications
24h / 72h Metrics
2–3 Tests
3+ Learnings
```

全部标记：

```text
DEMO
```

数据需要内部逻辑自洽。

不得生成：

- “播放100万”
- “增长900%”

之类纯炫耀式无依据数据。

---

# 35. Live Workspace / Real Dogfooding

V1 最终必须拥有真实使用路径。

建议：

- 至少 12 条真实 Content
- 尽量持续 14–21 天
- 至少一个主平台
- 每条主要内容 24h
- 重要内容 72h
- ≥3 Tests
- ≥3 Learnings
- ≥1 Learning Apply

如果没有真实数据：

作品集只能声称：

> Product prototype / system demo

不能声称：

> validated operations system

---

# 36. Testing Strategy

不要一开始构建庞大测试体系。

V1 至少需要：

## Unit

重点：

- Metric formula
- Median baseline
- Safe divide
- State gate
- Field mapping
- Learning matching

## Integration

重点：

- Create Signal → Content
- Brief approval
- Platform Version
- Publication creation
- Metric import
- Test / Learning

## E2E

必须至少有：

```text
Signal
→ Studio
→ Publish
→ Analytics
→ Test
→ Learning
```

---

# 37. 必测边界 Case

## Metrics

- views = 0
- views = null
- likes missing
- 只有 1 个 comparable post
- 没有 Pillar baseline

## CSV

- 中文列名
- 英文列名
- 重复列
- 空列
- 未知字段
- 错误数字格式

## Studio

- Brief 未 Approve
- AI Rewrite rejected
- Source 被删除但引用仍存在
- Auto save interrupted

## Publication

- URL missing
- Published time missing
- 同 PlatformVersion 重复发布

## Test

- 无足够 comparison
- Primary metric missing
- No Clear Result

---

# 38. Error Handling

所有关键操作必须具备：

```text
Loading
Success
Recoverable Error
```

例如：

## AI Analyze Failure

显示：

> Analysis failed.

提供：

- Retry

不能删除 Signal。

## Import Failure

显示失败行或 Mapping 问题。

不能清空整次 Import。

## Auto Save Failure

显示：

> Changes not saved.

提供：

- Retry Save

---

# 39. Performance Budget

V1 是桌面工作台。

重点：

- 首屏快速
- Studio 输入不卡
- Pipeline Drag 流畅
- Charts 不阻塞
- React Bits 延迟加载

React Bits：

- Prism lazy load
- Halftone only visible cards
- EchoText 不大规模 mount

Landing effects 不应进入工作区公共 bundle。

---

# 40. Accessibility Acceptance

至少：

- Keyboard focus visible
- 所有按钮有 aria label 或文字
- Drag 有 menu fallback
- Mint 不作为唯一状态表达
- Charts 有数值文本
- Modal 可 Escape
- Drawer focus management 正常

---

# 41. Responsive Acceptance

## ≥1280

完整体验。

## 1024–1279

- Sidebar collapsed
- Studio AI panel 可收起
- Radar review 可 Drawer
- Analytics 右侧 panel 可折叠

## Mobile

至少：

- Home readable
- Analytics readable
- Pipeline basic read

Studio 可以明确提示：

> Desktop recommended for editing.

不要为了手机破坏桌面 Studio。

---

# 42. Coding Agent 工作方式

推荐每个开发任务都使用以下结构。

## Step 1 — Read

先读：

```text
PRD relevant section
data-model relevant entity
design relevant page
implementation-plan current milestone
```

## Step 2 — Plan

Coding Agent 先输出：

```text
Files to change
Data involved
UI involved
Acceptance criteria
```

不要直接一次改几十个文件。

## Step 3 — Implement

只实现当前 Task。

## Step 4 — Verify

至少运行：

```text
lint
typecheck
build
relevant tests
```

## Step 5 — Report

输出：

```text
Completed
Not completed
Known limitations
Next task
```

---

# 43. 单任务规模限制

建议一次 Coding Agent Task：

```text
1 个页面能力
或
1 条数据链
```

避免：

> “请一次完成 Radar + Studio + Analytics + 整套数据库。”

这种 Prompt 会显著增加上下文压缩和偏航风险。

推荐：

```text
Task 01
Implement Signal creation + persistence.

Task 02
Implement Radar list + status.

Task 03
Implement Create Content from Signal.
```

---

# 44. Context Management

开发过程中不要等 Agent 上下文满了再自动压缩。

建议每完成一个 Milestone：

生成：

```text
docs/progress/M0-summary.md
docs/progress/M1-summary.md
...
```

内容仅包括：

- 已完成
- 关键架构决定
- 未完成
- Known Issues
- Next Step
- 不得修改的约束

新会话：

只加载：

```text
4份核心规格
+
最近一个 milestone summary
```

而不是把整个聊天历史全部塞进去。

---

# 45. Git Strategy

推荐简单：

```text
main
dev
feature/*
```

如果单人开发，也可以：

```text
main
feature/*
```

至少每个 Milestone 一个稳定 Tag：

```text
v0.1-foundation
v0.2-core-loop
v0.3-analytics
v0.4-learning-loop
v1.0
```

---

# 46. Commit Strategy

不要：

```text
update
fix stuff
changes
```

推荐：

```text
feat(radar): add signal creation flow
feat(studio): add brief approval
feat(analytics): calculate median baseline
fix(import): preserve unmapped columns
refactor(metrics): separate raw and derived metrics
```

---

# 47. 禁止 Agent 自行做的“优化”

Coding Agent 常见偏航：

## 47.1 自动加入 Authentication

如果当前本地 / 单用户版本不需要登录：

不要主动加入 Auth。

## 47.2 自动加入 Organization / Tenant

禁止。

## 47.3 自动加入 Notifications

禁止。

## 47.4 自动加入 AI Model Selector

禁止。

## 47.5 自动加入 Rich Text Framework

如果普通模块编辑已满足需求：

不要为了“专业”替换成复杂编辑器。

## 47.6 自动重构整个项目

如果当前 Task 只影响一个模块：

禁止全局重构。

## 47.7 自动重做视觉

不得因为 shadcn / component library 默认样式而覆盖 design.md。

---

# 48. 每阶段 Feature Freeze

## M0 Freeze

完成后冻结：

- Tech stack
- Database approach
- Design token naming

## M1 Freeze

完成后冻结：

- Signal → Content
- Studio structure
- Pipeline 5 states
- Publication concept

## M2 Freeze

完成后冻结：

- Metric definition
- Snapshot model
- Baseline
- Diagnosis schema

## M3 Freeze

完成后冻结：

- Test
- Learning
- LearningApplication

M4 只能做：

- UI
- UX
- bug fix
- small enhancement

不得重新改变核心模型。

---

# 49. Milestone Review Checklist

每个 Milestone 结束必须回答：

## Product

- 是否符合 PRD？
- 有没有偷偷多做功能？

## Data

- Entity 是否符合 data-model？
- 是否产生重复概念？

## Design

- 是否符合 design.md？
- 是否出现视觉漂移？

## Real Use

- 当前成果能不能实际使用？

## Technical

- Build 是否通过？
- 是否有 blocker？
- 是否有必须还债的技术问题？

---

# 50. 最终 E2E 验收脚本

V1 发布前，人工完整执行：

### Step 1

新增一个真实 Signal。

### Step 2

Analyze。

### Step 3

选择 Angle。

### Step 4

Create Content。

### Step 5

生成并修改 Brief。

### Step 6

Approve Brief。

### Step 7

完成 Content Master。

### Step 8

生成 Xiaohongshu Version。

### Step 9

绑定至少一个 Source。

### Step 10

执行 AI Rewrite。

### Step 11

Reject 一次 AI 修改。

### Step 12

Accept 一次 AI 修改。

### Step 13

完成 Review Checklist。

### Step 14

进入 Pipeline。

### Step 15

Scheduled。

### Step 16

人工真实发布。

### Step 17

Mark as Published。

### Step 18

24h Quick Update。

### Step 19

72h CSV / Excel Import 或 Quick Update。

### Step 20

查看 Derived Metrics。

### Step 21

查看 Account Baseline。

### Step 22

查看 Pillar Baseline。

### Step 23

生成 Diagnosis。

### Step 24

确认 Evidence 与真实数据一致。

### Step 25

Create Test。

### Step 26

Conclude Test。

### Step 27

Save Learning。

### Step 28

创建下一条同平台、同 Pillar Content。

### Step 29

确认 Relevant Learning 出现。

### Step 30

Apply Learning。

只有全部通过：

> ContentLoop V1 才能标记为 Complete。

---

# 51. V1 发布定义

不得仅因为：

```text
所有页面都有 UI
```

就发布 V1。

必须同时满足：

## Functional

核心 E2E 通过。

## Data

真实数据可录入。

## AI

Diagnosis 有 Evidence。

## Human Control

AI 不能绕过确认。

## Loop

Learning 可以回到 Studio。

## UX

Loading / Empty / Error 基本完整。

## Design

没有明显视觉漂移。

---

# 52. 作品集验收

Portfolio 展示建议准备 3 条故事。

## Story 1 — Discover

从一个 Signal：

```text
Radar
→ Analyze
→ Competitor Gap
→ Angle
```

## Story 2 — Create

```text
Brief
→ Content Master
→ Platform Version
→ AI Diff
→ Review
```

## Story 3 — Learn

```text
Publication
→ 24h / 72h
→ Baseline
→ Diagnosis
→ Test
→ Learning
→ Next Content
```

其中 Story 3 是最重要的一条。

---

# 53. 推荐面试演示时长

不要进行 20 分钟功能巡礼。

建议：

```text
1 min  产品问题
3 min  一条真实案例完整 Loop
1 min  Analytics & Learning
1 min  技术/AI设计
```

总计：

> 5–7 分钟

核心展示：

> **为什么这么判断，而不是“我做了多少页面”。**

---

# 54. 3–4 周开发成功标准

开发完成后应该能真实说：

> 我先搭建了一个能跑通的 MVP，并开始用自己的内容进行 Dogfooding。之后根据实际发布、录入数据和复盘时遇到的问题继续迭代 Analytics、Test 和 Learning，而不是一次性做完一个静态 Demo。

如果无法做到这句话中的：

> “真实发布、真实数据、真实迭代”

那么 ContentLoop 的目标只完成了一半。

---

# 55. 最终开发原则

> **Build the loop before the polish.**

> **Use real data before adding more AI.**

> **Keep objects separate, keep workflows simple.**

> **Let AI explain and prepare; let humans decide.**

> **Every feature must serve a real content operation step.**

> **A working 3–5 person tool is more valuable than a fake enterprise platform.**

---

**End of Implementation Plan — ContentLoop V1**
