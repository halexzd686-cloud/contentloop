# ContentLoop V1 — 产品需求文档（PRD）

> **产品定位**：面向 3–5 人小型内容团队的 AI 内容运营工作台  
> **核心主张**：从选题到发布，从数据到下一次内容决策。  
> **版本范围**：V1（3–4 周完整版本）  
> **状态**：功能范围冻结（Feature Freeze）  
> **文档角色**：业务真相源（Source of Truth for Product Scope）

---

## 0. 文档使用规则

本 PRD 用于约束 Codex、Kimi Code、Claude Code 等 Coding Agent 的产品实现。

### 0.1 优先级规则

若实现过程中出现冲突：

1. **业务范围与交互逻辑**：以本 `PRD.md` 为准。
2. **数据结构与实体关系**：以后续 `data-model.md` 为准。
3. **视觉、组件、动效**：以后续 `design.md` 为准。
4. **开发顺序与阶段验收**：以后续 `implementation-plan.md` 为准。

### 0.2 禁止 Coding Agent 自行扩展

Coding Agent 不得因为“常见 SaaS 一般都有”而自行增加功能。

尤其不得未经明确需求加入：

- 多 Workspace / 多租户
- 企业级权限系统
- 自动平台发布
- 平台 API 自动抓数
- 自动竞品爬虫
- 独立 Experiment Lab
- 独立 Knowledge Library
- 全局超级 Agent
- 多模型路由控制台
- Prompt Editor
- Dark Mode
- 移动端完整编辑器
- 视频生成 / 视频剪辑
- 内置全功能图片生成器
- 复杂统计显著性系统

如果某功能不在本 PRD 中，应默认视为 **Out of Scope**。

---

# 1. 产品概述

## 1.1 产品名称

**ContentLoop**

## 1.2 产品定位

ContentLoop 是一个面向 **3–5 人内容团队** 的 AI 内容运营工作台。

它不试图成为：

- 企业 CMS
- 项目管理软件
- 舆情监控平台
- AI Chatbot
- BI 平台
- 自动发布机器人

它只围绕一个闭环：

**Signal → Content → Publish → Metrics → Diagnosis → Test → Learning → Next Content**

## 1.3 核心问题

小型内容团队的日常工作往往分散在：

- 浏览器收藏夹
- 群聊
- 飞书 / Notion
- Excel
- ChatGPT / Claude
- 各平台后台
- 手工复盘文档

因此常见问题包括：

1. 选题来源分散，不知道什么值得做。
2. AI 可以生成文案，但缺乏可复用的编辑流程。
3. 多平台版本重复劳动。
4. 内容进度和发布日期缺乏统一视图。
5. 发布后只看绝对数据，不知道“好在哪里 / 差在哪里”。
6. 复盘经验没有进入下一次内容生产。
7. AI 建议常脱离账号自身历史数据和团队规则。

ContentLoop 的目标就是将这些环节连接起来。

---

# 2. 目标用户

## 2.1 Primary User

3–5 人的小型内容团队，典型角色包括：

- Content Operator / 内容运营
- Content Lead / 内容负责人
- Video Editor / 视频剪辑
- Reviewer / 审核人
- Founder / IP 主理人

## 2.2 使用规模假设

V1 假设：

- 仅一个 Brand
- 团队规模 1–5 人
- 重点平台 3 个：小红书、Bilibili、抖音
- 每周内容量处于小团队可手动维护范围
- 不需要复杂权限系统
- 不需要自动发布和平台 OAuth 集成

---

# 3. 产品目标

## 3.1 Product Goals

V1 必须帮助团队完成：

