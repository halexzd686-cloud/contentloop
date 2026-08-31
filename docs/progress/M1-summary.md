# M1 Summary — Core Content Workflow（进行中）

> Status: M1.1 / M1.2A / M1.2B / M1.3 / M1.4 / M1.5 **Frozen**。下一步 M1.6 — Review & Pipeline。

## Completed

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
- data-model §6.2 / §6.7 已同步更新为正式 V1 schema

## Important Files

- `lib/ai/provider.ts` / `lib/ai/schemas.ts` / `lib/ai/analyze-signal.ts` / `lib/ai/draft-brief.ts` — AI 层
- `lib/validation/brief.ts` — Brief 三层 schema（AI draft / save / approve）
- `lib/brief.ts` — resolveApprover（reviewer ?? owner）
- `app/api/signals/[id]/analyze/route.ts` — Analyze API
- `app/api/signals/[id]/route.ts` — PATCH（new↔reviewing + skip）
- `app/api/signals/[id]/create-content/route.ts` — Create Content 事务
- `app/api/contents/` — list / detail / brief（upsert）/ brief/draft / brief/approve / brief/edit / master（POST 创建骨架 + PUT 保存）/ versions/[platform]（POST 创建 + PUT 更新）/ versions/[platform]/adapt（AI proposal）
- `app/app/studio/page.tsx` + `app/app/studio/[contentId]/page.tsx` — Studio（Brief / Master / Platforms tabs 启用，Review disabled）
- `components/radar/` — quick-review / signal-card / skip-dialog / create-content-dialog / add-signal-dialog / signal-filters
- `components/studio/` — brief-fields / sources-panel / master-editor / platforms-panel
- `lib/validation/master.ts` — 模块规则 / 骨架 / order 规范化
- `lib/validation/platform-version.ts` — 三平台 canonical schema / empty data / normalize
- `lib/ai/adapt-platform.ts` — AI 平台适配 proposal
- `lib/save-queue.ts` — serialized writes + revision guard
- `tests/signal.test.ts`（36）+ `tests/signal-analysis.test.ts`（27）+ `tests/brief.test.ts`（16）+ `tests/master.test.ts`（19）+ `tests/platform-version.test.ts`（23）= 121 tests

## Known Issues / Backlog（不阻塞，记录待处理）

- ~~Legacy seed Topic Score~~ 已修复（`0b30836`）：seed 不再预填 score，DB 已清理 `analyzed_at IS NULL` 行的 score，SignalCard 改为 `analyzedAt` 门控
- **S-01**: Legacy DEMO Content 可能存在 `status = in_progress` 但无 approved Brief 的不一致（如 seed 的 "Claude Agent 实测"）。仅记录，不为 M1.4 改 seed/workflow
- **S-02**: AI Draft Brief 可能生成非预期语言内容。后续需统一 output language strategy（优先跟随 Brand/Content/Signal 主要语言）。本轮不改 prompt
- Timing 中文文案后续统一为「时效性」
- Radar Quick Review 信息密度后续 polish
- 全局中英文 UI 文案后续统一
- M1.2A 浏览器人工验收：已通过（用户确认）
- 真实 AI 分析延迟约 7–13s，仅局部 loading

## Deferred

- AI Analyze 不接 crawler；sourceUrl 永远只是元数据
- selected/skipped Signal 的重新 Analyze
- Skip Restore 流程
- Competitor Breakdown / Content Gap（PRD §7.7）
- HalftoneReveal 等 React Bits 正式效果

## Frozen Constraints

- Signal 1 → 0..1 Content（DB unique + 服务端双重保证）
- selected Signal 必须存在 linked Content；skipped Signal 必须有 skipReason
- Content 1 → 0..1 ContentBrief（DB unique + 服务端 upsert 双重保证）
- Content 1 → 0..1 ContentMaster（DB unique + 服务端 409 双重保证）
- Content + Platform → 0..1 PlatformVersion（DB unique + 服务端 409 双重保证）
- PlatformVersion M1.5 只开放 draft；PlatformVersion ≠ Publication
- Brief approved 是 Master / PlatformVersions editing gate；Brief 回 draft 时下游数据保留但 read-only
- Score null 不归一为 0；AI 只 Suggest，Human Confirm（AI proposal 不落库）
- Approved Brief 只能经显式 Edit Brief 回到 draft；auto-save 不得静默解除 approval
- V1 单 Brand、单 AI provider、PostgreSQL-first（Drizzle）、Supabase 仅作托管 PG；V1 平台固定 Xiaohongshu / Bilibili / Douyin

## Next

- M1.6 — Review & Pipeline：Review checklist → Approve for Publishing → Content review→scheduled → Pipeline board（不创建 Publication）
