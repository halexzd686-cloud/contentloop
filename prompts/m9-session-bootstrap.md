# Next Session Bootstrap（M9 完成后）

新会话第一条消息粘贴以下内容：

---

阅读以下文件（全部位于仓库根目录 `E:\AI Agent\ContentLoop`）：

1. `AGENTS.md` — 工作契约（§3 已移除 Dark mode 禁令）
2. `docs/ContentLoop_PRD_v1.md` — 产品范围
3. `docs/ContentLoop_data-model_v1.md` — 实体与关系
4. `docs/ContentLoop_design_v1.md` — 视觉规范（§2.1 已为双主题章）
5. `docs/ContentLoop_implementation-plan_v1.md` — 里程碑
6. `docs/progress/M9-summary.md` — 最新里程碑（响应式 + Loop AI 展开 + 深色模式）

M9 已关闭。剩余候选（开工前与用户确认）：

- **V1 真实数据走环**：§42 环路 M8 已用 DEMO 彩排 14 环节零缺陷，待团队用真实内容验证后即宣告 V1 完成
- **Test 是否支持 manual checkpoint**：tests.checkpoint 目前仅 24h/72h，规范未定义
- **Analytics「关键观察」确定性结论区**：M7 遗留，需先定数据来源，禁止虚构

冻结约束见 M9-summary「Frozen Constraints」（浅色+深色双冻结色板；canvas 组件运行时令牌解析契约）。数据库 Supabase PostgreSQL + Drizzle，连接走 `.env` 的 DATABASE_URL。测试基线 413/413，预览端口 3109（?theme=dark 可直接预览深色）。

---
