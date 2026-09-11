# ContentLoop 演示脚本（中文版）

同一条闭环故事的两种讲法。请在演示库上演示
（`pnpm db:migrate && pnpm db:seed && pnpm db:seed:demo`），
绝不在真实工作区上演示。

> 演示指标是用于产品体验的合成示例，不是真实投放成绩，也不进入运营基线——
> 在纯演示库上，基线正确地显示为 N/A。

---

## A. 面试简版（2–3 分钟）

**开场（15 秒）**——说：
"大多数 AI 内容工具止步于生成。ContentLoop 把'发布之后发生了什么'
接回到'下一步做什么'。"

**1. 首页** —— 屏幕：首页
- 点击："待处理"里的待录入数据卡片
- 说："它知道这条发布的 24 小时数据点到了，直接带我过去。"
- 为什么：这是运营入口，不是数字看板。
- 避免：逐条念卡片。

**2. 数据复盘** —— 屏幕：数据复盘详情
- 点击：先不点——指着"当前值"和中位数
- 说："先看事实——数字，再看我们自己历史的中位数。从来不是行业均值。在演示库里中位数是 N/A，因为演示数据不进运营基线。"
- 为什么：数据信任是产品的骨架。
- 避免：把演示数字说成真实成绩。

**3. 表现诊断** —— 屏幕：同上，右栏
- 点击：AI 分析表现 → 展示提案 → 保存
- 说："AI 在只读证据之上提出解读。我编辑后保存——或者放弃。没有东西会自己写入。"
- 为什么：AI 边界，看得见。
- 避免：跳过"人确认"这一步。

**4. 运营测试 → 运营经验** —— 屏幕：数据复盘 · 运营测试区
- 点击：基于此诊断创建运营测试 →（时间够就完整走完，否则打开一个已完成的）→ 保存运营经验
- 说："运营测试是人对已发布内容证据的对比判断，不是统计实验。结论是我下的。经验是我选择留下的。"
- 避免：暗示统计显著性。

**5. 下一条内容** —— 屏幕：内容工作台 → 任一条目 → 内容简报 → 运营经验
- 点击：应用这条经验
- 说："应用只是把这条经验标记为参考——它不会改写任何内容。闭环完成：表现成了下一次创作的依据。"
- 为什么：整个产品主张就在这一次点击里。

**收尾（15 秒）**——说：
"从线索到内容、到数据、到经验、再到下一条内容——每一步都是人在做决定。"

---

## B. 完整演示（5–8 分钟）

同一条故事线，更多深度。每步格式：屏幕 / 点击 / 说 / 为什么 / 避免。

**1. 选题雷达** —— 屏幕：选题雷达
- 点击：一条"新线索" → AI 分析线索 → 看分析（评分、证据分层、可选角度）
- 说："选题雷达把零散线索变成有依据的决定。AI 给出带证据分层的评估——哪些是事实、哪些是推断——决定由我来做。"
- 为什么：漏斗顶端的决策质量。
- 避免：把评分说成结论。

**2. 创建内容** —— 屏幕：快速评估
- 点击：选用 → 创建内容 → 确认平台/角度/负责人
- 说："选用一条线索就会创建一个内容项目，线索本身保留为来源。"
- 避免：纠结表单字段。

**3. 内容简报** —— 屏幕：内容工作台 · 内容简报
- 点击：可选 AI 生成简报草稿 → 应用/放弃 → 确认内容简报
- 说："八个字段逼着你先想清楚'为什么做'再动笔。AI 可以起草，确认的是我。"
- 为什么：先简报后生产是真实的门槛。
- 避免：逐字念八个字段。

**4. 母稿 → 平台版本** —— 屏幕：内容母稿 → 平台版本
- 点击：继续写母稿 → 平台版本 → AI 适配平台版本 → 接受
- 说："母稿与平台无关。适配会清楚展示改了什么——修改前对修改后——我接受或拒绝。"
- 避免：让对照页一闪而过。

