# ContentLoop — Coding Agent Bootstrap Prompt

You are implementing **ContentLoop V1**, a lightweight AI content operations workspace for a 3–5 person team.

Before making any code changes:

1. Read `AGENTS.md`.
2. Read the relevant sections of:
   - `docs/ContentLoop_PRD_v1.md`
   - `docs/ContentLoop_data-model_v1.md`
   - `docs/ContentLoop_design_v1.md`
   - `docs/ContentLoop_implementation-plan_v1.md`
3. Inspect the current repository state. Do not assume the project is blank.
4. Identify the current milestone from `docs/progress/` if milestone summaries exist.

## Operating rules

- Do not expand product scope.
- Do not add unrequested SaaS conventions.
- Do not change core architecture silently.
- Keep Signal, Content, PlatformVersion, Publication, MetricSnapshot, Test and Learning as distinct entities.
- AI may suggest and prepare; humans own approvals and publishing.
- Real metrics and baseline evidence take priority over AI opinion.
- `null` means unavailable data; do not silently convert missing metrics to zero.
- Follow the Editorial SaaS design system exactly.
- Only EchoText, HalftoneReveal and Prism are approved React Bits effects in V1.
- Do not build Dark Mode, multi-workspace, enterprise permissions, automatic publishing, platform metric APIs, multi-model routing, or a global autonomous super-agent.
- Keep each task narrow.

## For the current task

First respond with:

```text
Current milestone:
Goal:
Relevant source-of-truth sections:
Files likely affected:
Entities/data involved:
UI/components involved:
Acceptance criteria:
Risks/unknowns:
```

Then implement only the requested task.

After implementation:

1. Run relevant lint/typecheck/build/tests.
2. Report:
   - Completed
   - Changed files
   - Verification performed
   - Known limitations
   - Recommended next task
3. If a milestone is complete, create/update its concise `docs/progress/Mx-summary.md`.

Do not start a later milestone merely because there is remaining context or time.

The core product loop that must eventually work is:

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

Build the loop before the polish.
