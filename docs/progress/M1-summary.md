# M1 Summary — Core Content Workflow（Frozen ✅）

> Status: M1.1 / M1.2A / M1.2B / M1.3 / M1.4 / M1.5 / M1.6 **全部 Frozen**（人工浏览器验收通过）。M1 正式 Freeze。下一步 M2 — Real Publication & Analytics。
>
> **M1 最终业务主链**：Signal → AI Analysis → Human Decision → Content → Approved Brief → Content Master → Platform Versions → Human Review → Scheduled。Publication 不属于 M1。

## Completed

### M1.6 — Review & Pipeline（Frozen，人工浏览器验收通过）

- Migration `0005`：`UNIQUE(content_reviews.platform_version_id)`（PlatformVersion 1→0..1 current ContentReview，无 Review History）
- ContentReview 挂在 PlatformVersion 上（data-model §15）；active versions = 已创建的版本，不要求 enabledPlatforms 全覆盖
- Review 五项 checklist human-only：optimistic local + 300ms debounce + SaveQueue 串行持久化；Select All / Clear All 单次 save；Approve 前 flush pending saves，失败阻断 approve
- Send to Review gate：in_progress + Brief approved + Master + ≥1 active draft version；事务内 versions→review + checklist reset/insert
- Approve for Publishing：aggregate gate（approved 或 review+全勾）→ versions review→approved + Content→scheduled；唯一 review→scheduled 路径；reviewer = reviewerId ?? ownerId（均须 active）
- Withdraw：review→in_progress，versions→draft，checklists reset（row 保留）
- Global upstream invalidation：Edit Brief / Master Return to Editing → Content→in_progress + 全部 versions→draft + 全部 reviews reset；用户内容数据全部保留
- Local platform invalidation：Return XHS to Draft → 仅 XHS draft+reset；Content scheduled→review；其他 approved 平台不变
- Server-side transition table：drag 仅 planning→in_progress（需 Brief approved）/ in_progress→review（完整 gate）/ review→in_progress（withdraw）；review→scheduled、scheduled→review、any→published 全部 409
- Pipeline：5 列 Kanban（@dnd-kit）+ Content Drawer；一 Content 一卡，平台为卡内子状态；Published 列仅真实 aggregate 进入（M1 恒为空）
- Workflow 状态架构（两轮 blocker 修复后）：page 级单一 authoritative aggregate；mutation 返回权威 WorkflowSnapshot → applyWorkflowSnapshot(rev) 无二次 GET、无需 F5；stale-response revision guard；pending feedback <100ms
- 性能（instrumentation 驱动）：json_agg 单查询聚合读 + set-based 批量写（消灭 per-platform 串行循环），sendToReview 14.7–22.5s → 5.5s（prod）
- 全程 0 Publication；人工浏览器验收全部通过（含两轮 blocker 复测）

### M1.5 — Platform Versions（Frozen，人工浏览器验收通过）

- 无 migration：`UNIQUE(content_id, platform)` 与 JSONB `data` M0 已就绪；`visual_brief` 未使用
- Canonical platform data：XHS `{title, coverCopy, opening, body, cta, tags[]}` / Bilibili `{title, coverCopy, openingHook, script, chapters[], description}` / Douyin `{hook, script, rhythmNotes, cta}`；持久化永远全 key，缺省 `""`/`[]`，非 markdown 整串
- 双入口显式创建：Create Empty Draft（零 AI）+ Adapt with AI；打开 tab / auto-save 绝不建行（PUT 不存在 → 404）
- Save schema 严格 `.strict()`：unknown key（如 covercopy typo）→ 400 拒绝，无静默 strip
- AI Adapt：复用 DeepSeek provider + max 2 请求；Master 为主源 + Brief + Signal + Brand + Playbook；proposal 不落库 → Human Apply（POST）/ Discard；Re-adapt → field-level OLD/NEW → Accept（PUT 仅目标平台）/ Reject；pending 暂停 auto-save 且 OLD 保留
- Status：M1.5 只开放 draft；review/approved/published 无入口，非 draft PUT/adapt → 409
- Gate：Master 不存在 → locked；Brief 回 draft → 所有已有版本保留可读但 locked（create/PUT/adapt 409），Re-approve 恢复
- Playbook = strategy context（有则注入，无则 prompt 明示不伪造）；永不是 Evidence
- Multi-platform isolation：(contentId, platform) 寻址，三平台互不影响、不改 Master
- Auto-save 复用 save-queue：文本 1.5s debounce、tags/chapters 结构变更立即 enqueue、切平台 flush、失败保留 + Retry
- PlatformVersion ≠ Publication：全程 0 Publication
- 真实 DeepSeek + Supabase smoke test 全通过；人工浏览器验收 A–E 全通过

### M1.4 — Content Master Core（Frozen，人工浏览器验收通过）