1. 快速收集并判断选题。
2. 从选题生成结构化内容 Brief。
3. 在统一 Content Master 上完成内容生产。
4. 生成并维护三平台适配版本。
5. 用轻量流程完成 Review 与发布排期。
6. 将真实 Publication 与真实运营数据绑定。
7. 导入 24h / 72h 数据。
8. 自动计算派生指标。
9. 使用账号历史 Baseline 解释表现。
10. 给出结构化 AI Diagnosis。
11. 将分析结论转化为轻量 Test。
12. 将 Test 结果保存为 Learning。
13. 在后续 Studio 中自动推荐 Relevant Learnings。

## 3.2 Non-Goals

V1 不追求：

- 全自动内容运营
- 无人审核
- 全平台覆盖
- 企业级协作
- 严格实验统计学平台
- 自动内容采集系统
- 自动 API 数据同步
- 复杂内容资产管理
- 多品牌 SaaS 商业化能力

---

# 4. 产品信息架构

V1 一级导航固定为 6 个入口：

1. **Home**
2. **Radar**
3. **Studio**
4. **Pipeline**
5. **Analytics**
6. **Settings**

不得增加新的一级导航，除非后续明确修改 PRD。

---

# 5. 核心业务闭环

```text
HOME
↓
RADAR
Signal → Analyze → Decide
↓
STUDIO
Brief → Master → Platform Versions → Review
↓
PIPELINE
制作中 → 待审核 → 待发布 → 已发布
↓
PUBLICATION
真实平台内容记录
↓
ANALYTICS
24h / 72h → Metrics → Baseline → Diagnosis
↓
TEST
Hypothesis → Change → Compare → Outcome
↓
LEARNING
Save Learning
↓
STUDIO
Relevant Learning → Apply
```

---

# 6. Home

## 6.1 页面目的

回答三个问题：

1. 今天最该处理什么？
2. 最近运营表现怎么样？
3. 有没有值得注意的新变化？

Home 不是深度数据页，也不是新闻 Feed。

## 6.2 页面结构

### A. Header

显示：

- 日期
- 轻量欢迎语
- 今日需要处理的事项数量
- `+ New`
- `Ask Loop`

### B. Today

显示：

- 1 个 Priority Item
- 次级待办统计：待审核、待发布、待复盘

Priority Item 允许展示：

- 内容标题
- 当前状态
- 截止 / 发布时间
- 阻塞问题
- 直接操作入口

### C. Loop Insight

仅展示：

- 1 条核心 AI Insight
- 最多 2 条简短信号
- Evidence
- 进入 Analytics 的入口

不得在 Home 展示长篇 AI 报告。

### D. Performance

展示用户 Pin 的 4 个关键指标。

默认候选：

- Views
- Like Rate
- Save Rate
- Follow Rate

同时显示轻量趋势。

### E. Content Flow

展示 5 个 Pipeline 大阶段数量：

- 待策划
- 制作中
- 待审核
- 待发布
- 已发布

并展示最近 3 条活跃 Content。

### F. Signals

只展示最多 2–3 条值得关注的 Signal。

---

# 7. Radar

## 7.1 页面目的

回答：

> **现在有哪些东西值得做成内容？**

## 7.2 布局

Desktop 使用：

- 左侧约 65%：Signals Feed
- 右侧约 35%：Quick Review

## 7.3 Signal 来源

V1 支持：

### A. Paste URL

用户粘贴公开链接，系统尝试提取：

- Title
- Source
- Summary
- Published Time
- Source Type

### B. Quick Idea

用户直接输入灵感。

V1 不做自动全网抓取。

## 7.4 Signal Card

显示：

- 来源类型
- 标题
- 时间
- 一句话摘要
- Match / Topic Score
- 状态

状态：

- New
- Reviewing
- Selected
- Skipped

## 7.5 Analyze Signal

固定输出：

- **Why It Matters**
- **Audience Match**
- **Content Risk**
- **Possible Angles**（最多 3 个）

## 7.6 Topic Score

采用 3 维轻量评分：

- Audience Fit
- Timing
- Content Potential

并形成总分。

要求：

