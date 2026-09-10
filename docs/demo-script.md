# ContentLoop Demo Script

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
