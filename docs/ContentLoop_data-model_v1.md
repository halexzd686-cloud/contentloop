# ContentLoop V1 — Data Model

> **文档角色**：数据真相源（Source of Truth for Data Structure）  
> **适用版本**：V1（3–5 人小型内容团队）  
> **目标**：明确 Signal、Content、Platform Version、Publication、Metric Snapshot、Test、Learning 等核心对象的边界，防止开发过程中把不同业务概念混成同一个对象。

---

# 0. 设计原则

ContentLoop V1 的数据模型必须遵守以下原则。

## 0.1 小团队优先

V1 仅服务：

- 1 个 Brand
- 1–5 名 Team Member
- 3 个重点平台：
  - Xiaohongshu
  - Bilibili
  - Douyin

不为多租户、企业权限、复杂审批系统预留过度抽象。

## 0.2 业务对象必须分开

以下对象**绝不能合并**：

- Signal ≠ Content
- Content ≠ Platform Version
- Platform Version ≠ Publication
- Publication ≠ Metric Snapshot
- Test ≠ Learning
- Learning ≠ Playbook Rule

## 0.3 AI 输出不是事实源

AI 生成内容只能写入：

- Draft
- Suggestion
- Diagnosis
- Hypothesis

只有经过用户确认后，才进入正式业务数据。

## 0.4 原始数据与派生数据分开

例如：

原始：

- views = 10000
- likes = 420

派生：

- like_rate = 4.2%

数据库必须保留原始值。

派生指标可：

- 按需计算
- 或缓存

但不能只保存百分比而丢失原始数据。

## 0.5 不做假精确

当数据不足时，应允许：

- null
- N/A
- insufficient_evidence

不得用 `0` 代替“不存在 / 未提供”。

---

# 1. 核心实体总览

```text
Brand
│
├── TeamMember
├── ContentPillar
├── PlatformPlaybook
├── MetricDefinition
│
├── Signal
│    └── CompetitorReference
│
└── Content
     │
     ├── Source
     ├── ContentBrief
     ├── ContentMaster
     ├── ContentVersionHistory
     │
     └── PlatformVersion
          │
          └── Publication
               │
               ├── MetricSnapshot
               ├── Diagnosis
               │
               └── Test
                    │
                    └── Learning
```

---

# 2. 核心关系

## 2.1 Signal → Content

一个 Signal：

- 可以被 Skip
- 可以被 Selected
- 可以创建 0 或 1 个 Content

V1 默认：

```text
Signal 1 ── 0..1 Content
```

避免同一个 Signal 在 V1 中衍生出大量 Content，保持简单。

---

## 2.2 Content → PlatformVersion

一个 Content 是一个“母内容 / 内容主题”。

例如：

> Claude Agent 实测

可以拥有：

- Xiaohongshu Version
- Bilibili Version
- Douyin Version

关系：

```text
Content 1 ── N PlatformVersion
```

---

## 2.3 PlatformVersion → Publication

PlatformVersion 是编辑内容。

Publication 是真实发布记录。

例如：

```text
PlatformVersion
Xiaohongshu Draft
↓
Publication
真实发布 URL + 发布时间
```

关系：

```text
PlatformVersion 1 ── 0..1 Publication
```

V1 中同一个 PlatformVersion 默认只对应一次正式发布。

如果未来需要 Repost，再扩展。

---

## 2.4 Publication → MetricSnapshot

一条真实 Publication 可以有多个时间点数据。

V1 默认：

- 24h
- 72h

关系：

```text
Publication 1 ── N MetricSnapshot
```

---

## 2.5 Publication → Test

一个 Publication 可以：

- 参与 0 个 Test
- 参与多个 Test

一个 Test 可以比较多个 Publication。

因此实际关系为：

```text
Publication N ── N Test
```

通过中间表：

`test_publications`

---

## 2.6 Test → Learning

一个 Test：

- 可以不产生 Learning
- 通常最多产生一个主要 Learning

V1：

```text
Test 1 ── 0..1 Learning
```

---

## 2.7 Learning → Studio

Learning 不直接修改 Content。

Studio 根据：

- platform
- content_pillar

检索 Relevant Learnings。

用户点击 Apply 后，记录：

`learning_applied_to_content`

形成真实闭环。

---

# 3. Brand

## 3.1 定义

