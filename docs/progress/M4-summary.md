# M4 Summary — Productization（进行中）

> Status: M4.0 Audit **Complete**；M4.1 **Frozen**（人工浏览器验收 A–O 通过）。下一步 M4.2 — Loop Continuity & Entry UX（未开始）。
>
> 前置：M3 Frozen（见 `M3-summary.md`）。

## Completed

### M4.0 — Productization Audit & Release Gap Analysis（Complete）

- 纯审计轮：E2E Journey Audit / Gap Register / Top 10 / Must-Should-Later / Scorecard / M4 分解
- 结论驱动 M4.1 范围：DEMO 数据信任、Manual Content 平台权威、Running Test 纠错、Content 误建恢复

### M4.1 — Data Trust & Correction Core（Frozen，浏览器验收 A–O 通过）

**DEMO 数据信任**

- Migration `0011`：`contents.is_demo` (boolean NOT NULL DEFAULT false) + `contents.primary_platform` (platform enum, NULL)，单 migration
- 一次性 exact fixture backfill：2 条 DEMO baseline fixture `is_demo=true`；2 条 signal-linked Content `primary_platform='xiaohongshu'`
- **Demo authority 只有 `contents.is_demo`**；runtime 严禁 title/notes 启发式（grep 审计通过）；`POST /api/contents` 注入 `isDemo` → 400
- Account/Pillar baseline cohort 一律 real-only（`eq(contents.isDemo, false)`）；demo target 的 Fact/Snapshot/Analytics 仍可读；无 demo-vs-demo baseline mode；median/null/zero 语义不变

**Content Primary Platform 权威**

- `contents.primary_platform` = 唯一 runtime Content platform authority；Signal.primaryPlatform 仅 create-time default / provenance；PlatformVersion 不是 Content identity
- Signal → Create Content flow 现在真正持久化 `primaryPlatform`
- Manual New Content（Studio）：title*/primaryPlatform*/pillarId?/ownerId*；server 拥有 brand/status=planning/sourceSignalId=null/isDemo=false；不建 Brief/Master/Version/fake Signal
- Legacy null→value 一次性修正：限 planning/in_progress/review/scheduled 且未归档；value→different 409；published 409；archived 409（先 Restore）；设后 UI 只读
- **M3.4 matcher 改读 `content.primaryPlatform`**，不再派生 Signal（本条取代 M3.4 Frozen 记录中的 Signal 派生描述）；legacy null 仅匹配 platform=null Learning

**Running Test Discard**

- `DELETE /api/tests/[id]`：仅 running（membership 有无均可），事务内先删 test_publications 再删 test；concluded 409；duplicate 404；无 cancelled/discarded 状态枚举；Publication/Snapshot/Diagnosis/Content/Learning 零变更
- UI：Running drawer 底部 danger "Discard Test" + 确认文案；Concluded 无控件

**Content Archive / Restore**

- Archive = `deletedAt=now`（workflow cleanup，非删除）；Restore 同 authoritative row，children 全保留
- 规则：`status != published` **且** `publicationCount = 0`（scheduled 有 Publication 也 409；任何真实 Publication 即 blocked）
- Studio 列表 Active / Archived 视图；archived 不进 Pipeline / Learning candidate / active workflow
- LearningApplication：archived 保留 provenance；"Currently applied to N" 仅计 applied 且 `deletedAt IS NULL`；Restore 后重新计入

**验收与清理**

- 浏览器验收 A–O 全部通过（baseline 隔离、manual create/match/apply、legacy 修正、discard、concluded guard、archive/restore、双重 archive guard）
- 验收 fixture 单事务清理（preflight 身份断言 + 事务内 post-condition 断言）；发现并按证据链判定 1 条浏览器侧重复 Manual Content（同名、当日验收窗口创建、持有验收 LearningApplication、零业务 children）一并清理
- Legacy `Our Content Workflow 2026` 恢复 `primary_platform=null`（仅此字段）
- 最终 DB：contents=6, archived=0, demos=2, publications=5, snapshots=6, tests/test_publications/learnings/applications=0；authoritative M1/M2 数据完整

## Schema Changes

- Migration `0011_young_expediter.sql`：contents + is_demo + primary_platform（含 exact fixture backfill）

## Important Files

- `lib/contents.ts` — manual create / platform correction / archive / restore domain
- `lib/validation/content.ts` — manualCreate / setPrimaryPlatform strict schemas
- `lib/metrics/baseline-service.ts` — real-only cohort filter
- `lib/learning-applications.ts` — matcher 读 Content.primaryPlatform
- `lib/tests.ts` + `app/api/tests/[id]/route.ts` — discardTest + DELETE
- `app/api/contents/` — list(?archived=) / manual create / primary-platform / archive / restore
- `app/api/settings/pillars/route.ts` — active pillars（表单）
- `app/app/studio/page.tsx` — New Content / Active-Archived / Archive-Restore / Set Platform
- `components/analytics/tests-section.tsx` — Discard Test
- `tests/correction.test.ts`（10）— 累计 325 tests

## Known Issues / Limitations

1. Legacy manual Content 在 Human correction 前 primaryPlatform 可为 null（仅匹配 platform=null Learning）
2. primaryPlatform 一旦设定，M4.1 不支持 value→different
3. Discarded running Tests 无 discard audit history
4. Archived Content 无 archive reason/history
5. Published / Publication-bearing Content 不可 Archive
6. Demo provenance 目前从 Content level 开始
7. P2 backlog：Content Detail 未明显展示 primaryPlatform（context visibility）
8. P2 backlog：Manual Content 的 Loop AI helper 仍写 "based on the linked signal..."（copy 修正，归 M4.2/M4.3）
9. Manual Content without linked Signal 的 platform authority 已由 M4.1 解决；M3-summary 中 M3.4 "Signal 派生" 描述被本条取代

## Frozen Constraints（M4.1 新增）

- Demo authority = `contents.is_demo`，无 runtime 字符串启发式
- Baseline cohort 永远 real-only
- Content platform authority = `contents.primary_platform`；Signal 不再 runtime 派生
- Archive 需 status != published 且 publicationCount = 0；永不 hard delete
- Discard 仅 running；concluded 永不可 discard；无 discard 状态枚举

## Next

- M4.2 — Loop Continuity & Entry UX（规划门未开）
