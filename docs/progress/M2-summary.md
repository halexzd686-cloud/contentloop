# M2 Summary — Real Publication & Analytics（进行中）

> Status: M2.1 **Frozen**（人工浏览器验收通过）。下一步 M2.2 — Metric Definition Engine。
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

## Schema Changes

- 无。M2.1 完全使用 M0 已建 publications 表。

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

- **P3**: 服务端错误文案仍含 "in M1.5"（如 `Version status "published" cannot be edited in M1.5.`）——后续统一为 workflow-neutral wording；不单独为此扩大修改范围
- 继承 M1：P2 DB/部署拓扑延迟；S-01 legacy DEMO 数据；S-02 AI 输出语言策略

## Frozen Constraints（M2.1 新增）

- Publication 创建是唯一进入 published 的路径；Pipeline drag / 任意 PATCH 均不可达 published
- Published 列只显示真实 aggregate 满足的 Content
- Mark as Published 必须 Human Confirm；禁止自动 URL / 自动当前时间 / 自动 Publication
- Content published 后无 V1 回退路径

## Next

- M2.2 — Metric Definition Engine：Brand 级指标字典（raw/derived、公式、missing/zero 语义），不创建任何 MetricSnapshot