Brand 表示 ContentLoop 当前服务的内容品牌 / 账号团队。

V1 只有一个 Brand。

## 3.2 字段

```ts
type Brand = {
  id: string
  name: string
  logoUrl?: string
  description?: string

  targetAudience: string

  enabledPlatforms: Platform[]

  createdAt: datetime
  updatedAt: datetime
}
```

## 3.3 Platform Enum

```ts
type Platform =
  | "xiaohongshu"
  | "bilibili"
  | "douyin"
```

不得在 V1 增加其他平台。

---

# 4. TeamMember

## 4.1 定义

轻量团队成员。

不承担权限系统。

## 4.2 字段

```ts
type TeamMember = {
  id: string
  brandId: string

  name: string
  avatarUrl?: string
  title?: string

  isActive: boolean

  createdAt: datetime
  updatedAt: datetime
}
```

## 4.3 注意

不要设计：

- admin
- editor
- reviewer_permission
- granular_permissions

Owner / Reviewer 是 Content 层面的职责，不是系统权限。

---

# 5. ContentPillar

## 5.1 定义

内容方向，不只是 Tag。

示例：

- AI Agent Tutorial
- AI Tool Review
- Workflow

## 5.2 字段

```ts
type ContentPillar = {
  id: string
  brandId: string

  name: string
  description?: string
  primaryGoal?: string

  isActive: boolean

  createdAt: datetime
  updatedAt: datetime
}
```

---

# 6. Signal

## 6.1 定义

一个值得评估是否做成内容的信息 / 灵感。

来源可以是：

- URL
- Manual Idea

## 6.2 字段

```ts
type Signal = {
  id: string
  brandId: string

  inputType: "url" | "idea"

  sourceUrl?: string
  sourceType?: SignalSourceType

  title: string
  summary?: string
  publishedAt?: datetime

  status: SignalStatus

  audienceFitScore?: number
  timingScore?: number
  contentPotentialScore?: number
  topicScore?: number

  whyItMatters?: string
  audienceMatch?: string
  contentRisk?: string

  possibleAngles?: string[]

  skipReason?: SkipReason

  selectedAngle?: string
  primaryPlatform?: Platform
  ownerId?: string

  createdAt: datetime
  updatedAt: datetime
}
```

## 6.3 SignalSourceType

```ts
type SignalSourceType =
  | "official"
  | "community"
  | "competitor"
  | "news"
  | "idea"
  | "other"
```

## 6.4 SignalStatus

```ts
type SignalStatus =
  | "new"
  | "reviewing"
  | "selected"
  | "skipped"
```

## 6.5 SkipReason

```ts
type SkipReason =
  | "too_late"
  | "saturated"
  | "low_audience_fit"
  | "insufficient_information"
  | "high_production_cost"
  | "no_clear_angle"
  | "other"
```

## 6.6 Score 约束

所有 Score：

```text
0–100
```

但允许：

```text
null
```

若证据不足，不能强制产生数字。

---

# 7. CompetitorReference

## 7.1 定义

Radar 中手动添加的竞品参考内容。

## 7.2 字段

```ts
type CompetitorReference = {
  id: string
  signalId: string

  platform?: Platform
  url: string

  title?: string
  angle?: string
  hook?: string
  structure?: string

  whatWorks?: string
  whatToAvoid?: string

  createdAt: datetime
}
```

## 7.3 Signal 级汇总

Signal 可额外保存：

```ts
competitorGap?: string
suggestedAngle?: string
```

不要生成虚假的竞品市场百分比。

---

# 8. Content

## 8.1 定义

Content 是整个内容项目的母对象。

例如：

> Claude Agent 实测

它不是“小红书笔记”，也不是“B站视频”。

平台版本属于 `PlatformVersion`。

## 8.2 字段

```ts
type Content = {
  id: string
  brandId: string

  sourceSignalId?: string
  pillarId?: string

  title: string

  status: ContentStatus

  ownerId?: string
  reviewerId?: string

  priority: ContentPriority

  scheduledAt?: datetime
  deadlineAt?: datetime

  createdAt: datetime
  updatedAt: datetime
}
```

## 8.3 ContentStatus

固定 5 个大阶段：

```ts
type ContentStatus =
  | "planning"
  | "in_progress"
  | "review"
  | "scheduled"
  | "published"
```

UI 对应：