- Score 必须附简短依据。
- 缺乏证据时必须允许显示 `Evidence Insufficient`。
- Score 是排序辅助，不是自动决策。

## 7.7 Competitor Breakdown

用户可手动粘贴 1–5 条竞品内容。

系统整理：

- Title
- Angle
- Hook
- Structure
- What Works
- What To Avoid

最终生成：

- **Content Gap**
- **Suggested Angle**

不得自动制造样本百分比，不得将少量样本包装为统计结论。

## 7.8 Skip

点击 Skip 时要求选择一个原因：

- Too Late
- Saturated
- Low Audience Fit
- Insufficient Information
- High Production Cost
- No Clear Angle
- Other

## 7.9 Create Content

Selected Signal 进入 Studio 前确认：

- Primary Platform
- Selected Angle
- Owner

然后进入 `Create Brief`。

---

# 8. Studio

## 8.1 页面目的

Studio 是 ContentLoop 功能最深的页面。

目标：

> 将选题转化为可审核、可多平台发布的真实内容。

Studio 不应被设计为单纯 AI Chat 页面。

## 8.2 总体布局

三栏：

- Sources：约 22%
- Content Workspace：约 53%
- Loop AI：约 25%

## 8.3 Sources

分组：

- Official
- Community
- Competitors
- Notes

每条 Source 至少包括：

- Title
- Source Type
- URL / Reference
- Verification Status
- Summary

## 8.4 Source-linked Writing

只要求**关键事实**绑定来源。

适用于：

- 数字
- 官方能力声明
- 产品规格
- 发布时间
- 公开事实

不要求普通观点和修辞全部绑定。

事实引用可显示 `[S1]`、`[S2]` 等。

## 8.5 Studio Tabs

固定为：

1. Brief
2. Master
3. Platforms
4. Review

## 8.6 Brief

字段固定为：

- Target Audience
- User Problem
- Core Question
- Main Angle
- Content Promise
- Key Evidence
- Differentiation
- CTA

流程：

1. Radar 信息带入
2. AI 生成 Draft Brief
3. 用户编辑
4. 用户点击 `Approve Brief`
5. 才进入完整 Content Master 生产

## 8.7 Content Master

采用模块化编辑，不是一整张富文本白纸。

默认模块：

- Hook
- Core Message
- Section
- Section
- Demo / Example
- Evidence
- Conclusion
- CTA

模块支持：

- Reorder / Drag
- Rewrite
- Shorten
- Expand
- Ask Loop

## 8.8 Platform Versions

V1 正式支持：

- Xiaohongshu
- Bilibili
- Douyin

一个 Content 可拥有多个 Platform Version。

### Xiaohongshu

- Cover Copy
- Title
- Opening
- Body
- CTA
- Tags

### Bilibili

- Title
- Cover Copy
- Opening Hook
- Script
- Chapters
- Description

### Douyin

- Hook
- Script
- Beat / Rhythm
- CTA

所有平台版本基于 Content Master 适配，而不是从零重新生成。

## 8.9 Platform Playbook

Studio 可查看当前平台 Playbook：

- Voice
- Title Style
- Hook Style
- Structure
- CTA
- Avoid
- Good Examples

生成与改写必须读取该 Playbook。

## 8.10 AI Diff Review

AI 修改已有内容时，不得静默覆盖。

必须：

1. 展示 OLD
2. 展示 NEW
3. 用户 Accept / Reject

AI 新建 Draft 可以直接生成，但进入正式内容前仍由用户确认。

## 8.11 Loop AI

Studio 右栏采用：

### Quick Actions

例如：

- Improve Hook
- Verify Facts
- Tighten Structure
- Adapt Tone
- Find Weak Claim

### Ask Loop

自由输入。

Loop AI 默认只理解：

- 当前 Content
- 当前 Tab
- 当前 Sources
- 当前 Platform Playbook

V1 不要求跨全 Brand 深度检索。

## 8.12 Content QA

