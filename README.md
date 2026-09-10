# ContentLoop V1 — Technical Runbook

A lightweight AI content operations workspace for a 3–5 person team
(Signal → Content → Platform Version → Publication → Metrics → Diagnosis
→ Test → Learning → next Content).

Product truth lives in `docs/`; agent operating contract in `AGENTS.md`;
milestone history in `docs/progress/`.

## Requirements

- Node.js 20+ and pnpm
- A PostgreSQL database (Supabase recommended; any Postgres 14+ works)
- Optional: DeepSeek API key (AI features degrade to manual workflow without it)

## Install

```bash
pnpm install
```

## Environment

```bash
cp .env.example .env
# fill in DATABASE_URL (required) and AI_API_KEY (optional)
```

All variables are server-only. See `.env.example` for the exact list —
there are no `NEXT_PUBLIC_*` variables and no other secrets.

## Database Setup

ContentLoop uses Supabase as managed PostgreSQL only (no Supabase Auth,
Realtime, or Storage). Create a project, copy the connection URI into
`DATABASE_URL`. The Supabase pooler URI works for both runtime and
migrations.

## Migrations

```bash
pnpm db:migrate    # apply committed migrations (db/migrations 0000–0011)
```

`db:generate` / `db:push` are development tools for schema work; releases
use committed migrations only.

## Bootstrap Seed

```bash
pnpm db:seed       # required bootstrap: Brand, Team Members, Pillars,
                   # Playbooks, Metric Definitions
```

Idempotent — re-running changes nothing (a workspace with an existing
Brand is considered bootstrapped).

## Optional Demo Seed

```bash
pnpm db:seed:demo  # optional: demo Signals/Contents + two published
                   # DEMO baseline fixtures with 24h metrics
```

Also idempotent. All demo Content rows carry `isDemo=true` (the only demo
authority); demo metrics are preset exploration values, never real
performance, and are excluded from operational baseline cohorts.

## Development

```bash
pnpm dev           # Next.js dev server
pnpm test          # vitest
pnpm lint
pnpm typecheck
```

## Production Build

```bash
pnpm build
```

## Production Start

```bash
pnpm start         # serves the production build
```

## AI Configuration

DeepSeek official API (OpenAI-compatible), server-only key. Requests time
out at 60s. Without a valid key the UI shows a sanitized message and every
manual workflow remains fully available. AI never writes authoritative
state without human confirmation.

## Demo Data

`db:seed:demo` data is for product exploration only. Remove it by
resetting the demo database (below); there is no in-app demo deletion.

## Deployment

Primary: **Vercel** — set `DATABASE_URL` (+ optional `AI_*`) in project
env, deploy the Next.js app as-is. AI routes declare `maxDuration = 60`
(matching the provider timeout); Hobby plans support up to 60s — if your
plan caps lower, long AI requests may be cut off at the platform edge.

Fallback: **Docker/VPS + `pnpm build && pnpm start`** behind your own
access-control layer — no platform time limit, you manage protection.

Whichever target: the database is Supabase PostgreSQL over the pooler URI.

### Access protection

V1 has no application login. For an online demo, put the deployment behind
hosting-level access control (e.g. Vercel Password Protection / your
reverse proxy's auth). Verify the protection is actually enabled on your
plan before exposing a writable workspace.

## Security Warning

ContentLoop V1 does **not** include application-level authentication or
authorization. Every write API is unauthenticated by design (single-team
private tool).

- Do not expose a writable ContentLoop workspace to the public internet
  without an external access-control layer.
- Human confirmation in ContentLoop is a workflow boundary (AI proposes,
  humans confirm), **not** identity authentication.
- Never commit `.env`; `.env.example` contains placeholders only.

## Demo Database Reset

To reset a **demo** database (never your production workspace):

1. Drop and recreate the database (or use your provider's backup/export
   first if anything matters).
2. `pnpm db:migrate && pnpm db:seed && pnpm db:seed:demo`

There is no in-app reset feature.