```text
planning     → 待策划
in_progress  → 制作中
review       → 待审核
scheduled    → 待发布
published    → 已发布
```

不要把 Brief / Draft / AI Review 等 Studio 内部状态扩展成 Pipeline 一级状态。

## 8.4 Priority

```ts
type ContentPriority =
  | "normal"
  | "breaking"
```

---

# 9. Source

## 9.1 定义

Studio 中支持内容生产的资料来源。

## 9.2 字段

```ts
type Source = {
  id: string
  contentId: string

  type: SourceType

  title: string
  url?: string

  summary?: string

  verificationStatus: VerificationStatus

  createdAt: datetime
  updatedAt: datetime
}
```

## 9.3 SourceType

```ts
type SourceType =
  | "official"
  | "community"
  | "competitor"
  | "note"
```

## 9.4 VerificationStatus

```ts
type VerificationStatus =
  | "verified"
  | "unverified"
  | "community"
  | "internal_note"
```

## 9.5 Source Citation

关键事实引用时使用：

```text
[S1]
[S2]
```

显示编号可由前端根据 Source 顺序生成。

数据库不需要把 `[S1]` 本身当稳定 ID。

---

# 10. ContentBrief

## 10.1 定义

正式内容生产前的运营策略 Brief。

一个 Content 对应一个当前 Brief。

## 10.2 字段

```ts
type ContentBrief = {
  id: string
  contentId: string

  targetAudience: string
  userProblem: string
  coreQuestion: string
  mainAngle: string
  contentPromise: string
  keyEvidence: string
  differentiation: string
  cta: string

  status: "draft" | "approved"

  approvedAt?: datetime
  approvedBy?: string

  createdAt: datetime
  updatedAt: datetime
}
```

---

# 11. ContentMaster

## 11.1 定义

跨平台共享的内容母版。

不是单篇长文章。

## 11.2 字段

```ts
type ContentMaster = {
  id: string
  contentId: string

  modules: ContentModule[]

  createdAt: datetime
  updatedAt: datetime
}
```

## 11.3 ContentModule

推荐使用 JSONB：

```ts
type ContentModule = {
  id: string

  type:
    | "hook"
    | "core_message"
    | "section"
    | "demo"
    | "evidence"
    | "conclusion"
    | "cta"

  title?: string
  content: string

  sourceIds?: string[]

  order: number
}
```

## 11.4 为什么模块使用 JSONB

因为：

- 模块需要 Drag 排序
- Section 数量可变
- 不值得为每种模块建立独立表

但 ContentMaster 本身必须仍然是正式实体。

---

# 12. PlatformVersion

## 12.1 定义

针对某个平台适配后的正式内容版本。

## 12.2 通用字段

```ts
type PlatformVersion = {
  id: string
  contentId: string

  platform: Platform

  status: PlatformVersionStatus

  data: PlatformContentData

  visualBrief?: VisualBrief

  createdAt: datetime
  updatedAt: datetime
}
```

## 12.3 PlatformVersionStatus

```ts
type PlatformVersionStatus =
  | "draft"
  | "review"
  | "approved"
  | "published"
```

注意：

这是 PlatformVersion 内部状态。

它不等于 Pipeline 的 ContentStatus。

---

# 13. PlatformContentData

使用平台特定 Schema。

## 13.1 Xiaohongshu

```ts
type XiaohongshuContent = {
  coverCopy?: string
  title: string
  opening?: string
  body: string
  cta?: string
  tags?: string[]
}
```

## 13.2 Bilibili

```ts
type BilibiliContent = {
  title: string
  coverCopy?: string
  openingHook?: string
  script: string
  chapters?: string[]
  description?: string
}
```

## 13.3 Douyin

```ts
type DouyinContent = {
  hook?: string
  script: string
  rhythmNotes?: string
  cta?: string
}
```

数据库实现建议：

```text
platform_versions.data JSONB
```

但 API 层必须进行平台 Schema Validation。

---

# 14. VisualBrief

## 14.1 定义

内容视觉生产说明，不等于图片资产。

## 14.2 字段

```ts
type VisualBrief = {
  coverCopy?: string
  mainSubject?: string
  composition?: string
  background?: string
  visualAccent?: string
  imagePrompt?: string
}
```

V1 不保存 AI 生图流程状态。

---

# 15. Review

## 15.1 定义

V1 不需要建立复杂 Approval Engine。

