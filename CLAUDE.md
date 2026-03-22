# Zerogeist

A platform that builds and maintains a digital proxy for a person, sensing South Africa's emotional weather daily.

**Domain**: mzansi.zerogeist.me

## Stack

- Frontend: React 18 + Vite + Tailwind CSS v4 + wouter (routing)
- Backend: Express + TypeScript (tsx for dev, esbuild for prod)
- ORM: Drizzle ORM
- Database: Neon PostgreSQL
- Auth: Google OAuth via Passport.js (invite-only, admin via ADMIN_EMAIL env var)
- AI: Claude API (Anthropic) for daily question generation, answer processing, world snapshot analysis
- Hosting: Vercel (static frontend + serverless API)

## Key Commands

```bash
npm run dev          # Start dev server (Express on :5000, Vite on :5173)
npm run build        # Build frontend
npm run build:api    # Bundle server for Vercel (MUST run after any server change)
npm run db:push      # Push schema to Neon database
```

## Conventions

- Server imports use relative paths (`../shared/schema`), NOT `@shared` aliases
- Client imports use `@/` for `client/src/` and `@shared/` for `shared/`
- After ANY server-side change, run `npm run build:api`
- The `api/index.mjs` file is committed to git
- Use `cross-env` in npm scripts for Windows compatibility
- Admin is identified by ADMIN_EMAIL env var, NOT a database field
- The `person` table uses Google OAuth `sub` as the primary key (text, not uuid)

## Three Systems

1. **Admin** — invite management, source registry, platform health. Admin never sees proxy/question data.
2. **Person Settings** — the living proxy portrait. Values, tensions, unknowns, blind spots, overrides.
3. **Person Interface** — daily weather map (Mzansi) + daily question.

## Build Phases

- Phase 1 (Foundation): Schema, auth, admin CRUD, deployment — **DONE**
- Phase 2 (The World): Source integrations (Reddit, ReliefWeb, PMG), world snapshot generation, daily cycle
- Phase 3 (The Interface): Weather map with 3 layers, drill-downs, digest display
- Phase 4 (The Proxy): Question generation, answer processing, proxy updates, correction flow
- Phase 5 (Settings): Full proxy display, inline corrections, source weights

## Data Model

All tables defined in `shared/schema.ts`:
- person, invited_person, proxy, question
- world_snapshot, person_world
- source, person_source
- proxy_edit, daily_cycle_log, session
