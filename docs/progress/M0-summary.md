# M0 Summary — Foundation

## Completed

- Git repository initialized with small, behavior-tied commits
- Next.js 16 + TypeScript 5.6 + Tailwind CSS 4 project scaffold
- Design Tokens established (Canvas, Workspace, Ink, Mint, Semantic, Radius, Border, Motion durations)
- shadcn/ui base components: Button, Input, Card, Badge, Tabs, Dialog, Drawer
- `/dev/design-system` internal verification page (not in product navigation)
- Drizzle ORM schema: 20 core tables, 20 enums, all FKs, unique constraints, indexes
- Drizzle migration SQL generated (`db/migrations/0000_breezy_lilandra.sql`)
- Seed script with DEMO data (1 Brand, 3 Team Members, 3 Pillars, 3 Playbooks, 5 Signals, 3 Contents)
- App Shell with Sidebar (collapsed 68px / expanded 224px, 6 fixed nav items, mint active indicator)
- 6 placeholder routes: `/app`, `/app/radar`, `/app/studio`, `/app/pipeline`, `/app/analytics`, `/app/settings`
- Root `/` redirects to `/app`
- `.env.example` with Supabase PostgreSQL connection template

## Architecture Decisions

- **ORM**: Drizzle ORM (PostgreSQL-first, no Prisma)
- **Database**: Supabase as managed PostgreSQL only (no Auth, Realtime, Storage, Permissions, Multi-tenant)
- **Styling**: Tailwind CSS v4 with CSS-first `@theme inline` configuration (no tailwind.config.ts)
- **Fonts**: Inter (sans, primary) + Instrument Serif (serif, semantic accent)
- **Component library**: shadcn/ui as base skeleton, customized per design spec
- **App routing**: `/app` route group for main product, `/dev` for internal tools
- **TypeScript**: `skipLibCheck: true` to bypass drizzle-orm optional peer dependency type issues

## Schema Changes

- Initial schema: 20 tables, 20 enums
- Deferred tables (M2+): `content_version_history`, `metric_import_jobs`
- Unique constraints: `platform_playbooks(brand_id, platform)`, `platform_versions(content_id, platform)`, `publications(platform_version_id)`, `metric_snapshots(publication_id, checkpoint)`, `learning_applications(learning_id, content_id)`, `test_publications(test_id, publication_id)`
- Soft delete: `deleted_at` on `contents`, `signals`, `publications`

## Important Files

- `lib/db/schema.ts` — Drizzle schema (single file, 20 tables)
- `lib/db/index.ts` — Database connection (postgres-js driver)
- `drizzle.config.ts` — Drizzle Kit configuration
- `db/migrations/0000_breezy_lilandra.sql` — Initial migration
- `db/seed/index.ts` — Seed script
- `app/globals.css` — Design Tokens (CSS variables + Tailwind @theme)
- `app/layout.tsx` — Root layout with Inter + Instrument Serif fonts
- `components/layout/sidebar.tsx` — Sidebar navigation
- `components/layout/app-shell.tsx` — App Shell layout
- `components/ui/` — 7 base components (button, input, card, badge, tabs, dialog, drawer)
- `app/dev/design-system/page.tsx` — Design token verification page

## Known Issues

- None blocking

## Deferred

- `content_version_history` table (M1+)
- `metric_import_jobs` table (M2)
- Migration execution against live Supabase (requires `DATABASE_URL` in `.env`)
- Seed execution against live Supabase (requires `DATABASE_URL` in `.env`)

## Frozen Constraints

- 6 fixed navigation items: Home, Radar, Studio, Pipeline, Analytics, Settings
- Light theme only, no Dark Mode
- Platforms: Xiaohongshu, Bilibili, Douyin only
- No Auth, no multi-workspace, no multi-tenant, no permission system
- No automatic publishing, no platform API integration
- React Bits: only EchoText, HalftoneReveal, Prism allowed
- AI: Suggest → Prepare → Human Confirm (never autonomous)

## Next

M1 — Core Content Workflow (Day 3–8): Radar Signal CRUD → Studio Brief & Master → Platform Versions → Review → Pipeline