Review Checklist 可以直接作为 PlatformVersion 的关联对象。

## 15.2 字段

```ts
type ContentReview = {
  id: string
  platformVersionId: string

  factsConfirmed: boolean
  titleCoverMatch: boolean
  platformFitConfirmed: boolean
  riskChecked: boolean
  humanReviewed: boolean

  reviewerId?: string

  approvedAt?: datetime

  createdAt: datetime
  updatedAt: datetime
}
```

## 15.3 Gate

只有以下字段全部 `true`：

- factsConfirmed
- titleCoverMatch
- platformFitConfirmed
- riskChecked
- humanReviewed

PlatformVersion 才可进入：

`approved`

---

# 16. ContentVersionHistory

## 16.1 定义

轻量关键版本快照。

## 16.2 字段

```ts
type ContentVersionHistory = {
  id: string
  contentId: string

  targetType:
    | "brief"
    | "master"
    | "platform_version"

  targetId: string

  versionLabel:
    | "draft"
    | "ai_rewrite"
    | "human_final"

  snapshot: JSON

  createdBy?: string
  createdAt: datetime
}
```

不实现逐字符 Diff 存储。

AI Diff 可以在本次操作层实时计算。

---

# 17. Publication

## 17.1 定义

真实平台发布记录。

这是 ContentLoop 从“内容编辑工具”进入“运营系统”的关键对象。

## 17.2 字段

```ts
type Publication = {
  id: string
  platformVersionId: string
  contentId: string

  platform: Platform

  finalTitle: string
  publishedAt: datetime

  url: string

  coverUrl?: string
  notes?: string

  createdAt: datetime
  updatedAt: datetime
}
```

## 17.3 约束

V1：

```text
UNIQUE(platformVersionId)
```

即一个 PlatformVersion 只有一个正式 Publication。

---

# 18. MetricDefinition

## 18.1 定义

定义团队如何理解一个指标。

## 18.2 字段

```ts
type MetricDefinition = {
  id: string
  brandId: string

  platform: Platform

  key: string
  displayName: string
  alias?: string

  type: "raw" | "derived"

  numeratorKey?: string
  denominatorKey?: string

  formula?: string

  meaning?: string
  caution?: string

  isActive: boolean

  createdAt: datetime
  updatedAt: datetime
}
```

## 18.3 示例

```json
{
  "key": "save_rate",
  "displayName": "Save Rate",
  "alias": "收藏率",
  "type": "derived",
  "numeratorKey": "saves",
  "denominatorKey": "views",
  "formula": "saves / views * 100"
}
```

## 18.4 术语原则

如果团队使用：

> 播赞比

系统必须同时显示实际 Formula。

不得假设所有人对术语定义一致。

---

# 19. MetricSnapshot

## 19.1 定义

某条 Publication 在一个时间点的真实平台数据。

## 19.2 字段

```ts
type MetricSnapshot = {
  id: string
  publicationId: string

  checkpoint: MetricCheckpoint

  capturedAt: datetime

  metrics: Record<string, number | null>

  source: MetricSource

  createdAt: datetime
}
```

## 19.3 MetricCheckpoint

V1：

```ts
type MetricCheckpoint =
  | "24h"
  | "72h"
  | "manual"
```

## 19.4 MetricSource

```ts
type MetricSource =
  | "manual"
  | "csv"
  | "xlsx"
```

## 19.5 metrics JSON 示例

```json
{
  "impressions": 18400,
  "views": 6100,
  "likes": 220,
  "saves": 410,
  "comments": 36,
  "followers_gained": 42
}
```

缺失字段：

```json
{
  "impressions": null
}
```

而不是：

```json
{
  "impressions": 0
}
```

---

# 20. MetricImportJob

## 20.1 定义

CSV / Excel 导入任务。

用于保存 Field Mapping 状态。

## 20.2 字段

```ts
type MetricImportJob = {
  id: string
  brandId: string

  fileName: string
  fileType: "csv" | "xlsx"

  status:
    | "uploaded"
    | "mapping_required"
    | "ready"
    | "imported"
    | "failed"

  detectedColumns: string[]

  fieldMappings: FieldMapping[]

  importedRows?: number

  errorMessage?: string

  createdAt: datetime
  completedAt?: datetime
}
```

## 20.3 FieldMapping