采用问题清单，不做假精确评分。

至少检查：

- Facts
- Platform Fit
- Promise Match
- Risk

最终状态：

- Ready
- Needs Review

## 8.13 Visual Brief

字段：

- Cover Copy
- Main Subject
- Composition
- Background
- Visual Accent
- Image Prompt

V1 不内置图片生成。

## 8.14 Human Review

Review Checklist：

- 事实已确认
- 标题 / 封面与正文一致
- 平台表达符合要求
- 无明显风险内容
- 最终版本已人工查看

之后：

`Approve for Publishing`

Owner 和 Reviewer 允许为同一人。

## 8.15 Auto Save

Studio 必须自动保存，并显示：

> Saved X sec ago

## 8.16 Lightweight Version History

仅记录关键版本：

- Draft
- AI Rewrite
- Human Final

允许恢复上一版本。

---

# 9. Pipeline + Calendar

## 9.1 页面目的

回答：

- 有哪些内容？
- 谁在做？
- 做到哪了？
- 什么时候发布？

## 9.2 默认视图

默认：**Pipeline**

顶部可切换：

- Pipeline
- Calendar

## 9.3 Pipeline 状态

固定 5 个：

1. 待策划
2. 制作中
3. 待审核
4. 待发布
5. 已发布

Studio 内的 Brief、Master 等细状态不得扩展为 Pipeline 一级状态。

## 9.4 Content Card

显示：

- Title
- Platforms
- Owner
- Scheduled Time / Deadline
- 当前大状态
- Risk / Blocker（仅有问题时）

## 9.5 多平台 Content

一个 Content 在 Pipeline 中只显示 **一张主卡**。

各 Platform Version 显示为子状态。

不得为每个平台复制一张顶层 Kanban 卡。

## 9.6 Drag & Drop

普通阶段允许拖动。

关键 Gate：

### 待审核 → 待发布
必须完成 Review Checklist。

### 待发布 → 已发布
必须创建 Publication Record。

## 9.7 Content Drawer

点击 Kanban Card 后先打开 Drawer。

显示：

- Title
- Platforms
- Owner
- Reviewer
- Status
- Schedule
- Current Issues
- Publication
- Recent Metrics（若存在）

入口：

- Open in Studio
- Review
- View Analytics

## 9.8 Calendar

只做：

- Week View
- Month View

支持拖动未发布 Content 修改 Scheduled Date。

Published 内容不可拖动更改历史发布时间。

## 9.9 Breaking

仅保留：

`Priority: Breaking`

作用：

- 卡片标识
- 排序优先
- Calendar 冲突提示

## 9.10 Overdue

若 Deadline 已过且 Content 未 Published：

显示：

`OVERDUE · Xh / Xd`

同时进入 Home Today。

## 9.11 Team Fields

每条 Content 只维护：

- Owner
- Reviewer

## 9.12 Published History

已发布列默认只展示最近 14 / 30 天。

更早内容通过 Archive / Analytics 查询。

---

# 10. Publication

## 10.1 定义

Publication 是一个 Platform Version 真正发布到平台后的记录。

## 10.2 Mark as Published

必须填写：

- Platform
- Final Title
- Published At
- URL
- Cover（可选）
- Notes（可选）

完成后才视为 Published。

## 10.3 多平台规则

一个 Content 可拥有多个 Publication。

主 Content 只有当所有启用的目标平台均完成发布时，才进入整体 `已发布` 状态。

## 10.4 Review Checkpoints

Publication 创建后自动建立：

- 24h
- 72h

两个数据复盘节点。

V1 不提供自由配置 Checkpoint。

---

# 11. Analytics

## 11.1 页面目的

回答：

> **这条内容表现怎么样？为什么？下一条应该改什么？**

Analytics 是 V1 的核心价值模块之一。

## 11.2 Analytics 首页

顶部：

### Account Summary

时间范围：

- 7 Days
- 30 Days

