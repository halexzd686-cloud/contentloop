# M7 — Product Alignment Audit（Phase 0）

> 只读审计。对照冻结产品意图核验当前实现。结论：**无 Category C（真实 domain/功能偏离）**，无需重开 Functional Freeze。

## A. Core Loop Mapping

| 环节 | 位置 | Owner | 符合意图 | Gap |
|---|---|---|---|---|
| Signal | `app/api/signals/` + `app/app/radar/` + `components/radar/` | radar page + signals routes | ✅ 创建(URL/Idea)/分析/评估/选用/跳过齐全 | 无 |
| Content | `app/api/contents/` + `lib/contents.ts` | Studio | ✅ Signal→Content 分离、手动创建、归档/恢复 | 无 |
| Platform Version | `app/api/contents/[id]/versions/` + `platforms-panel.tsx` | Studio | ✅ 手工草稿+AI 适配提案、draft-only 编辑 | 无 |
| Publication | `app/api/.../publication/route.ts` + `lib/publication.ts` | Studio/Pipeline | ✅ 真实事实记录、身份/时间/URL、snapshot 后锁定 | 无 |
| Metric Snapshot | `app/api/publications/[id]/metric-snapshots/` + `lib/metrics/snapshots.ts` | Analytics/Pipeline/Studio | ✅ 24h/72h、blank/N/A/0、capturedAt 校验、千分位 | 无 |
| Diagnosis | `lib/metrics/diagnosis*.ts` + `loop-analysis.tsx` | Analytics | ✅ 提案零写、人保存、stale 标记、冷启动文案 | 无 |
| Test | `app/api/tests/` + `lib/tests*.ts` + `tests-section.tsx` | Analytics | ✅ 创建即 running、核心定义锁定、结论冻结证据 | 无 |
| Learning | `app/api/tests/[id]/learning/` + `lib/learnings.ts` | Analytics | ✅ 可选 AI 草稿、人编辑人保存、provenance 可见 | 无 |
| Next Content（Apply） | `lib/learning-applications.ts` + `learnings-panel.tsx` | Studio | ✅ 仅建 relation、不改任何内容/状态 | 无 |

## B. Six-Page Responsibility Audit

| 页面 | 实际职责 | 对比冻结意图 | 泄漏 |
|---|---|---|---|
| 首页 | 待处理（due 数据+待审核）/继续创作/跟进中；纯导航 | 符合（continuity/attention/resume/monitoring） | 无 |
| 选题雷达 | 线索 CRUD + AI 分析 + 快速评估 + 选用/跳过/创建内容 | 符合（决定什么值得做成内容） | 无 |
| 内容工作台 | 来源→简报→母稿→平台版本→审核；Loop AI 仅提案 | 符合 | 无（非 AI 聊天/写作游乐场） |
| 内容流程 | 五冻结阶段看板 + 拖拽（合法转换表）+ 发布/录入入口 | 符合 | 无 |
| 数据复盘 | 事实→基线→诊断→测试→经验；Fact 视觉/语义最高权威 | 符合 | 无（无通用 KPI dashboard 漂移） |
| 设置 | 指标定义 CRUD（含语义锁）+ 平台规范读取 | 符合（仅配置） | 无 |

无职责泄漏。Analytics 无泛 dashboard 行为；Studio 无自由 AI 对话。

## C. AI Authority Audit

- AI 库（`lib/ai/*`）全部**零直接 DB 写**（实测 grep 无 insert/update）——提案只读返回，写入全部经由人确认后的既有端点
- AI 不能：批准内容（approve 端点与 AI 无关联）、发布（publication 需人工 modal）、删除权威记录（无 AI 删除路径）、静默覆盖已确认内容（OLD/NEW + Accept/Reject）、自动保存权威 Learning（save 端点需人工 POST）、自动改平台规范（playbook 无 AI 写路径）
- 模式保持 **Suggest → Prepare → Human Confirm** ✅
- AI 不可用/失败：sanitized 中文文案 + 手动流可用（M4.3/M5.7 冻结，实测验证过）

## D. Analytics Authority Audit

- FACT → COMPARISON → INTERPRETATION 语义保持：Current 列视觉最强（M5.6）、median 列次级、诊断右栏次级 ✅
- 缺失 = null/N/A；0 = 真实 0；demo 不进真实基线（`isDemo` cohort 过滤）；基线=自身最近 20 条可比发布中位数 ✅

## E. Test / Learning Audit

- Test 与 Learning 分离、Learning 需人保存 ✅
- 结果语言冻结：支持假设 / 不支持假设 / 有得有失 / 无明确结论——无统计证明暗示 ✅

## F. Findings

- **Category A（纯展示）**：无待办偏离。
- **Category B（可发现性/IA）**：无新增（M4.2 已收敛）。
- **Category C（真实 domain/功能偏离）**：**无**。Phase 1 可安全继续。

### M7 实施提示（供后续 phase）
- 高保真 mockup 中的控件一律不得当作功能规格；未匹配的 mockup 控件必须省略并报告
- 动效角色冻结：Entrance=Halftone Reveal / AI 推理=Thinking Orbs / 系统处理=Spiral Loader；页面数据加载用结构骨架，不混用