```ts
type FieldMapping = {
  sourceField: string
  targetMetricKey?: string

  confidence?: number

  confirmedByHuman: boolean
}
```

AI / Rule 可以推荐 Mapping。

但只有确认后才执行导入。

---

# 21. Baseline

V1 不需要独立保存每个 Baseline 结果。

建议按需计算。

## 21.1 Account Baseline

过滤：

- 同 Platform
- 最近 N 条可比较 Publication

默认：

```text
N = 20
Statistic = Median
```

## 21.2 Content Type Baseline

过滤：

- 同 Platform
- 同 ContentPillar
- 最近 N 条可比较 Publication

## 21.3 可比条件

只有拥有目标 Metric 的 Publication 才进入计算。

不得把 `null` 当 0。

---

# 22. Diagnosis

## 22.1 定义

Analytics 针对某 Publication / Snapshot 产生的结构化 AI 诊断。

## 22.2 字段

```ts
type Diagnosis = {
  id: string
  publicationId: string
  metricSnapshotId?: string

  whatHappened: string

  evidence: DiagnosisEvidence[]

  possibleReasons: string[]

  confidence:
    | "high"
    | "medium"
    | "low"
    | "insufficient_evidence"

  nextActions: string[]

  createdAt: datetime
}
```

## 22.3 DiagnosisEvidence

```ts
type DiagnosisEvidence = {
  metricKey: string
  currentValue?: number
  baselineValue?: number
  comparisonText: string
}
```

## 22.4 限制

- Evidence 最多 3 条
- Possible Reasons 最多 2 条
- Next Actions 最多 3 条
- 不保存长篇自由文本报告

---

# 23. Test

## 23.1 定义

轻量运营验证。

位于 Analytics 内，不是独立产品模块。

## 23.2 字段

```ts
type Test = {
  id: string
  brandId: string

  title: string

  hypothesis: string
  change: string

  primaryMetricKey: string

  keepConsistent?: string
  compareWith?: string

  method: TestMethod

  status:
    | "running"
    | "concluded"

  outcome?: TestOutcome

  conclusion?: string

  createdAt: datetime
  concludedAt?: datetime
}
```

## 23.3 TestMethod

```ts
type TestMethod =
  | "ab"
  | "sequential"
  | "before_after"
  | "content_comparison"
```

## 23.4 TestOutcome

```ts
type TestOutcome =
  | "win"
  | "trade_off"
  | "no_clear_result"
  | "loss"
```

---

# 24. TestPublication

用于 Test 与 Publication 的 N:N 关系。

```ts
type TestPublication = {
  testId: string
  publicationId: string

  role:
    | "control"
    | "variant"
    | "comparison"

  createdAt: datetime
}
```

---

# 25. Learning

## 25.1 定义

经过真实数据 / Test 后，值得未来内容复用的运营经验。

## 25.2 字段

```ts
type Learning = {
  id: string
  brandId: string

  text: string

  platform?: Platform
  pillarId?: string

  sourceTestId?: string

  evidenceSummary?: string

  createdAt: datetime
  updatedAt: datetime
}
```

V1 不加入：

- version
- expiration
- confidence graph
- validation lifecycle

---

# 26. LearningApplication

## 26.1 定义

记录某条 Learning 是否真正影响后续 Content。

这是验证“Loop 是否成立”的关键数据。

## 26.2 字段

```ts
type LearningApplication = {
  id: string

  learningId: string
  contentId: string

  action:
    | "applied"
    | "dismissed"

  appliedAt: datetime
}
```

## 26.3 价值

有了这张表，可以真实证明：

> Learning #012 被应用到了 Content #026。

而不是只说系统“理论上会学习”。

---

# 27. PlatformPlaybook

## 27.1 定义

团队针对平台的内容运营规则。

## 27.2 字段

```ts
type PlatformPlaybook = {
  id: string
  brandId: string

  platform: Platform

  voice?: string
  titleStyle?: string
  hookStyle?: string
  structure?: string
  cta?: string
  avoid?: string[]

  goodExamples?: PlaybookExample[]

  createdAt: datetime
  updatedAt: datetime
}
```

## 27.3 PlaybookExample

```ts
type PlaybookExample = {
  title: string
  note?: string
  url?: string
}
```

## 27.4 V1 约束

每个平台：

```text
UNIQUE(brandId, platform)
```

不做 Playbook Version 表。

