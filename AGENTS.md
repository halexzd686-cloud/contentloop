# AGENTS.md — ContentLoop V1

> **Purpose**: Operating contract for all coding agents working on ContentLoop V1.  
> **Applies to**: Codex, Kimi Code, Claude Code, and any other coding agent.  
> **Project scope**: 3–5 person AI content operations workspace.  
> **Rule**: This file governs *how* the agent works. Product truth remains in the four source-of-truth documents.

---

# 1. Mandatory Source-of-Truth Files

Before implementing any task, read the relevant sections of:

1. `docs/ContentLoop_PRD_v1.md`
2. `docs/ContentLoop_data-model_v1.md`
3. `docs/ContentLoop_design_v1.md`
4. `docs/ContentLoop_implementation-plan_v1.md`

If these files are located elsewhere, resolve their real paths once, then continue using those paths.

## Conflict priority

Use this precedence:

- Product behavior / scope → `PRD`
- Entity / schema / relationship → `data-model`
- Layout / styling / interaction / motion → `design`
- Sequence / milestone / acceptance → `implementation-plan`

Do not invent a reconciliation that contradicts an explicit rule.

If two documents contain a genuine unresolved contradiction, stop implementation of the conflicting portion and report the conflict precisely.

---

# 2. Project Goal

ContentLoop is:

> A lightweight AI content operations workspace for a 3–5 person team.

The core loop is:

```text
Signal
→ Content
→ Platform Version
→ Publication
→ Metric Snapshot
→ Diagnosis
→ Test
→ Learning
→ Next Content
```

The project is successful only if this loop works with real content and real data.

Do not optimize for screenshots before this loop works.

---

# 3. Absolute Scope Boundaries

Do NOT add any of the following unless the user explicitly changes the specification:

- Multi-workspace / multi-tenant architecture
- Organization / enterprise hierarchy
- Complex permissions
- Full authentication system unless explicitly required for deployment
- Platform auto-publishing
- Platform OAuth integrations
- Automatic platform metric syncing
- Competitor crawler
- Full web crawler
- Independent Experiment Lab navigation
- Independent Knowledge Library navigation
- Global autonomous super-agent
- Multi-model routing UI
- Prompt editor
- Dark mode
- Full mobile Studio editor
- Video generation
- Video editing
- Full image-generation platform
- Advanced statistical significance engine
- Notifications center
- Comment threads
- Real-time collaborative editing
- Jira-style workflow states
- Additional social platforms beyond Xiaohongshu, Bilibili, and Douyin

If a library, template, or generated scaffold introduces these concepts automatically, remove or disable them.

---

# 4. Fixed Primary Navigation

The app navigation is fixed to:

```text
Home
Radar
Studio
Pipeline
Analytics
Settings
```

Do not create additional top-level entries for:

- Tests
- Learnings
- Calendar
- Publications
- AI
- Playbook

These functions live inside the six approved modules.

---

# 5. Work Method

For every non-trivial task, follow this loop:

## Step 1 — Read

Read only the relevant sections of the four source-of-truth documents.

Do not load unnecessary historical context.

## Step 2 — Inspect

Inspect the existing code before proposing changes.

Identify:

- existing components
- existing data model
- current conventions
- affected routes
- affected tests
- known constraints

Do not assume a blank project.

## Step 3 — Plan

Before implementation, produce a concise task plan containing:

```text
Goal
Files likely affected
Data/entities involved
UI/components involved
Acceptance criteria
Risks / unknowns
```

Keep the plan scoped to the current task.

## Step 4 — Implement

Implement only the approved task.

Prefer incremental edits over broad rewrites.

## Step 5 — Verify

Run relevant checks:

```text
lint
typecheck
build
tests
```

Also manually verify the specific business flow affected.

## Step 6 — Report

Return:

```text
Completed
Changed files
Verification performed
Known limitations
Next recommended task
```

Never say a task is complete if the relevant build/test path is broken.

---

# 6. Task Size Rule

A single agent task should usually be one of:

- one page capability
- one business flow
- one data relationship
- one analytics capability
- one UI subsystem
- one bug class

Good:

```text
Implement Signal creation and persistence.
```

Good:

```text
Implement 24h / 72h MetricSnapshot creation and display.
```

Bad:

```text
Build Radar, Studio, Analytics, database, AI and landing page.
```