- Entry gate：Brief approved 才能 Create/编辑 Master；打开 Master tab 不建行，Create 是显式 Human Action
- 默认 8 模块骨架：hook, core_message, section×2, demo, evidence, conclusion, cta，content=""，服务端生成稳定 UUID id
- 模块规则（服务端 Zod superRefine 落实）：hook/core_message/conclusion/cta exactly 1 不可删；section 1..N；demo/evidence 0..N；未知 type 拒绝
- Order：服务端统一规范化 0..n-1，客户端 order 不权威；module id 稳定（edit/reorder 不重新生成），不用 array index
- Drag Reorder：@dnd-kit（core+sortable+utilities）真实拖拽 + ↑/↓ 按钮 a11y fallback；drag → saved → F5 顺序保持（人工验证）
- Auto-save：`lib/save-queue.ts` serialized writes + local revision guard；文本 1.5s debounce，结构性变更（add/delete/reorder）立即 enqueue；latest state wins，stale ack 不回滚本地，失败保留可 Retry
- Brief 回 draft（显式 Edit Brief）→ Existing Master 数据保留但 read-only（PUT 409），提示 re-approve；再 approve 自动恢复 editable；Content 保持 in_progress
- Master 不修改 Brief，不创建 PlatformVersion；M1.4 无 AI
- 人工浏览器验收全部通过：gate / 显式 Create / 骨架 / text auto-save / add/delete section / singleton 不可删 / drag reorder 持久化 / module id 稳定 / Brief edit → Master locked / re-approve → unlocked / 数据未删未重建
- 真实 Supabase smoke test 通过：gate 400 / 创建 201 / 重复 409 / order 规范化 / 非法结构 400 / locked 409 / 直接 SQL 重复插入被 23505 拦截

### M1.3 — Studio Brief Core（Frozen，人工浏览器验收通过）

- Studio routing：`/app/studio` Content 列表 + `/app/studio/[contentId]` 三栏工作区（Sources 22% 只读 Signal | Brief 53% | Loop AI 25%）
- Brief lifecycle：无 Brief 不建行；首次人工编辑或 Apply Draft 才 INSERT draft；之后 auto-save UPDATE
- Auto Save：1.5s debounce；Editing/Saving…/Saved/Failed+Retry；失败不清空本地输入；AI proposal pending 期间暂停
- AI Draft Brief：DeepSeek 真实调用 → Zod → proposal only（不落库）→ Human Apply / Discard
- Approve：事务内 8 字段非空校验 + approver 解析（reviewer ?? owner，均需 active，否则拒绝）→ Brief approved + Content planning→in_progress
- Approved Brief read-only（PUT 409）；显式 Edit Brief → draft + 清空 approvedAt/approvedBy，Content 保持 in_progress
- Radar selected Signal → Open Content 链接（`GET /api/signals` 返回 contentId）
- 人工浏览器验收全部通过：routing / empty brief / partial auto-save / refresh persistence / 快速输入 latest-write / incomplete approve 拒绝 / AI proposal / auto-save 暂停 / Discard 保留人工稿 / Apply 后才持久化 / approve 联动 / read-only / explicit edit

### M1.1 — Radar Signal Core（Frozen）

- `/app/radar` 页面：65% Signals Feed / 35% Quick Review 布局
- Add Signal（URL / Idea 两种 inputType），真实写入 Supabase
- Signal List 从 DB 读取；Filter（All/New/Selected/Skipped）+ title/summary Search
- 状态更新：new ↔ reviewing（轻量 Status Menu，非 Badge 循环）
- `requireSingleBrand()`：V1 单 Brand invariant（0 或 >1 → 明确错误）
- Empty / Loading / Error / Retry 状态
- Vitest 测试体系建立（19 tests）

### M1.2A — Signal Decision Flow（Frozen）

- Signal Selection：Card 点击选中（mint border），Quick Review 显示完整 Signal
- Skip：7 种固定 Skip Reason，服务端 Zod 强制 skipped 必须有 skipReason；本轮无 Restore
- Create Content：Platform 三选一 + 手动 Angle + Owner 选择
- Transaction：`db.transaction()` 内完成全部业务校验 + Signal→selected + Content→planning，任一步失败整体 rollback
- Duplicate protection：`UNIQUE(contents.source_signal_id)`（普通 UNIQUE，PostgreSQL 允许多 NULL）+ 服务端 409；一个非 NULL source_signal_id 最多一个 Content
- 未创建 ContentBrief / ContentMaster / PlatformVersion / Publication；未新建 Studio 路由
- 真实 Supabase smoke test A–D 通过（skip 持久化 / create-content 持久化 / 重复拒绝 / 失败回滚）

### M1.2B — Structured Signal Analysis（Frozen）