只展示轻量整体数据。

下面：

### Content Performance

内容列表是主要工作区域。

## 11.3 Content Performance List

单条显示：

- Title
- Platform
- Published Time
- Content Type / Pillar
- Views
- Like Rate
- Save Rate
- 24h / 72h Data Status
- Performance Indicator

Indicator：

- Above Baseline
- Normal
- Needs Attention

## 11.4 分析维度

顶部切换：

- Overview
- Platform
- Content Type

## 11.5 数据录入

支持两种方式：

### Quick Update

手动录入单条 Publication 数据。

### Import CSV / Excel

批量导入平台后台数据。

V1 不接平台 API。

## 11.6 Field Mapping

CSV / Excel 导入必须提供：

**自动匹配 + 人工确认**

例如：

- 笔记阅读数 → Views
- 点赞数 → Likes
- 收藏数 → Saves
- 新增关注 → Followers Gained

无法判断时标记：

`Needs Mapping`

## 11.7 Metrics

典型原始指标：

- Impressions
- Views / Reads
- Likes
- Saves
- Comments
- Followers Gained

派生指标示例：

- Like Rate
- Save Rate
- Comment Rate
- Follow Rate
- View Rate / CTR（仅平台提供所需字段时）

## 11.8 Metric Definition

指标旁提供 `ⓘ`。

展示：

- Formula
- Meaning
- Caution

团队可在 Settings 中设置 Alias / Formula。

系统不得依赖模糊术语猜测公式。

## 11.9 Baseline

V1 只做两层：

### Account Baseline
最近 N 条同平台可比内容。

### Content Type Baseline
同类 Content Pillar / Content Type 的可比内容。

默认：

- Last 20 comparable posts
- Median

不默认使用 Mean。

## 11.10 24h / 72h Snapshot

内容详情页提供：

- 24H
- 72H

同时显示：

- 当前数据
- 相较 Baseline
- 24h → 72h 变化

不做完整 1h / 6h / 7d 时间序列。

## 11.11 Funnel

统一概念：

**Reach → Consume → Engage → Convert**

但底层必须使用平台真实可获得指标。

缺少数据：

`N/A`

不得猜测。

## 11.12 Loop Analysis

详情页右侧显示结构化 AI Diagnosis。

固定输出：

### What Happened
一句核心判断。

### Evidence
最多 3 条明确数据证据。

### Possible Reason
1–2 个可验证假设。

### Confidence
High / Medium / Low

### Next Actions
最多 3 个具体行动。

不得输出长篇自由报告。

## 11.13 Insufficient Evidence

系统必须允许明确输出：

`Not enough evidence`

典型原因：

- 数据样本过少
- 缺少关键指标
- 没有足够 Comparable Posts
- 仅有短期数据

同时告诉用户下一步补什么数据。

## 11.14 Top / Needs Attention

Analytics 首页显示：

- Top Content：最多 3 条
- Needs Attention：最多 3 条

---

# 12. Tests

## 12.1 产品位置

Tests 不作为一级导航。

位于：

**Analytics → Tests**

## 12.2 Create Test

从 Diagnosis 可直接点击：

`Create Test`

字段：

- Hypothesis
- Change
- Primary Metric
- Keep Consistent
- Compare With

## 12.3 Test 类型

V1 不强制将所有测试称为 A/B Test。

可以是：

- A/B
- Sequential
- Before / After
- Content Comparison

## 12.4 Outcome

固定：

- Win
- Trade-off
- No Clear Result
- Loss

## 12.5 判断原则

不得仅凭一个指标提升宣布 Win。

样本不足时应选择：

`No Clear Result`

---

# 13. Learning

## 13.1 定位

Learning 不是独立知识库。

它是：

> **一次真实复盘后，值得在未来内容中复用的运营经验。**

## 13.2 Save Learning

Test 结束后允许：

`Save Learning`

AI 可生成 Draft，但由用户编辑并确认。

