# M8 Session Bootstrap

新会话第一条消息粘贴以下内容：

---

阅读以下文件（全部位于仓库根目录 `E:\AI Agent\ContentLoop`）：

1. `AGENTS.md` — 工作契约
2. `docs/ContentLoop_PRD_v1.md` — 产品范围
3. `docs/ContentLoop_data-model_v1.md` — 实体与关系
4. `docs/ContentLoop_design_v1.md` — 视觉规范
5. `docs/ContentLoop_implementation-plan_v1.md` — 里程碑
6. `docs/progress/M7-summary.md` — 最新里程碑状态（M7 视觉 V2 已全量移植生产并验收）

当前里程碑：M8（功能缺口补齐，不是新模块）。按序执行：

- **B1 平台规范 Playbook**：`platform_playbooks` 表已存在并被 AI 路由消费，但无读取接口、无 UI。任务：`GET /api/settings/playbooks` + 设置页「平台规范」配置区（先只读；编辑遵循 AGENTS §21：AI 可起草、人保存、无版本管理）
- **B2 Manual Checkpoint 决策**：AGENTS §17 写了 `24h/72h/manual`，代码只有 24h/72h。先向用户确认 manual 是否进 V1，再动手
- **B3 Tests/Learnings 视觉对齐**：数据复盘下部两个 section 从 M5.6 旧样式对齐到 M7 账本语言

冻结约束见 M7-summary「Frozen Constraints」。数据库 Supabase PostgreSQL + Drizzle，连接走 `.env` 的 DATABASE_URL。测试基线 398/398，预览端口 3109。

---
