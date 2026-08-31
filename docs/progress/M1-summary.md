# M1 Summary — Core Content Workflow（进行中）

> Status: M1.1 / M1.2A / M1.2B **Frozen**。下一步 M1.3 — Studio Brief Core。

## Completed

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

## Schema Changes

- Migration `0001_cute_clea.sql`：`UNIQUE(contents.source_signal_id)`
- Migration `0002_concerned_vision.sql`：signals 新增 `analysis_confidence`（复用 confidence enum）、`analysis_evidence` jsonb、`analyzed_at` timestamptz
- data-model §6.2 / §6.7 已同步更新为正式 V1 schema

## Important Files

- `lib/ai/provider.ts` / `lib/ai/schemas.ts` / `lib/ai/analyze-signal.ts` — AI 层
- `app/api/signals/[id]/analyze/route.ts` — Analyze API
- `app/api/signals/[id]/route.ts` — PATCH（new↔reviewing + skip）
- `app/api/signals/[id]/create-content/route.ts` — Create Content 事务
- `components/radar/` — quick-review / signal-card / skip-dialog / create-content-dialog / add-signal-dialog / signal-filters
- `tests/signal.test.ts`（36）+ `tests/signal-analysis.test.ts`（27）= 63 tests

## Known Issues / Backlog（不阻塞，记录待处理）

- **Legacy seed Topic Score（数据真实性）**：seed 为 5 个 Signal 硬编码了 score（`db/seed/index.ts:175–236`），这些行 `analyzed_at = null`、`analysis_confidence = null`。来源：seed（非 UI bug）。
  - 影响：`components/radar/signal-card.tsx:203` 只要 `topicScore !== null` 就显示 "Score: X"，不检查 `analyzedAt` → 未正式分析的 Signal 在 Feed 卡片上显示得分（legacy/mock 数据）。Quick Review 已按 `analyzedAt` 正确门控。
  - 处置建议（待批准）：清空 seed 中的 score 字段，或 SignalCard 改为 `analyzedAt !== null` 才显示。
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
- Score null 不归一为 0；AI 只 Suggest，Human Confirm
- V1 单 Brand、单 AI provider、PostgreSQL-first（Drizzle）、Supabase 仅作托管 PG

## Next

- M1.3 — Studio Brief Core：Signal → Content → Studio → ContentBrief → AI Draft → Human Edit → Approve