- DeepSeek 官方 API（OpenAI-compatible，`openai` SDK 仅作协议客户端），默认模型 `deepseek-v4-flash`
- `lib/ai/`：`provider.ts`（AIProvider 接口）/ `schemas.ts`（Zod）/ `analyze-signal.ts`（prompt + 重试 + 持久化映射）
- 结构化输出：raw → JSON parse → Zod → business validation → persist；不因 json_object 跳过 Zod
- Overall topicScore 由服务端计算：三维全非 null → round(均值)；任一 null → null；AI 不输出 overall
- Evidence boundary：无 crawler，provenance 仅 `signal_input` / `brand_context` / `model_inference`；prompt 明确 "You have NOT read the webpage behind sourceUrl"
- `insufficient_evidence` 为一级正常结果：scores 全 null，绝不归一为 0；angles 可为空
- Persistence：仅整体验证通过后原子覆盖；失败保留旧分析（实测验证）
- Retry budget：一次 Analyze 点击最多 2 次模型请求；之后明确 error + 手动 Retry
- AI 不修改 Signal.status / skipReason / selectedAngle / primaryPlatform / ownerId；Analyze 仅开放 new/reviewing
- 真实 DeepSeek smoke test A–E 通过（持久化 / insufficient 落库 / re-analyze 覆盖 / 失败保留 / read-back）
- 401/403 provider 错误脱敏（不透传 key 片段）

## Architecture Decisions

- AI Layer 遵循 implementation-plan §AI Layer：单一 provider adapter，无 router / fallback / selector UI
- 分析状态派生不落库：analyzed_at null → 未分析；confidence = insufficient_evidence → 证据不足；Analyzing/Error 为 UI transient state
- Evidence provenance 方案（AGENTS §13 无固定 enum）：`signal_input` / `brand_context` / `model_inference`，V1 无验证手段故不使用 verified_fact
- M1.2A 决策后暂不新建 Studio detail 路由；Studio routing 在 M1.3 正式决定
- ContentMaster storage = JSONB modules（data-model §11.4），非固定列；V1 无富文本编辑器，plain text + structured modules
- Master auto-save 复用 save-queue 模式：完整 modules array 快照写入，无协作/revision protocol（单用户场景）
- PlatformVersion storage = canonical JSONB（data-model §13），全 key 持久化；save schema `.strict()` 拒绝 typo key；proposal schema 非 strict（strip 未知 key 避免浪费 retry），normalize 二次兜底
- API 语义分离：POST = 显式创建（Empty Draft 或 Apply proposal），PUT = 仅更新已存在 draft（404 不 upsert）——auto-save 永不能建行

## Schema Changes

- Migration `0001_cute_clea.sql`：`UNIQUE(contents.source_signal_id)`
- Migration `0002_concerned_vision.sql`：signals 新增 `analysis_confidence`（复用 confidence enum）、`analysis_evidence` jsonb、`analyzed_at` timestamptz
- Migration `0003_glossy_patch.sql`：`UNIQUE(content_briefs.content_id)`（Content 1 → 0..1 Brief）
- Migration `0004_mature_chronomancer.sql`：`UNIQUE(content_masters.content_id)`（Content 1 → 0..1 Master）
- Migration `0005_polite_abomination.sql`：`UNIQUE(content_reviews.platform_version_id)`（PlatformVersion 1 → 0..1 current ContentReview）
- data-model §6.2 / §6.7 已同步更新为正式 V1 schema

## Important Files

- `lib/ai/provider.ts` / `lib/ai/schemas.ts` / `lib/ai/analyze-signal.ts` / `lib/ai/draft-brief.ts` / `lib/ai/adapt-platform.ts` — AI 层
- `lib/validation/brief.ts` / `master.ts` / `platform-version.ts` / `review.ts` / `signal.ts` — 校验层
- `lib/review.ts` — Review & transition 领域服务（聚合读 + set-based 写 + WorkflowSnapshot）
- `lib/workflow-snapshot.ts` — 权威快照类型 + stale revision guard + applyVersionsSnapshot
- `lib/checklist-editor.ts` — checklist 交互核心（optimistic + debounce + flush）
- `lib/brief.ts` — resolveApprover（reviewer ?? owner）
- `lib/save-queue.ts` — serialized writes + revision guard + flush
- `app/api/signals/` — list / PATCH / analyze / create-content
- `app/api/contents/` — list / detail / brief(+draft/approve/edit) / master / versions(+adapt/review/return-to-draft/submit-review) / review(+withdraw/approve) / return-to-editing / status（drag 薄入口）
- `app/api/pipeline/route.ts` — 看板聚合（无 N+1）
- `app/app/studio/[contentId]/page.tsx` — Studio 四 tab 全启用 + 单一 applyWorkflowSnapshot
- `app/app/pipeline/page.tsx` — 5 列 Kanban + Content Drawer
- `components/radar/` — quick-review / signal-card / skip-dialog / create-content-dialog / add-signal-dialog / signal-filters
- `components/studio/` — brief-fields / sources-panel / master-editor / platforms-panel / review-panel
- `tests/` 8 files = 146 tests