**5. 审核 → 内容流程** —— 屏幕：审核 → 内容流程
- 点击：完成五项清单 → 审核通过并待发布 → 去内容流程查看
- 说："审核只能由人完成，这是设计。'待发布'意味着真的准备好发布了。"
- 避免：拖拽卡片却不讲门槛。

**6. 发布记录** —— 屏幕：内容流程卡片（演示库）
- 点击：标记已发布（用示例链接）
- 说："发布记录是一个事实：发了什么、什么时候、在哪。只改状态永远不算发布。"
- 避免：使用真实账号链接。

**7. 录入数据** —— 屏幕：内容流程或数据复盘
- 点击：录入 24h 数据（演示 fixture 已带，打开即可）
- 说："数据在发布后约 24、72 小时读取。留空是没录入，N/A 是本次没有，0 是真的 0。千位逗号没问题——18,600 直接能录。（这是真实 dogfood 修过的问题。）"
- 避免：含糊带过"留空/N/A/0"的区别。

**8. 数据复盘 + 表现诊断** —— 同简版，加一句：
- 说："基线是咱们自己可比历史的中位数。演示数据不进基线。"
- 避免：展开讲公式——悬停看公式预览即可。

**9. 运营测试 → 运营经验 → 应用** —— 同简版。

**收尾（20 秒）**——说：
"一个闭环，诚实地跑完：选题、创作、发布、度量、沉淀、再来一次——AI 辅助，人做决定。"

---

## Dogfood 备注（面试追问用）

一次外部 proxy 功能 dogfood（M5.3A）端到端验证了完整闭环，
并自然暴露了两个真实可用性问题，均已修复：

- **D01** —— 运营同学自然会带千位逗号贴数据（"18,600"）；手动录入现已支持严格分组，乱分组有字段级提示。
- **D02** —— 冷启动诊断在没有可比历史时曾误报"没有指标证据"；现在明确区分"指标已记录"与"比较证据不可用"。

真实发布 dogfood（M5.3B）仍在进行中——被问到时如实说明。

## 截图槽位（最终视觉定稿后截取）

预留：首页 · 选题雷达（feed + 快速评估）· 内容工作台（三栏）· 内容流程（看板）· 数据复盘（指标 + 诊断）· 测试/经验闭环。视觉定稿前不截取。

---

# ContentLoop Demo Script (English reference)


Two versions of one closed-loop story. Run against a demo database
(`pnpm db:migrate && pnpm db:seed && pnpm db:seed:demo`), never against a
real workspace.

> Demo metrics are synthetic examples for product exploration. They are
> not real campaign results and are excluded from operational baseline
> cohorts — on a demo-only database, baselines correctly show N/A.

---

## A. Interview demo (2–3 minutes)

**Opening (15s)** — say:
"Most AI content tools stop at generation. ContentLoop closes the loop
between what you publish and what you do next."

**1. Home** — Screen: Home
- Click: the due-metrics card under Needs Attention
- Say: "It knows this publication's 24-hour checkpoint is due and takes me straight to it."
- Why: operational entry, not a dashboard of vanity numbers.
- Avoid: reading every card aloud.

**2. Analytics** — Screen: Analytics detail for the DEMO journey publication
- Click: nothing yet — point at Current vs medians
- Say: "Facts first — the numbers, then your own historical median for context. Never an industry average. On a demo database the median is N/A, because demo data never enters operational baselines."
- Why: data trust is the product's backbone.
- Avoid: pretending the demo numbers are real results.

**3. Diagnosis** — Screen: same, right panel
- Click: Generate Diagnosis → show the proposal → Save
- Say: "AI proposes an interpretation on top of read-only evidence. I edit and save it — or discard it. Nothing writes itself."
- Why: AI boundary, visible.
- Avoid: skipping the human-confirm step in the story.

**4. Test → Learning** — Screen: Analytics, Tests section
- Click: Create Test from this diagnosis → (quickly create/conclude if time allows, else open an existing concluded one) → Create Learning → Save
- Say: "A test is a human-defined comparison against published evidence — not a statistics engine. The conclusion is mine. The learning is what I choose to keep."
- Avoid: implying statistical significance.

