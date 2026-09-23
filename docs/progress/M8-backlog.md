# M8 Backlog — M7 视觉阶段确认的功能缺口

> 来源：M7 逐页原型审计中确认"现有功能不存在、不能幻觉呈现"的功能项。
> 这些不属于视觉工作，需独立功能任务补齐。

## B1. 平台规范（Platform Playbook）读取接口与配置 UI — ✅ 已完成（2026-09-17）

- `GET /api/settings/playbooks`（`app/api/settings/playbooks/route.ts`）返回本品牌三平台七字段规范
- Settings 新增「平台规范」区（Utility Index 第二项）：平台 Index Tabs + 账本式只读字段表（语气/标题风格/钩子/结构/行动召唤/避免/优秀案例），空字段显示 "—"
- 编辑能力未做（AGENTS §21：AI 起草、人保存——留待后续任务）

## B2. Manual Checkpoint（手动观察点）— ✅ 已完成（2026-09-17）

- **决策记录**（2026-09-17，用户确认）：manual 进 V1，补实现
- `lib/validation/snapshot.ts`：`TIMED_CHECKPOINTS`（24h/72h）与 `CHECKPOINTS`（+manual）分离；dueAt/status/timing gate 仅作用于 timed；manual 无目标时间、永不到期
- 门禁：manual 仅要求 发布时间 ≤ capturedAt ≤ now+2min；DB enum 早已含 manual，无迁移
- 基线：manual 基线 = 其他 manual 快照的同窗口中位数；captureDelta 从 publishedAt 起算
- UI：Analytics 详情新增「手动」Index Tab + 空态录入入口；列表行在已提交时显示「手动 已提交·编辑」chip；snapshot-modal 适配无目标时间文案
- CSV/XLSX 导入保持 timed-only（`parseCheckpointValue: TimedCheckpoint`）

## B3. Tests/Learnings 视觉对齐 — ✅ 已完成（2026-09-17）

- 共享账本 helper 提取至 `components/analytics/ledger.tsx`（Sec/Motif/LedgerLabel/StatusDot + 色板常量），analytics page 改用共享版
- tests-section / test-result-section / learnings-section / learning-section 全部去除 M5.6 卡片外壳，对齐发丝线行 + dashed 空态 + 文字状态语言；行为零改动