## Known Issues / Backlog（不阻塞，记录待处理）

- ~~Legacy seed Topic Score~~ 已修复（`0b30836`）
- ~~Checklist interaction blocker~~ 已修复（interaction-first 架构）
- ~~Workflow state sync / F5 blocker~~ 已修复（WorkflowSnapshot 架构）
- **P2 — DB/deployment topology latency**：Supabase 单 RTT 约 ~1s；低频 workflow action 约 5–7s（click 即 pending feedback、UI 不假死、最终状态自动同步）。M1 已做 set-based ops / 聚合读 / 消除二次 GET；不做 RPC/stored procedure 重构。后续真实部署再评估 user↔app↔Supabase region
- **S-01**: Legacy DEMO Content 可能存在 `status = in_progress` 但无 approved Brief 的不一致。仅记录
- **S-02**: AI Draft Brief 可能生成非预期语言内容。后续统一 output language strategy
- Timing 中文文案后续统一为「时效性」；Radar Quick Review 信息密度；全局中英文 UI 统一
- 真实 AI 分析/适配延迟约 7–60s（DeepSeek 偶发 >30s），仅局部 loading + 手动 Retry

## Deferred

- AI Analyze 不接 crawler；sourceUrl 永远只是元数据
- selected/skipped Signal 的重新 Analyze；Skip Restore 流程
- Competitor Breakdown / Content Gap（PRD §7.7）
- Master AI（Rewrite/Shorten/Expand/Ask Loop）→ Studio Advanced
- Content QA / Visual Brief / Learning 提示
- HalftoneReveal 等 React Bits 正式效果；Calendar；Review history

## Frozen Constraints（M1 Final）

### 实体边界
- Signal ≠ Content；ContentBrief ≠ ContentMaster；ContentMaster ≠ PlatformVersion；PlatformVersion ≠ Publication；MetricSnapshot ≠ Publication；ContentReview ≠ Content（属于 PlatformVersion review state）

### Invariants（全部 DB 级 + 服务端双重保证）
- Signal 1 → 0..1 Content：`UNIQUE(contents.source_signal_id)`
- Content 1 → 0..1 ContentBrief：`UNIQUE(content_briefs.content_id)`
- Content 1 → 0..1 ContentMaster：`UNIQUE(content_masters.content_id)`
- Content 1 → 0..N PlatformVersion，同平台唯一：`UNIQUE(platform_versions.content_id, platform)`
- PlatformVersion 1 → 0..1 current ContentReview：`UNIQUE(content_reviews.platform_version_id)`；V1 无 Review History

### AI 原则
- AI Suggest → Human Confirm；AI 永不直接改变 authoritative workflow state
- Radar=结构化分析；Brief=proposal→Apply/Discard；Master=M1 不接 AI；PlatformVersion=Adapt/Re-adapt proposal→Apply/Accept；Review=human-only
- AI 永不：自动 approve / 自动 publish / 自动勾 checklist / 把 inference 升级为 verified evidence

### 数据 / 证据原则
- Missing data ≠ 0（null / N/A）；sourceUrl exists ≠ webpage read ≠ fact verified；model inference ≠ verified fact
- PlatformPlaybook = strategy context ≠ Evidence；不伪造 performance metrics

### Workflow invalidation
- Global（Edit Brief / Edit Master）：Content review/scheduled→in_progress + 全部 versions→draft + 全部 reviews reset；用户内容数据全部保留
- Local（Return platform to Draft）：仅该平台 draft+reset；Content scheduled→review；其他 approved 平台保持

### Workflow UI 架构
- page 级单一 authoritative aggregate；mutation → WorkflowSnapshot response → applyWorkflowSnapshot；低频 transition 不再 mutation+refetch；checklist 高频 = optimistic + 300ms debounce + SaveQueue；无 F5

### 其他
- Brief approved 是 Master / PlatformVersions editing gate；Approved Brief 只能显式 Edit Brief 回 draft
- Content transition 只走 server-side transition table；review→scheduled 仅 Approve for Publishing；published 无写入路径（M1）
- V1 单 Brand、单 AI provider（DeepSeek）、PostgreSQL-first（Drizzle）、Supabase 仅作托管 PG；平台固定 Xiaohongshu / Bilibili / Douyin
- Pipeline 固定 5 列；一 Content 一卡；无 Jira 状态

## Next

- M2 — Real Publication & Analytics：M2.1 Publication Record 优先（Publication 先于 Metrics，Metrics 先于 Diagnosis）