If a task is too large, split it before coding.

---

# 7. No Silent Scope Expansion

Never add a feature because:

- "most SaaS apps have it"
- "this is best practice"
- "it may be useful later"
- "the component library already includes it"
- "future scaling may need it"

Prefer present requirements over speculative architecture.

The default answer to an unspecified feature is:

> Do not build it.

---

# 8. Data Model Rules

Maintain these boundaries:

## Signal

Represents:

> something that may become content.

## Content

Represents:

> the content project / mother object.

## PlatformVersion

Represents:

> the platform-specific editable expression.

## Publication

Represents:

> what was actually published.

## MetricSnapshot

Represents:

> real platform data at a checkpoint.

## Diagnosis

Represents:

> structured interpretation of real metrics.

## Test

Represents:

> an operational hypothesis being evaluated.

## Learning

Represents:

> a reusable conclusion confirmed and saved by a human.

## LearningApplication

Represents:

> whether a Learning actually influenced future Content.

Do not merge these objects for convenience.

---

# 9. Raw Data Rules

Never replace missing data with zero.

Use:

```text
null / N/A
```

when data is unavailable.

Example:

Wrong:

```json
{
  "impressions": 0
}
```

when impressions were not supplied.

Correct:

```json
{
  "impressions": null
}
```

Derived metrics must preserve source raw values.

---

# 10. Metric Rules

Derived metrics must:

- use explicit formulas
- identify numerator and denominator
- safely handle zero and null
- show `N/A` when calculation is invalid

Never infer the meaning of ambiguous team jargon.

If the UI shows a label such as:

```text
播赞比
赞阅比
```

also expose the actual formula in the Metric Definition.

Default baseline:

```text
Last 20 comparable posts
Median
```

Comparison scopes:

1. Account baseline
2. Content Pillar baseline

Do not add industry benchmarks unless explicitly requested and sourced.

---

# 11. AI Rules

AI is a helper, not the owner of state.

The canonical principle is:

```text
Suggest
→ Prepare
→ Human Confirm
```

AI must not autonomously:

- Approve Brief
- Accept rewrite
- Mark Human Review complete
- Publish
- Delete
- Modify Playbook
- Save Learning as authoritative
- Change official metric formulas

---

# 12. AI Structured Output

For AI outputs that affect product workflows:

- use structured schemas
- validate with Zod or equivalent
- reject malformed output
- retry or fail gracefully

Never write unvalidated LLM JSON directly into business tables.

Examples requiring schema validation:

- Signal analysis
- Topic Score breakdown
- Platform adaptation
- Content QA
- CSV field mapping suggestion
- Analytics diagnosis
- Test draft
- Learning draft

---

# 13. Evidence Rules

AI analysis should distinguish:

```text
Verified Fact
Community Information
Inference / Hypothesis
```

Analytics diagnosis must be grounded in:

- MetricSnapshot
- MetricDefinition
- Account baseline
- Content Pillar baseline

If evidence is insufficient, use:

```text
insufficient_evidence
```

Do not force a conclusion.

---

# 14. Studio Rules

Studio is a three-column editing workspace:

```text
Sources | Content Workspace | Loop AI
```

Main tabs are fixed:

```text
Brief
Master
Platforms
Review
```

The Brief must exist before formal content production.

AI rewrites must not silently overwrite user text.

Use:

```text
OLD
NEW
Accept
Reject
```

Human review remains mandatory before publishing readiness.

---

# 15. Pipeline Rules

Only these five top-level states are allowed:

```text
Planning
In Progress
Review
Scheduled
Published
```

Do not expose Studio internal stages as Pipeline columns.

One Content = one primary Kanban card.

Platform-specific status belongs inside the card/detail.

Key gates:

```text
Review → Scheduled
requires review checklist

Scheduled → Published
requires Publication Record
```

---

# 16. Publication Rules

Do not consider content published merely because a status was changed.

A real Publication requires:

- platform
- final title
- published_at
- URL

Optional:

- cover
- notes

A PlatformVersion is not a Publication.

---

# 17. Analytics Rules

Analytics should always present:

```text
Fact
→ Baseline
→ Interpretation
→ Action
```

Never reverse this hierarchy.

The AI panel must not visually dominate real metrics.

Supported checkpoint model for V1:

```text
24h
72h
manual
```

Do not introduce complex time-series infrastructure unless explicitly requested.

