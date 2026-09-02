# M3 Summary — Test & Learning Loop（进行中）

> Status: M3.1 **Frozen**（人工浏览器验收通过）。下一步 M3.2 — Result & Conclude。
>
> 前置：M2 COMPLETE（见 `M2-summary.md`）。

## Completed

### M3.1 — Test Core（Frozen）

- **Test identity = Brand + Platform + Primary Metric + Checkpoint**（Migration `0008`：`tests.platform` + `tests.checkpoint` NOT NULL + `CHECK (checkpoint IN ('24h','72h'))`，manual 禁用）
- Create Modal = Human review gate；Confirm Create → server 写入 `status=running`（schema 无 draft；client 不可提交 status/outcome/conclusion）
- **核心定义创建即锁**：platform / checkpoint / method / hypothesis / change / primaryMetricKey
- running 可改仅：title / keepConsistent / compareWith（strict PATCH 白名单；实测锁定字段 400）
- Publication membership：同 Brand + 同平台 + 真实 Publication；缺 checkpoint Snapshot 允许加入（UI 显示 "Awaiting {checkpoint} data"）；同 Test 同 Publication 唯一（DB unique + 409）；running 可 attach/detach；concluded 后 membership 与 metadata 全锁（409）
- Primary metric：创建时必须解析到同 Brand+Platform 的 **active** MetricDefinition（raw/derived 均可）；定义后续 disable 不影响既有 Test 读取
- 无 Cancel；`no_clear_result` 不得作为取消语义
- M3.1 无 Result / Conclude / Learning / AI / Diagnosis 集成；零 DeepSeek 调用
- 跨 milestone 边界：仅 tests / test_publications 变化，其余业务表零变更
- 浏览器验收 A–O 通过（含 attach 布局 clipping 修复、running 编辑模式）
- 两个人工验收 fixture 已在 Freeze 前清理（结构化字段与 prose 不一致，不适合作 M3.2 权威 fixture）

## Schema Changes

- Migration `0008_numerous_amazoness.sql`：tests + platform + checkpoint + 24h/72h CHECK

## Important Files

- `lib/validation/test.ts` — create/patch/attach strict schemas
- `lib/tests.ts` — Test domain service
- `app/api/tests/` — list/create、detail/patch、publications attach/detach
- `components/analytics/tests-section.tsx` — Tests 区块 + Create Modal + Detail Drawer（Edit 模式 + 两行 attach 布局）
- `tests/test-core.test.ts`（9）— 累计 278 tests

## Known Limitations

- tests 无 updatedAt/revision —— V1 单用户接受弱并发保护
- free-text hypothesis 可能与结构化 checkpoint/metric 不一致 —— 结构化字段权威，V1 不做 prose NLP 校验
- Result Evidence / Result Fingerprint 明确留 M3.2（届时需 migration：`tests.result_evidence` JSONB + `tests.result_fingerprint` TEXT）

## Frozen Constraints（M3.1 新增）

- Test 平台/检查点为身份组成部分，创建后不可变
- Test 单平台；结果比较只能用 Test.checkpoint
- outcome 枚举仅 win / trade_off / no_clear_result / loss（M3.2 才开放写入）
- 任何 conclude/cancel 都不在 M3.1

## Next

- M3.2 — Result & Conclude：resultEvidence + resultFingerprint + runtime observed result + deterministic readiness + Human conclusion
