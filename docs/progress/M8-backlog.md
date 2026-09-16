# M8 Backlog — M7 视觉阶段确认的功能缺口

> 来源：M7 逐页原型审计中确认"现有功能不存在、不能幻觉呈现"的功能项。
> 这些不属于视觉工作，需独立功能任务补齐。

## B1. 平台规范（Platform Playbook）读取接口与配置 UI

- **现状**：`platform_playbooks` 表完整（voice / title_style / hook_style / structure / cta / avoid / good_examples 七字段），AI 适配路由（`versions/[platform]/adapt`、`brief/draft`）在消费；但全库唯一读取是 `SELECT platform`，**无返回规范内容的接口，无 Settings UI**
- **需要**：
  1. `GET /api/settings/playbooks` 读取现有规范
  2. Settings 新增"平台规范"配置区（先只读查看；编辑按 AGENTS.md §21 语义——AI 可生成草稿、人保存规则，无版本管理）
- **决策记录**（2026-09-16，用户确认）：M7 Settings 原型按 A 方案不呈现该区块

## B2. Manual Checkpoint（手动观察点）

- **现状**：AGENTS.md §17 将 checkpoint 模型定义为 `24h / 72h / manual`，但 `lib/validation/snapshot.ts` 的 `CHECKPOINTS = ["24h", "72h"]`，manual 未实现
- **需要**：确认 manual checkpoint 是否仍属 V1 范围；若是，补数据模型 + 录入 UI（snapshot-modal 支持自定义时间点）
- **决策记录**（2026-09-16）：M7 Analytics 原型已移除"手动补充"Tab（无后端支撑）