---

# 28. Learning → Playbook

V1 不需要建立复杂关联表。

当用户点击：

`Add as Rule`

系统可以：

1. 将 Learning 内容人工转写到对应 Playbook 字段。
2. 在 Audit Metadata 中记录：
   - sourceLearningId
   - updatedAt

如果实现成本较低，可在 Playbook 保存：

```ts
ruleSources?: {
  field: string
  learningId: string
}[]
```

但该字段不是 P0 必需。

---

# 29. Home 数据来源

Home 不需要自己的复杂业务表。

Home 是聚合视图。

## 29.1 Today

来自：

- Content.status
- Content.deadlineAt
- Content.scheduledAt
- ContentReview
- Publication 24h / 72h checkpoint 是否缺数据

## 29.2 Performance

来自：

- MetricSnapshot
- MetricDefinition
- 用户 Pin 的指标配置

## 29.3 Signals

来自：

- Signal
- status = new / reviewing

## 29.4 Loop Insight

来自：

- 最新 Diagnosis
- 明确异常
- 待处理 Test

---

# 30. Ask Loop Context

V1 不建立大型向量知识库。

建议 Context Resolver 只组装当前上下文。

## 30.1 Radar Context

```text
Signal
+ CompetitorReferences
+ Brand Audience
+ Content Pillars
```

## 30.2 Studio Context

```text
Content
+ Brief
+ Master
+ Current PlatformVersion
+ Sources
+ Current Playbook
+ Relevant Learnings
```

## 30.3 Analytics Context

```text
Publication
+ 24h / 72h Snapshot
+ Metric Definitions
+ Account Baseline
+ Pillar Baseline
+ Related Test
```

这足够支撑 V1 Ask Loop。

---

# 31. Recommended Database Tables

如果使用 PostgreSQL / Supabase，建议 V1 核心表如下：

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
content_version_history

publications
metric_snapshots
metric_import_jobs

diagnoses

tests
test_publications

learnings
learning_applications
```

共约 19 张表。

这已经是 V1 上限。

如果实现时发现某张表可以合理用 JSONB 简化，应优先简化，而不是继续拆表。

---

# 32. 推荐 JSONB 字段

适合 JSONB：

- `content_masters.modules`
- `platform_versions.data`
- `platform_versions.visual_brief`
- `metric_snapshots.metrics`
- `metric_import_jobs.detected_columns`
- `metric_import_jobs.field_mappings`
- `diagnoses.evidence`
- `diagnoses.possible_reasons`
- `diagnoses.next_actions`
- `platform_playbooks.good_examples`

不适合 JSONB：

- Content
- Publication
- Test
- Learning
- Signal
- TeamMember

这些是业务主实体，应有独立字段。

---

# 33. 推荐唯一约束

```text
brands:
V1 only one active brand

platform_playbooks:
UNIQUE (brand_id, platform)

platform_versions:
UNIQUE (content_id, platform)

publications:
UNIQUE (platform_version_id)

metric_snapshots:
UNIQUE (publication_id, checkpoint)
# manual checkpoint 若允许多次，需额外 captured_at 区分

learning_applications:
UNIQUE (learning_id, content_id)
```

---

# 34. 删除策略

V1 推荐：

## Soft Delete

用于：

- Content
- Signal
- Publication

如果实现成本低，可以加：

```text
deleted_at
```

## Hard Delete

可以用于：

- 未使用的 Source
- Draft Playbook Example
- Import Job 临时记录

但 V1 不需要复杂 Trash 页面。

---

# 35. 时间字段

统一存储 UTC：

```text
timestamp with time zone
```

前端按 Brand / 用户时区显示。

V1 若只有固定团队，可默认使用系统指定时区。

不要在数据库中存：

```text
“今天晚上”
“昨天”
```

只存绝对时间。

---

# 36. 关键业务规则

## Rule 1

Signal 被 `selected` 后可以创建 Content。

## Rule 2

Brief 未 approved 时，允许生成 Draft，但不得进入正式 Review。

## Rule 3

PlatformVersion Review Checklist 未通过时，不得进入 `approved`。

## Rule 4

没有 Publication Record，不得视为真实 Published。

## Rule 5

Publication 创建后才可录入 Metrics。

## Rule 6

Metric 缺失必须为 null，不得当 0。

## Rule 7

Diagnosis 必须基于真实 Snapshot + Baseline。

没有足够数据时：

```text
confidence = insufficient_evidence
```

## Rule 8

Test 不等于 Learning。

必须在用户确认 `Save Learning` 后才生成 Learning。

## Rule 9

Learning 不自动修改 Playbook。

必须用户确认：

`Add as Rule`

## Rule 10

Learning 只有被实际 Apply 到后续 Content，才算完成最小 Learning Loop。

---

# 37. E2E 示例

## 37.1 Radar

```text
Signal #S001
“Claude 发布新 Agent 功能”
↓
Selected
```

## 37.2 Studio

```text
Content #C001
“Claude Agent 实测”