---

# 18. Diagnosis Contract

Diagnosis output is fixed to:

```text
What Happened
Evidence
Possible Reason
Confidence
Next Actions
```

Constraints:

- Evidence: max 3
- Possible Reasons: max 2
- Next Actions: max 3
- Confidence:
  - high
  - medium
  - low
  - insufficient_evidence

Do not produce long AI essays in the primary analytics UI.

---

# 19. Test Rules

Tests remain inside Analytics.

Do not create a new top-level module.

Supported methods:

```text
A/B
Sequential
Before / After
Content Comparison
```

Supported outcomes:

```text
Win
Trade-off
No Clear Result
Loss
```

Do not label every comparison as a statistically valid A/B test.

---

# 20. Learning Rules

A Test conclusion does not automatically become a Learning.

Flow:

```text
Test concluded
→ Generate Learning Draft
→ Human Edit
→ Save Learning
```

Learning may later be suggested in Studio based on:

- platform
- content pillar

Applying a Learning must create a LearningApplication record.

This relationship is important for proving the loop actually occurred.

---

# 21. Playbook Rules

Playbook is structured business configuration, not a raw prompt.

Fields:

```text
Voice
Title Style
Hook
Structure
CTA
Avoid
Good Examples
```

AI can generate a draft.

Human saves the rule.

Learning can be:

```text
Add as Rule
```

only after explicit confirmation.

No Playbook versioning in V1.

---

# 22. Design System Contract

Follow `ContentLoop_design_v1.md`.

Core visual direction:

```text
Editorial SaaS
75% Professional SaaS
20% Editorial
5% Experimental
```

Theme:

```text
Warm Paper + White
Mint accent
Sans primary
Serif semantic accent
Border-first
Medium density
```

---

# 23. Card Rule

Always follow:

```text
Object = Card
Information = Layout
```

Use cards for:

- Signal
- Content
- Publication
- Test
- Priority object

Do not wrap every KPI, section, and label in a card.

Avoid nested card stacks.

---

# 24. React Bits Contract

V1 only allows:

```text
EchoText
HalftoneReveal
Prism
```

Usage:

## EchoText
Landing and light success/page-entry feedback.

## HalftoneReveal
Radar high-value signals and landing discovery.

## Prism
Home intelligence and landing.

Not allowed:

```text
MetaBalls
Lanyard
other React Bits additions
```

unless the design specification changes.

---

# 25. Motion Contract

Three global timing groups:

```text
Fast        120–180ms
Normal      220–300ms
Expressive  400–650ms
```

Motion must communicate state.

Do not add:

- cursor trails
- full-screen particle backgrounds
- decorative continuous motion
- random card floating
- excessive spring effects

---

# 26. Loading / Empty / Error

Do not use generic UX when context can be explicit.

AI loading:

```text
Analyzing signal…
Comparing baseline…
Preparing diagnosis…
```

Empty:

```text
No performance data yet.
Publish content and add its 24h metrics here.
```

Error:

```text
We couldn’t map 3 columns automatically.
Review Mapping
```

Always preserve recoverability.

---

# 27. Responsive Contract

Primary:

```text
≥1280px
```

Must remain usable at:

```text
1024px
```

At narrower widths:

- collapse sidebar
- allow right panels to collapse
- convert Radar review panel to drawer if needed

Mobile does not need full Studio editing.

Do not redesign the product around mobile-first assumptions.

---

# 28. Implementation Milestones

Follow these milestones:

```text
M0 Foundation
M1 Core Content Workflow
M2 Real Publication & Analytics
M3 Test & Learning Loop
M4 Productization
```

Do not start M4 polish if the M3 full loop is broken.

---

# 29. Dogfooding Rule

Begin real use as soon as:

```text
Signal
→ Studio
→ Pipeline
→ Publication
```

works.

Do not wait for Landing or complete visual polish.

The goal is to discover product requirements from real operation, not from speculative design.

---

# 30. Context Management Protocol

This project must proactively manage long coding-agent conversations.

Do not wait until the context window is nearly full.

At the end of every milestone, create:

```text
docs/progress/M0-summary.md
docs/progress/M1-summary.md
docs/progress/M2-summary.md
docs/progress/M3-summary.md
docs/progress/M4-summary.md
```

Each summary must contain only:

