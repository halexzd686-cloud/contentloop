# M8 Summary — 功能缺口补齐（M7 视觉审计遗留）

## Completed
- **B1 平台规范 Playbook 读取**：`GET /api/settings/playbooks` + Settings「平台规范」只读配置区（平台 Index Tabs + 账本式七字段表，空字段显 "—"）
- **B2 Manual Checkpoint**（用户决策 2026-09-17：进 V1）：`24h/72h/manual` 三 checkpoint 全链路——录入（POST）、编辑（PUT）、Analytics 详情「手动」Tab、基线、诊断入口全部可用
- **B3 Tests/Learnings 视觉对齐**：Analytics 下部两个 section 从 M5.6 卡片样式移植到 M7 账本语言，行为零改动
- **平台规范编辑流**（M8 追加，原 Deferred 项）：`PUT /api/settings/playbooks` 人保存（upsert，strict Zod）+ `POST /api/settings/playbooks/draft` AI 起草（只出草稿、绝不写库）+ Settings 平台规范区编辑态（七字段表单 + AiActionButton 起草入口 + ThinkingOrbs 推理态 + 金色草稿待审横幅）
- **Learning → Playbook「Add as Rule」**（M8 追加，PRD §15.5 / 数据模型 §28 Rule 9）：平台规范面板内绿色轻横幅列出相关经验（本平台 + 全平台），「添加为规则」= 人选目标字段后转写进编辑草稿（不直接写库），「忽略」为会话级

## Architecture Decisions
- **timed/manual 分离**：`TIMED_CHECKPOINTS`（24h/72h，有 dueAt/status/timing gate）与 `CHECKPOINTS`（+manual）分离；manual 无目标时间、永不到期、每发布记录一条（沿用 UNIQUE(publication_id, checkpoint) upsert 语义）
- **manual 唯一门禁**：发布时间 − 5min ≤ capturedAt ≤ now + 2min；不能早于发布
- **manual 基线**：同 checkpoint 队列（manual 只与 manual 比）；captureDelta 从 publishedAt 起算；Analytics 详情 `targetAt: null`
- **CSV/XLSX 导入保持 timed-only**（`parseCheckpointValue` 返回 `TimedCheckpoint`）——manual 无排期可批量对齐
- **共享账本 helper**：`components/analytics/ledger.tsx`（Sec/Motif/LedgerLabel/StatusDot + 色板常量），analytics page 与四个 section 组件共用

## Schema Changes
- 无（`metric_checkpoint` enum 自建库起已含 "manual"）

## Important Files
- `app/api/settings/playbooks/route.ts`（GET + PUT 人保存）、`app/api/settings/playbooks/draft/route.ts`（AI 起草，不落库）
- `lib/validation/playbook.ts`（upsert / AI draft 双 schema）、`lib/ai/draft-playbook.ts`
- `app/app/settings/page.tsx`（平台规范区：只读账本 + PlaybookPanel 编辑/草稿）
- `lib/validation/snapshot.ts`（TIMED_CHECKPOINTS/Checkpoint 分离）
- `lib/metrics/snapshots.ts`（manual 门禁）、`lib/metrics/baseline.ts`（manual delta）、`lib/metrics/analytics.ts`（hasManual、targetAt null）
- `components/studio/snapshot-modal.tsx`（manual 文案）
- `app/app/analytics/page.tsx`（手动 Tab + 空态录入 + 列表 chip）
- `components/analytics/ledger.tsx`（新，共享账本语言）

## Known Issues
- 无新增

## Deferred
- Analytics「关键观察」确定性结论区（M7 遗留：生产无该数据，未虚构）
- Playbook `ruleSources` 审计元数据（数据模型 §28 标注"如果实现成本较低"——需加 jsonb 列，M8 判定超出轻量范围，未做）

## Frozen Constraints
- 继承 M7 全部冻结约束（色板/字体/动画角色/五阶段看板/六导航/留空≠N/A≠0/AI 只建议不持久化）
- 更新：checkpoint 模型 = `24h / 72h / manual`（manual 无排期语义无目标时间）；M7 原文"24h/72h 双 checkpoint"指的是定时到期追踪，manual 为补充观察点
- checkpoint 中文显示走 `lib/labels.ts` 的 `checkpointLabel`（manual → 手动）
- Playbook 写入唯一入口 = `PUT /api/settings/playbooks`（人保存）；AI 草稿只填表单不落库；无版本管理

## Next
- Analytics「关键观察」确定性结论区（需先确认确定性数据来源）
- V1 验收主线：AGENTS §42 全环路（Signal→…→Apply Learning）真实数据端到端验证

## Verification（2026-09-17）
- typecheck ✅ / lint 0 error（8 warning 全为既有 dev 原型基线）✅ / tests 409/409 ✅ / build ✅
- B1 真实接口：三平台七字段正确返回
- B2 真实链路（DEMO 发布记录，已清理）：早于发布 400 / 创建 201 / 重复 409 / 未来时间 400 / 编辑 200（N/A 保留）/ 详情 targetAt=null / 基线 200 / 索引 hasManual 正确
- Playbook 编辑流真实链路：非法 platform 400 / 多余字段 400 / upsert 200 + updatedAt 更新 / AI 草稿 200（结构化七字段、基于现有规范与 Learning）且确认不落库；E2E 期间 douyin 规范曾因 curl 中文编码误写，已按 seed 原值精确复原并校验

## V1 全环路彩排（2026-09-18，DEMO 数据，API 驱动）

§42 全环一次性走通，14 个环节全部通过：

Signal(b19002ea) → AI 分析(88/84 分) → Content(3904ae3a) → AI Brief 草稿(不落库) → 人应用+批准 → 母稿 7 模块 → AI 平台适配(hasPlaybook=true，B1 读路径在环内被消费) → 人接受版本 → 送审(门禁:简报批准+母稿+版本) → checklist 5 项 → 审核通过→scheduled(唯一路径) → 发布记录→published(唯一路径) → 24h/72h/manual 三快照(manual=B2 新能力入环，201) → 详情+真实队列基线 → AI 诊断提案→人保存(201) → Test 创建+关联+预览 → 结论(no_clear_result) → AI Learning 草稿(如实承认证据不足) → 人保存(83f36a97) → 新内容(bb9073ea) → Apply Learning(application 578f1c39，环路证明链)

- 验证到的冻结规则：留空≠N/A≠0（24h comments=null→派生 N/A；对照内容 metric_unavailable）；preview→conclude 指纹漂移 409（防 stale 结论）；insufficient_evidence 时 AI 不硬造结论；内容状态机唯一路径约束
- 彩排产物全部 DEMO 标注（2 内容 isDemo=true 不进真实基线队列；Signal/Test 标题 [DEMO] 前缀）
- 待决策：tests.checkpoint 仅 ["24h","72h"]——Test 是否支持 manual checkpoint 未定义（B2 未触及）
- 环境限制：本会话桌面浏览器面板不加载 JS（无 _next/static 请求），UI 驱动验收不可行，改为 API 驱动（同一批服务端路由与闸门）