Brief #B001
approved

ContentMaster #M001

PlatformVersions:
PV001 Xiaohongshu
PV002 Bilibili
```

## 37.3 Publication

```text
PV001
↓
Publication #P001

Platform: Xiaohongshu
URL: https://...
PublishedAt: 2026-09-03 19:30
```

## 37.4 Metrics

```text
MetricSnapshot #MS001
Checkpoint: 24h

views = 6100
likes = 220
saves = 410
comments = 36
followers_gained = 42
```

系统计算：

```text
like_rate
save_rate
comment_rate
follow_rate
```

## 37.5 Diagnosis

```text
Diagnosis #D001

What Happened:
内容价值表现强，但进入量弱。

Evidence:
Save Rate > Account Baseline
Views < Pillar Baseline

Confidence:
Medium
```

## 37.6 Test

```text
Test #T001

Hypothesis:
结果导向标题可能提高进入率。

Change:
Title

Primary Metric:
View Rate
```

## 37.7 Learning

Test 完成后：

```text
Learning #L001

“Agent Tutorial 使用结果导向标题时，
近期进入表现优于功能说明型标题。”
```

## 37.8 Next Content

```text
Content #C006

Platform:
Xiaohongshu

Pillar:
Agent Tutorial
```

Studio 自动匹配：

```text
Relevant Learning:
L001
```

用户点击：

```text
Apply
```

生成：

```text
LearningApplication
L001 → C006
```

至此：

```text
Content → Data → Test → Learning → Next Content
```

真正闭环。

---

# 38. 禁止的数据模型做法

Coding Agent 不得：

### 38.1 把所有内容放一张 contents 表

错误：

```text
contents:
signal
brief
xiaohongshu_copy
publication_url
views
likes
learning
...
```

这会导致对象边界完全消失。

### 38.2 Platform Version 与 Publication 合并

Draft 和真实发布是两个业务阶段。

必须分开。

### 38.3 Metrics 直接写进 Publication

错误：

```text
publication.views
publication.likes
```

因为需要：

- 24h
- 72h

多个 Snapshot。

### 38.4 将所有 AI 输出永久保存

AI 临时建议不是业务事实。

只保存具有后续价值的正式对象。

### 38.5 为未来 SaaS 提前加入 tenant / organization / permissions

V1 禁止。

---

# 39. V1 Data Model 核心最小集

如果开发周期受限，最不能删除的是：

```text
Brand
Signal
Content
ContentBrief
ContentMaster
PlatformVersion
Publication
MetricSnapshot
MetricDefinition
Diagnosis
Test
Learning
LearningApplication
```

其他对象可以适度实现得更轻。

只要这条关系完整：

```text
Signal
↓
Content
↓
PlatformVersion
↓
Publication
↓
MetricSnapshot
↓
Diagnosis
↓
Test
↓
Learning
↓
LearningApplication
↓
Next Content
```

ContentLoop 的核心数据模型就是成立的。

---

# 40. 最终设计原则

> **Signal 是“可能做什么”。**

> **Content 是“我们决定做什么”。**

> **Platform Version 是“在某个平台怎么表达”。**

> **Publication 是“真实发出去的是什么”。**

> **Metric Snapshot 是“发出去以后真实发生了什么”。**

> **Diagnosis 是“我们如何解释这些数据”。**

> **Test 是“我们准备如何验证判断”。**

> **Learning 是“这次实践留下了什么经验”。**

> **Learning Application 是“这条经验有没有真正影响下一次内容”。**

如果开发实现始终保持这 9 个概念边界清晰，ContentLoop 的业务逻辑就不会在后续迭代中失控。

---

**End of Data Model — ContentLoop V1**
