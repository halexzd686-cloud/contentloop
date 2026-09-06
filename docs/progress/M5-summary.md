# M5 Summary — Dogfood & Release（进行中）

> Status: M5.1 Audit **Complete**；M5.2 **Frozen**；M5.3A **Complete**；M5.3B Real Dogfood **⏳ PENDING**（真实 WorkBuddy Content 存在且未动，真实 Publication + 24h/72h 观测未完成）。M4.4 aesthetic acceptance 仍 deferred to M5.6。下一步 M5.4 — Release Readiness（规划门未开）。
>
> 前置：M4 系列见 `M4-summary.md`。

## Completed

### M5.3A — External Proxy Functional Test（Complete）

- 用外部真实视频（Bilibili BV1Px3D6mECS）作 proxy 源 + 全 DEMO 隔离链（isDemo=true，仅 Content 级权威，无 title heuristic），验证完整产品闭环：Scheduled → Publication → 24h/72h Metrics → Analytics → Diagnosis → Test → Human Conclusion (win) → Learning → Next Content → Apply Learning
- Proxy A/B/C 全程经真实产品 API 路径（create→Brief→Approve→Master→Version→Review→Checklist→Approve for Publishing→Mark as Published→Enter Metrics）；isDemo 为唯一 DB 内部供应字段
- **Apply Learning 权威边界实测**：LearningApplication 0→1 为唯一业务 mutation；Content status / Brief 八字段与状态 / Master / PlatformVersion / Review / Publication / Snapshot 零变更（持久层逐字段比对）
- Proxy 数据不进 operational baseline cohort（real-only，M4.1 路径不变）
- 结束后 Proxy A/B/C + Test/Learning 链单事务精确清理（preflight 身份 + 独占归属断言 + 15 项 post-count 断言）；真实 WorkBuddy Content 清理前后状态逐字段一致；DB 回到 frozen baseline（7/2/5/6/2/4/4/9/7，loop 表全零）

### M5.3A Dogfood hotfixes（真实浏览器 dogfood 发现）

- **D01 ✅ FIXED**：手动指标录入接受严格逗号千分位（"18,600"→18600；乱分组 "1,2,3"/"12,34"/",123"/"123,"/负数保持 invalid）；新增共享 `parseCountText`（与 import 同分组语义）；畸形输入有字段级提示；blank/N/A/0 语义与存储形状不变
- **D02 ✅ FIXED**：冷启动 Diagnosis（当前指标已记录但无可比 baseline 证据）不再误报 "No metric evidence recorded."，改为明确区分"当前指标已记录 vs 比较证据不可用"。M2.6 canonical What Happened / evidence 权威 / confidence 语义 / fingerprint / baseline service 未动

### M5.1 — Full Journey Functional Audit（Complete）

- 全链路 22 步功能审计（entry/preconditions/knowledge/happy/wrong-input/missing-data/failure/recovery/persistence/next-action/authority/gap/severity）
- 结论：**无 P0、无 P1**；6 个 P2（G-51~G-56）；产品 ready for **constrained dogfood**
- 新发现（超越单 milestone 视野）：import ambiguous 行无 UI 解法、per-row capturedAt override 无输入、import 定义加载静默失败、编辑面刷新丢 debounce 窗口无警告（G-56）
- Release readiness 预查（归 M5.4）：README 无 setup、seed 非幂等、DIRECT_URL 注释误导、无部署配置
- 输出：journey scorecard、gap inventory、top-10 risks、dogfood sequence

### M5.2 — Functional Friction Fixes（Frozen，验收 A–O 全过）

- **G-51**：`?publication=<id>&checkpoint=24h|72h` query 深链（`parseAnalyticsTarget` 纯函数；snapshot 不存在也可选中；无效 query 安全回退默认）；Home due 卡片深链到精确 publication/checkpoint
- **G-52**：ambiguous import 行获得与 unmatched 相同的 Human publication picker；真正 identity conflict 保持硬性阻断；server 重验 platform/brand；无 fuzzy/AI/默认猜测
- **G-53**：per-row capturedAt override UI（datetime-local + "— overridden" 标记 + Clear + parsed 原值展示）；override 在 server 全部时序校验之前应用；参与 previewFingerprint（旧 preview 不可 Confirm）；含浏览器发现的 ready-row 不显示 bug 的定点修复（presentation 边界，`capturedAtOverrideVisible` 契约谓词）
- **G-54**：metric definitions `loading/loaded/error` 显式状态 + Retry；失败不再伪装成"零指标"；template/upload/confirm 在定义不可用时禁用；Retry 只重载定义、保留文件与 mapping
- **G-55**：Radar Reviewing 一等 filter tab（server enum 本就支持）
- **G-56**：**未修复、未降级**——保持 P2 候选（debounce 窗口/失败队列刷新丢失），留 M5.3 真实 dogfood 评估
- 验收：A–O 全过；L/M/O 为 jsdom 组件级集成测试（真实渲染 + fetch mock，零 DB 写）；J 只读确认 stale preview Confirm 零写入
- 0 migration / 0 schema / 0 enum / 0 AI / 0 新 workflow domain

## Schema Changes

- 无（M5.1/M5.2/M5.3A 均无）

## Important Files

- `lib/metrics/comparison.ts` — `parseAnalyticsTarget`（深链）
- `app/app/analytics/page.tsx` / `app/app/page.tsx` — query 选择 + Home 深链
- `components/radar/signal-filters.tsx` — Reviewing tab
- `components/analytics/import-modal.tsx` + `lib/import/normalize.ts` — G-52/53/54
- `lib/validation/snapshot.ts` + `components/studio/snapshot-modal.tsx` — D01 `parseCountText` + 字段级提示
- `components/analytics/loop-analysis.tsx` — D02 冷启动 evidence 文案
- `tests/component-lmo.test.tsx` — jsdom 组件集成测试设施（**永久保留**，含 D01/D02 组件证据）
- `vitest.config.ts` — include `.tsx`；`jsdom` dev-only 依赖（**永久保留**）

## Known Issues / Limitations

1. G-56 保持开放：P2 候选，M5.3A Proxy 旅程中**未自然复现**（无保存焦虑/文本丢失/导航丢失报告）；留 M5.3B 真实写作或发布前评审最终决策
2. M5.4 待办：README setup、seed 幂等、DIRECT_URL 注释、部署配置
3. M4.4 美学验收仍 deferred 至 M5.6 Final Visual Pass
4. M4 系列既有 P3 backlog 不变（见 M4-summary.md）

## Frozen Constraints（M5.2 新增）

- Import identity：unmatched/ambiguous → Human 显式解法；identity conflict → 硬阻断；永不 fuzzy/AI/默认猜测
- capturedAt override 是 Human 输入而非权威：server Confirm 重解析文件并重校验全部时序规则
- Home 深链 query 无效时必须安全回退默认选择

## Next

- M5.3B — Real Dogfood（真实 WorkBuddy：真实发布 + 真实 24h/72h 观测）
- M5.4 — Release Readiness（规划门未开）
