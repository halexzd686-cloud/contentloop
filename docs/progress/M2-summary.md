# M2 Summary — Real Publication & Analytics（进行中）

> Status: M2.1 / M2.2 / M2.3 / M2.4 / M2.5 **Frozen**（人工浏览器验收通过）。下一步 M2.6 — Structured Diagnosis。
>
> 前置：M1 已 Frozen（见 `M1-summary.md`，tag `v0.2-core-workflow`）。

## Completed

### M2.1 — Publication Record（Frozen，人工浏览器验收通过）

- 正式冻结业务链：Approved PlatformVersion → Human Mark as Published → Publication → PlatformVersion published → Content publication aggregate
- **Publication Target Set = 当前 Content 实际存在的 active PlatformVersions**，不是 Brand.enabledPlatforms 全集；不新增 publication target table
- Invariant：PlatformVersion 1 → 0..1 Publication；`UNIQUE(publications.platform_version_id)` M0 已就绪，服务端 409 + DB 双重保证；无 Publication History
- Publication = 现实世界发布事实（finalTitle / publishedAt / url 必填，coverUrl / notes 可选；platform / contentId / platformVersionId 服务端派生，strict schema 拒绝伪造）
- published PlatformVersion **immutable**：无 edit / auto-save / Re-adapt / Return to Draft / 任何 status 回退；`isVersionEditable = status === "draft"` 硬规则（client 不发请求 + server 409 双守卫）
- Publication 可纠错 5 字段（finalTitle / publishedAt / url / coverUrl / notes），identity 不可改，无 history；M2.3 compatibility rule 已记录（publishedAt 修改影响 checkpoint 语义，届时决定 lock 或重算策略）
- 部分发布：未发布平台可局部 Return to Draft（Content 保持 scheduled，不降 review）；published 平台完全不变
- 存在 ≥1 Publication 后：Global upstream editing（Edit Brief / Return Master to Editing）服务端 409 硬锁 + UI 锁定说明
- 24h checkpoint = publishedAt + 24h；72h = publishedAt + 72h；纯派生，**不创建任何 MetricSnapshot**
- 事务：gate → INSERT → version→published → aggregate（全 target published → Content scheduled→published）→ authoritative snapshot，无二次 GET、无 F5
- 时间策略：UI datetime-local（本地）→ ISO UTC → DB timestamptz；未来时间守卫（2min skew）；URL 合法性校验
- Studio Review tab（Publication 卡片 + Mark as Published + Edit）与 Pipeline Drawer（进度 X/N + 同 modal 同 API）双入口
- 测试 158 通过；Supabase smoke 全通过；metric_snapshots 恒 0

### M2.2 — Metric Definition Engine（Frozen，人工浏览器验收 A–H 通过）

- 正式边界：MetricDefinition（指标语义）≠ MetricSnapshot（未来某 Publication checkpoint 的真实数据）；M2.2 只实现前者，metric_snapshots 恒 0
- Migration `0006`：`metric_format` enum（count/percentage/ratio）+ `format` 列 + `UNIQUE(brand_id, platform, key)`
- Raw：无分子/分母/formula，format 恒 count；Derived：仅依赖同 Brand 同 Platform 的 raw（一层依赖图，禁止 derived→derived，无 cycle 检测需求）
- Calculation authority = type + numeratorKey + denominatorKey + format；`formula` 文本仅 canonical display/audit，**永不执行**，由 server 在 structured config 变更时重生成
- Missing ≠ Zero：null 分子/分母 → N/A；分母 0 → N/A；分子 0 分母>0 → 真 0；无 NaN/Infinity；presentation 才 round
- 默认集（三平台各 9 个，seed 幂等 onConflict）：core raw active = views/likes/saves/comments；optional raw inactive = impressions/followers_gained（带 caution）；derived active = like_rate/save_rate/comment_rate
- Custom Derived 允许（server 生成稳定 `custom_<slug>_<suffix>` key，改名不 re-key）；Custom Raw 不允许；Disable 允许、Delete 不提供
- Active 依赖保护：active derived 要求 raw deps active；被引用的 active raw 不可 disable（409 列依赖名）；无 cascade
- Settings → Metrics UI + Edit dialog + Create Derived modal（实时 preview，方向可见）
- Engine：`lib/metrics/engine.ts` 纯函数（calculateMetric / formatMetricValue / buildFormulaPreview / buildCanonicalFormula）
- 176 tests 通过
- Post-Snapshot compatibility（M2.3 起落实）：被真实 Snapshot 引用后，derived 的 numeratorKey/denominatorKey/format 不得再改

### M2.3 — 24h/72h Metric Input（Frozen，人工浏览器验收 A–J 通过）