保存：

- Learning Text
- Platform
- Content Type
- Evidence / Related Test
- Date

## 13.3 Relevant Learning

Studio 根据：

- Platform
- Content Type

自动推荐相关 Learning。

操作：

- Apply
- Dismiss

这一步构成 ContentLoop 的核心 Learning Loop。

---

# 14. Ask Loop

## 14.1 定位

Ask Loop 是轻量上下文 AI，不是全局超级 Agent。

## 14.2 可用范围

允许读取：

- 当前页面
- 当前选中 Content / Signal / Publication
- 当前页面需要的直接关联数据

V1 不要求：

- 跨整个 Brand 做 RAG
- 自动执行跨模块复杂任务
- 自主创建并修改大量对象

## 14.3 行为边界

原则：

**Suggest → Prepare → Human Confirm**

AI 不得：

- 自动 Approve
- 自动 Publish
- 自动 Delete
- 自动改变 Playbook
- 自动覆盖用户正式内容

---

# 15. Settings

Settings 只保留 4 个 Tab：

1. Brand
2. Team
3. Playbooks
4. Metrics

## 15.1 Brand

字段：

- Brand Name
- Logo
- Description
- Target Audience
- Content Pillars
- Platforms

V1 单 Brand。

## 15.2 Content Pillars

每个 Pillar：

- Name
- Description
- Primary Goal

不只是 Tag，但不做复杂战略对象。

## 15.3 Team

成员字段：

- Name
- Avatar
- Job Title / Role Label

不做系统权限。

Content 级别单独设置：

- Owner
- Reviewer

## 15.4 Playbooks

支持：

- Xiaohongshu
- Bilibili
- Douyin

结构固定：

- Voice
- Title Style
- Hook
- Structure
- CTA
- Avoid
- Good Examples

允许：

`Generate Playbook Draft`

但 AI 不得自动覆盖现有规则。

## 15.5 Learning → Playbook

如果某条 Learning 与当前平台相关，可以提示：

> 1 Learning may be relevant

用户可：

- Add as Rule
- Ignore

不做版本管理。

## 15.6 Metrics

平台指标配置：

- Name
- Alias
- Numerator
- Denominator
- Formula

允许编辑 Derived Metric Formula。

Baseline 设置只允许调整：

- Comparable Post Window

默认：Last 20。

统计方法 V1 默认 Median，不暴露高级统计设置。

## 15.7 不提供的 Settings

V1 不提供：

- Model Router UI
- Provider Selector
- Prompt Editor
- API 控制台
- 企业权限
- JSON Import / Export
- Dark Mode

---

# 16. Team Collaboration

ContentLoop V1 不是团队项目管理系统。

协作仅维护：

- Owner
- Reviewer

不做：

- 评论线程
- @Mention 系统
- 企业通知中心
- Permission Matrix
- 多级审批
- 实时多人协作编辑

---

# 17. AI 产品原则

## 17.1 Evidence First

AI 判断应尽量引用：

- Source
- Metric
- Baseline
- Competitor Reference
- Test
- Learning

## 17.2 Facts ≠ Inference

系统必须区分：

- Verified Fact
- Community Information
- Inference / Hypothesis

## 17.3 Insufficient Evidence Is Valid

没有足够证据时：

> 不给结论。

## 17.4 Human-in-the-loop

关键业务动作必须由人确认：

- Approve Brief
- Accept AI Rewrite
- Human Review
- Approve for Publishing
- Mark as Published
- Save Learning
- Add Learning as Playbook Rule

## 17.5 AI Should Prepare, Not Take Ownership

AI 的价值：

- 总结
- 比较
- 起草
- 重写
- 检查
- 诊断
- 提出测试假设

而不是取代运营负责人。

---

# 18. V1 平台范围

正式支持：

- Xiaohongshu / 小红书
- Bilibili / B站
- Douyin / 抖音