**5. Next Content** — Screen: Studio → any eligible demo content → Brief tab → Learnings
- Click: Apply on the learning
- Say: "Applying marks it as a reference for this content — it does not rewrite anything. The loop closes: what happened changed what I do next."
- Why: the entire product thesis in one click.

**Closing (15s)** — say:
"Signal to content to metrics to learning to the next piece — with humans in control at every step."

---

## B. Full product demo (5–8 minutes)

Same story, more depth. Each step: Screen / Click / Say / Why / Avoid.

**1. Radar** — Screen: Radar
- Click: a Signal in `new` → Analyze Signal → review the analysis (score, evidence tiers, angles)
- Say: "Radar turns raw leads into deliberate decisions. AI evaluates with evidence tiers — verified facts versus inference — and I decide."
- Why: decision quality at the top of the funnel.
- Avoid: presenting the score as a verdict.

**2. Create Content** — Screen: Radar quick review
- Click: Select → Create Content → confirm platform/angle/owner
- Say: "Selecting a signal creates a content project — the signal stays as provenance."
- Avoid: dwelling on form fields.

**3. Brief** — Screen: Studio, Brief tab
- Click: optionally Generate Draft Brief → Apply/Discard → Approve Brief
- Say: "Eight fields that force the 'why' before writing. AI can draft; I approve."
- Why: brief-before-production is a real gate.
- Avoid: reading all eight fields.

**4. Master → Platform version** — Screen: Studio, Master → Platforms
- Click: Continue to Master → then Platforms → Adapt from Master with AI → Accept
- Say: "The master is platform-agnostic. Adapting shows me exactly what changes — OLD versus NEW — and I accept or reject."
- Avoid: letting the diff scroll by unexplained.

**5. Review → Pipeline** — Screen: Review tab → Pipeline
- Click: complete the five-item checklist → Approve for Publishing → View in Pipeline
- Say: "Review is human-only by design. Scheduled means ready to publish for real."
- Avoid: dragging cards without narrating the gate.

**6. Publication** — Screen: Pipeline card (demo DB) 
- Click: Mark as Published (use a synthetic URL)
- Say: "A publication is a recorded fact: what, when, where. Status alone never counts as published."
- Avoid: using a real channel's URL.

**7. Metrics** — Screen: Pipeline or Analytics
- Click: Enter 24h Metrics on the DEMO journey publication (already seeded; just open it)
- Say: "Snapshots are read at about 24 and 72 hours. Blank means not recorded, N/A means unavailable, zero means zero. Commas are fine — eighteen-thousand-six-hundred with a comma just works." *(This was a real dogfood fix.)*
- Avoid: hand-waving the blank/N-A/zero distinction.

**8. Analytics + Diagnosis** — as in the short version, plus:
- Say: "Baselines are medians of our own comparable history. Demo content is excluded from them."
- Avoid: overexplaining formulas — hover the formula preview instead.

**9. Test → Learning → Apply** — as in the short version.

**Closing (20s)** — say:
"One loop, honestly closed: decide, create, publish, measure, learn, repeat — AI assists, humans decide."

---

## Dogfood notes (for interview follow-ups)

An external-proxy functional dogfood (M5.3A) validated the complete loop
end-to-end and surfaced two real usability findings, both fixed:

- **D01** — operators naturally paste metrics with thousands separators
  ("18,600"); manual entry now accepts strict grouping, with field-level
  guidance on malformed input.
- **D02** — a cold-start diagnosis with no comparable history used to say
  "No metric evidence recorded" while metrics were clearly recorded; it
  now distinguishes recorded metrics from unavailable comparison evidence.

Real-publication dogfood (M5.3B) is still pending — say so if asked.

## Screenshot slots (after the final visual pass)

Reserved for post-M5.6 capture: Home · Radar (feed + quick review) ·
Studio (three columns) · Pipeline (board) · Analytics (metrics +
diagnosis) · Tests/Learning loop. Do not capture before M5.6.