- MetricSnapshot belongs to Publication（不属 Content）：Publication ├── 24h └── 72h，互相独立
- Invariant：`UNIQUE(publication_id, checkpoint)` M0 已就绪；M2.3 只开放 24h/72h，`manual` checkpoint 未启用
- **RAW-only persistence**：JSONB 只存 raw values；derived = Snapshot raw + MetricDefinition + engine runtime 计算，双 truth 不存在
- 三态语义：无 row = Not Entered；key=null = 显式 N/A；key=0 = 真实零；null 永不转 0；blank 不可提交
- 时间语义分离：capturedAt = 人工确认的观测时间（可纠错）；checkpoint target = publishedAt + 24/72h（纯派生）；createdAt = DB 建行时间；timing gate 基于 capturedAt（≥ target − 5min），非提交时间；late entry 合法
- Create shape = 当前 active raw keys 精确集合；Edit shape = 已存 keys 精确集合（Settings 后续变更不改历史 shape）
- Snapshot 存在 = Human 显式 Submit；开表单/输入零 DB 写入；无 auto-save；POST 409 duplicate / PUT 404 nonexistent；无 Delete
- source 恒 server-derived manual；identity（publication/checkpoint/platform）不可改
- Post-Snapshot definition lock 落实：Brand+Platform 有真实 Snapshot 后，derived 的 numeratorKey/denominatorKey/format → 409；alias/meaning/caution/isActive 仍可改；Snapshot 后仍可新建 Custom Derived（创建即锁语义字段）
- UI：共享 `MetricSnapshotModal`（Studio Publication 卡片主入口 + Pipeline Drawer 次入口）；live derived preview 纯前端引擎；三态文案分离
- 无 migration；184 tests 通过
- 验收 fixtures 保留作 M2.4 baseline 样本：b03c0356（published：xhs 24h+72h 已提交、bili 24h+72h 已提交、douyin 无 snapshot）；710f90c0（scheduled 无 publication）

### M2.4 — Account / Pillar Baseline（Frozen，无 UI，API + smoke 验收通过）

- **Account Baseline** = same Brand + same Platform + same Checkpoint + historical Publications + latest ≤20（V1 无 PlatformAccount 实体，未扩 schema）
- **Pillar Baseline** = 以上 + same current Pillar；**两个窗口独立**（Pillar cohort 不从 Account 窗口派生）
- Historical cutoff：`candidate.publishedAt < target.publishedAt`（严格小于，同刻排除；target/未来自动排除）；recency = `publishedAt DESC, createdAt DESC, id DESC`；**snapshot.createdAt 不得作为 recency**（late entry 不插队）
- Raw baseline = metric-wise median over valid raw values；**Derived baseline = 先逐 candidate 计算 derived_i 再 median**，严禁 median(numerator)/median(denominator)（反例测试锁死）
- null 逐 metric 排除；真实 0 参与；`metric.sampleCount`（每指标独立）≠ `candidateCount`（cohort 窗口数）；sampleCount=0 → median null
- Median：奇取中、偶取两中值平均；全精度计算，presentation 才 format
- 主输出仅 active definitions；disabled 历史 key 不回写；custom derived 可对历史 raw 计算（缺依赖 → 该样本 N/A）
- Target 无 pillar → `{unavailable: "target_has_no_pillar"}`（不伪装计算）
- Capture provenance：`medianCaptureDeltaMinutes` 保留，无阈值排除
- **Runtime-only read model**：无 baseline table/cache/persistence；`GET .../baseline` 只读零写
- **publishedAt post-Snapshot 锁**：有 Snapshot 后 publishedAt 不可改（409），finalTitle/url/coverUrl/notes 仍可纠错；Edit modal 锁定 + 说明
- V1 limitation 正式接受：**Pillar Baseline 使用 Content 当前 pillarId，非发布时归属**
- 查询：target 1 RTT + 并行 [account, pillar?, definitions] ≈4 RTT，无 N+1
- 197 tests 通过；DEMO baseline fixtures（明确 [DEMO] 标记）验证数学正确性

### M2.5 — Analytics Core（Frozen，人工浏览器验收通过）