```text
Milestone
Completed
Architecture decisions
Schema changes
Important file locations
Known issues
Deferred items
Next milestone
Frozen constraints
```

Do not include long implementation diaries.

---

# 31. When to Start a Fresh Agent Session

Start a new coding-agent conversation when any of these occur:

- milestone completed
- current context becomes noisy
- repeated misunderstandings occur
- major page/module changes
- agent begins referencing outdated decisions

New session context should include only:

```text
AGENTS.md
4 source-of-truth docs
latest milestone summary
current task
```

Do not paste the entire previous conversation.

---

# 32. Context Compression Rule

If compression is necessary, preserve in this order:

1. Frozen product constraints
2. Current architecture
3. Current database state
4. Completed milestone
5. Current task state
6. Known bugs
7. Next step

Discard first:

- brainstorming
- rejected alternatives
- old implementation plans
- verbose debugging transcripts
- repeated explanations

Never compress away an unresolved architectural decision.

---

# 33. Progress Summary Template

Use:

```md
# Mx Summary

## Completed
- ...

## Architecture Decisions
- ...

## Schema Changes
- ...

## Important Files
- ...

## Known Issues
- ...

## Deferred
- ...

## Frozen Constraints
- ...

## Next
- ...
```

Keep the file concise.

---

# 34. Before Changing Architecture

If a task appears to require changing:

- primary entity relationships
- Pipeline states
- navigation
- platform scope
- analytics baseline model
- test model
- learning loop
- design system

do not silently modify the architecture.

Report:

```text
Current constraint
Why the task conflicts with it
Minimal alternatives
Recommended option
```

Wait for a decision if the change is genuinely architectural.

---

# 35. Refactor Policy

Refactor when:

- duplicated logic creates real bugs
- schema contract is violated
- current implementation blocks the next approved milestone
- tests prove behavior is unsafe

Do not refactor because:

- another architecture is prettier
- a new library is trendy
- generated code can be “cleaner”
- speculative scale may need it later

Prefer local refactors.

---

# 36. Dependency Policy

Before adding a dependency, ask:

```text
Can the current stack already solve this?
```

Add a library only when it materially reduces complexity.

Avoid multiple libraries solving the same concern.

Examples:

- one icon library
- one motion library
- one chart library
- one ORM

Do not add libraries just for one small visual effect.

---

# 37. Security / Secrets

Never hardcode:

- API keys
- database passwords
- service-role keys
- model credentials

Use environment variables.

Never commit `.env` values.

If seed/demo data includes URLs, do not use private links.

---

# 38. Development Data

Use explicit labels:

```text
DEMO
LIVE
```

Do not silently mix synthetic metrics into real analytics.

Demo data must be logically coherent.

Real data must never be altered to make screenshots look better.

---

# 39. Git Working Rules

Prefer small commits tied to behavior.

Examples:

```text
feat(radar): add signal creation flow
feat(studio): persist approved content briefs
feat(analytics): add median baseline calculation
fix(metrics): return N/A for missing denominator
```

Avoid:

```text
update
fix
changes
final
```

Do not bundle unrelated features in one commit.

---

# 40. Definition of Done — Task

A task is done only when:

- feature works
- state persists correctly
- types pass
- validation exists where required
- relevant tests pass
- loading / error state is reasonable
- UI follows design spec
- no extra scope was introduced

---

# 41. Definition of Done — Milestone

A milestone is done only when:

- its acceptance path works end-to-end
- build passes
- relevant tests pass
- milestone summary is created
- known limitations are documented
- architecture changes are recorded
- frozen decisions are explicit

---

# 42. Definition of Done — V1

V1 is complete only when the following real flow works:

```text
Signal
→ Analyze
→ Create Content
→ Brief
→ Content Master
→ Platform Version
→ Human Review
→ Pipeline
→ Real Publication
→ 24h / 72h Metrics
→ Baseline
→ Diagnosis
→ Test
→ Learning
→ New Content
→ Apply Learning
```

UI completeness alone does not satisfy V1.

---

# 43. Final Agent Behavior

When uncertain, optimize for:

```text
smaller scope
clearer data
more explicit evidence
human control
real usability
```

Not for:

```text
more features
more AI
more abstraction
more animation
more automation
```

The correct question is always:

> Does this help a 3–5 person content team make a better real content decision?

If not, do not build it.

---

**End of AGENTS.md — ContentLoop V1**