V1 不支持：

- TikTok
- YouTube
- LinkedIn
- X
- 微信视频号
- 其他海外平台

---

# 19. V1 必须打通的真实业务路径

```text
1. 创建 / 配置 Brand
2. Add Signal
3. Analyze Signal
4. Select Topic
5. Create Brief
6. Approve Brief
7. 创建 Content Master
8. 生成至少一个 Platform Version
9. Human Review
10. 进入 Pipeline
11. Scheduled
12. 人工在真实平台发布
13. Mark as Published + URL
14. 输入 / 导入 24h Metrics
15. 输入 / 导入 72h Metrics
16. 自动计算 Derived Metrics
17. 与 Baseline 对比
18. 生成 AI Diagnosis
19. Create Test
20. 完成 Test
21. Save Learning
22. 创建下一条同类型 Content
23. Studio 自动显示 Relevant Learning
24. Apply Learning
```

如果这条链路存在断点，则 V1 不算完成。

---

# 20. 功能优先级

## P0 — 核心必须完成

- 单 Brand
- Radar
- Studio
- Pipeline
- Publication
- Analytics
- CSV / Excel Field Mapping
- 24h / 72h
- Baseline
- Structured Diagnosis
- Tests
- Learning 回流
- Basic Home
- Settings
- Human Review
- Auto Save

## P1 — 完整 V1 应完成

- Calendar Week / Month
- Competitor Breakdown
- Source-linked Writing
- AI Diff
- Content QA
- Visual Brief
- Lightweight Version History
- Top / Needs Attention
- Lightweight Ask Loop
- Learning → Add as Playbook Rule
- High-quality Empty / Loading / Error States

## Explicitly Out of Scope

见本 PRD 0.2。

---

# 21. V1 产品验收

## 21.1 Functional Acceptance

必须能够完整完成第 19 节业务路径。

## 21.2 Dogfooding Acceptance

建议至少完成：

- 12–20 条真实 Content
- 至少一个真实主平台持续使用
- 每条主要 Publication 至少记录 24h 数据
- 重要 Publication 记录 72h 数据
- ≥ 3 个真实 Test
- ≥ 3 条真实 Learning
- ≥ 1 条 Learning 被应用到后续 Content

真实数据不得使用 Demo Data 冒充。

## 21.3 Demo Data

允许提供 Demo 数据用于作品集展示，但必须明确标记：

`DEMO DATA`

真实使用环境：

`LIVE`

Demo 和 Live 不得在 UI 中混淆。

---

# 22. 产品成功标准

ContentLoop V1 成功，不是因为：

- 页面很多
- AI 按钮很多
- 动效很多
- Agent 数量很多

而是因为用户可以真实回答：

1. 今天为什么做这个选题？
2. 这条内容是怎样形成的？
3. 团队谁负责、什么时候发布？
4. 真实数据表现怎么样？
5. 和自己的历史相比哪里异常？
6. AI 的判断依据是什么？
7. 下一条准备测试什么？
8. 这次复盘学到了什么？
9. 这个 Learning 是否真正影响了下一条内容？

如果这九个问题能够在 ContentLoop 内得到清楚答案，V1 就达到了产品目标。

---

# 23. 最终产品原则

> **Small Team First**  
> 只为 3–5 人团队解决真实问题，不提前做企业架构。

> **Business Before AI**  
> 用户看到的是运营动作，而不是 Agent 架构。

> **Data Before Opinion**  
> 先展示事实和 Baseline，再让 AI 解释。

> **Human Owns Decisions**  
> AI 可以建议，但关键状态由人确认。

> **One Real Loop Beats Ten Features**  
> 优先保证选题 → 发布 → 数据 → Learning → 下一条内容真正闭环。

> **Do Not Build for the Demo**  
> Demo 用来展示已经可用的产品，而不是反过来为了 Demo 堆功能。

---

**End of PRD — ContentLoop V1**