- **Analytics unit = Publication + Checkpoint**；Content 仅 grouping；禁止跨平台汇总（无 total views 等）
- M2.5 链 = **Fact → Baseline → Deterministic Comparison**；Interpretation/Diagnosis/Action 全属 M2.6+
- **无 AI**、无诊断文案、无质量评分、无 Needs Attention/Good/Bad；Direction 仅 above/below/equal 数学关系（MetricDefinition 无 quality direction semantics）；无红绿配色，mint 仅 emphasis
- Comparison：count 带符号 delta；**percentage 用百分点**（0.10 vs 0.08 → +2.0 pp，绝不 +2%）；ratio 纯单位（+2.5）；relativeDelta engine 保留但 UI 默认不显示；baseline=0/null → relative null；无 NaN/Infinity
- Baseline 呈现：每 metric 独立 `sampleCount`（n=）+ cohort `candidateCount` context；无 pillar → 明确 "Pillar baseline unavailable — no pillar assigned"；无历史 → "No historical {checkpoint} snapshots yet."
- **Fact 与 Baseline 独立 failure boundary**（`tryBaseline` helper）：baseline 失败 → Fact 保留 + 局部 "Couldn't load baseline. Retry"；**Retry 只调 M2.4 只读端点，不 refetch Fact**
- Default selection：最近有 snapshot 的 Publication；同 publication 内 72h > 24h；旧 72h 不压新 24h；全无 → null 不伪造
- Capture provenance：fact 显示 target/captured/偏移（中性）；baseline metadata 显示 median capture offset
- Quick Update 第三入口：复用 MetricSnapshotModal；**entry mode 由 checkpoint status 驱动**（due→create / submitted→edit / not_due→无）；edit 前必须先解析 authoritative snapshot（失败局部 Retry，永不 fallback create）；modal 按 `publicationId:checkpoint` key 隔离
- **Create 模式 unresolved input 渲染 blank**，不显示 fake zero；显式 0 与显式 N/A 语义不变
- 221 tests 通过

## Schema Changes

- 无。M2.1 完全使用 M0 已建 publications 表。
- Migration `0006_perfect_solo.sql`：metric_definitions + format 列 + UNIQUE(brand_id, platform, key)
- M2.3 无 migration（snapshot 表 M0 已完备）

## Important Files

- `lib/validation/publication.ts` — create/edit schema、prefillFinalTitle（Douyin 无 title → Content.title）、deriveCheckpoints、publicationProgress
- `lib/publication.ts` — markAsPublished / editPublication 领域服务
- `lib/review.ts` — aggregate 读含 publications；部分发布 scheduled 语义；globalUpstreamInvalidation 发布锁
- `app/api/contents/[id]/versions/[platform]/publication/route.ts` — POST（Mark as Published）/ PUT（纠错）
- `components/studio/publication-modal.tsx` — 共享 Mark as Published / Edit modal（Studio + Pipeline 同一组件）
- `components/studio/review-panel.tsx` — Publication 卡片 + 进度 + Edit 入口
- `components/studio/platforms-panel.tsx` — `isVersionEditable` 硬规则 + save-queue transition cleanup（statusRef 守卫）
- `app/app/pipeline/page.tsx` — Drawer publication 进度 + 入口
- `tests/publication.test.ts`（12）— 累计 159 tests

## Known Issues / Backlog

- **P2 — Supabase/Supavisor transient instability**：观察到瞬时连接异常（CONNECTION_CLOSED / 幻影 FK 报错），重试即恢复；非产品代码问题，除非可复现否则不按 bug 处理；建议评估 DATABASE_URL pooler 模式与 region
- **P3**: 服务端错误文案仍含 "in M1.5"——后续统一为 workflow-neutral wording；不单独为此扩大修改范围
- 继承 M1：P2 DB/部署拓扑延迟；S-01 legacy DEMO 数据；S-02 AI 输出语言策略

## Frozen Constraints（M2.1 新增）

- Publication 创建是唯一进入 published 的路径；Pipeline drag / 任意 PATCH 均不可达 published
- Published 列只显示真实 aggregate 满足的 Content
- Mark as Published 必须 Human Confirm；禁止自动 URL / 自动当前时间 / 自动 Publication
- Content published 后无 V1 回退路径

## Current DB State（M2.3 Freeze 时）

- brands: 1（single Brand invariant 成立）
- metric_definitions: 31（27 默认 + 4 个 disabled custom 验收遗留，保留作 disable-retain 示例）
- metric_snapshots: 4（真实验收数据，M2.4 baseline fixtures）
- publications: 3
- content_pillars: 3（AI Agent Tutorial / AI Tool Review / Workflow，均 active）
- contents: 4（1 published / 1 review / 1 scheduled / 1 planning；fixture 710f90c0 pillar=null）

## Deferred（M2.5 明确记录）

- **7d/30d Aggregate Overview**：需先冻结 checkpoint 选择 / 跨 publication / 跨平台聚合语义，且当前样本极少
- **Analytics Funnel**：optional raw（impressions/followers_gained）默认 inactive 且漏斗语义未冻结；不渲染 mostly-N/A pseudo-funnel

## Next

- M2.6 — Structured Diagnosis：Fact+Baseline+Evidence → AI structured proposal → Human Review → Save Diagnosis
