# LearnLoop AI

**From Learning Gaps to Lasting Growth.**

LearnLoop AI is an Education-track prototype for HackOverflow 10.0 — Aarohan, NIT Durgapur, built by Team Data Alchemists. It connects personalized learning with meaningful assessment through **Diagnose → Understand → Practice → Reassess → Track Improvement**.

> **Current milestone:** the student Python Fundamentals MVP and a fictional local assessment attempt flow are implemented and verified locally. The assessment flow covers published quiz delivery, server-side autosave/recovery, deadline-based expiry, idempotent scoring, and answer-key withholding before finalization. Production authentication, class assignment, cloud persistence, Gemini calls, teacher review/analytics, and production deployment are not implemented yet.

## Product scope

- **LearnLoop Learn:** Python Fundamentals diagnostics for variables, data types, conditionals, loops, functions and lists; concept-based feedback; targeted practice; fresh reassessment; evidence-based progress/history.
- **LearnLoop Assess:** teacher quiz authoring/publishing and local demo timed student assessments with server-backed autosave/deadlines; class assignments, teacher review, analytics, printable reports and CSV exports remain planned.
- **Future roles:** Student, Teacher and Organization Admin, with server-side authorization and PostgreSQL Row Level Security in configured cloud mode.

## Technology and data boundary

Next.js App Router 16.4, React 19, TypeScript 5.9, Tailwind CSS 4, Node `>=22.13.0`, pnpm `11.25.0`. The requested cloud target is Supabase Auth/PostgreSQL/RLS; the app also uses the official Google GenAI SDK dependency for the planned Gemini integration. The managed web server runs on port `3000`.

The dedicated Supabase project request was rejected because the selected organization had reached its two-active-project free-tier limit. No LearnLoop cloud project was created and no existing project was changed. Until that blocker is resolved, **local demo mode** stores fictional learning sessions and answers on the server using Node’s built-in `node:sqlite`. This Node module is experimental in the pinned Node release; the fallback is for local demonstration only, not shared production storage. No cloud synchronization, production sign-in/RLS, or Gemini request is verified. Do not enter real student or organization data.

## Deploy a demo to Vercel

The repository includes a Vercel-compatible **disposable demo mode**. It can host the current student-learning prototype, but it is **not a production multi-user service**: authentication and cloud persistence are not implemented, and in-memory SQLite data can reset or differ between serverless instances. Use fictional data only.

1. Push this repository to GitHub and import it at [Vercel](https://vercel.com/new).
2. Keep the detected Next.js framework and root directory defaults.
3. Add these environment variables for **Production, Preview, and Development**:
   - `DEMO_MODE=true`
   - `DEMO_DB_PATH=:memory:`
4. Deploy using the included `pnpm-lock.yaml`. The project pins Node 22.x and pnpm 10.x.
5. After deployment, open the site and `/api/health`. The health route should return `status: "ok"` and `mode: "local_demo"`.

Do not add real student information, production credentials, or a Gemini key for this demo. Do not set `DEMO_MODE=true` for a production service that needs durable or private learner records. For that, first configure a dedicated Supabase project, database migrations and RLS, authentication, and the cloud adapter; those pieces are not implemented yet.

## Local setup

```bash
pnpm install
pnpm dev
```

With no cloud credentials configured, development mode automatically shows the clearly labelled fictional demo. The local SQLite file is written under `data/` and ignored by Git. Optional local environment configuration may be copied from `.env.example`; keep `.env.local` private and do not add real learner data.

To reset the default local demo data, stop the dev server first, then run:

```bash
pnpm demo:reset
pnpm dev
```

The reset command only removes a database path inside the project’s `data/` directory. Restarting the server is required for a reset to take effect.

## Verification commands

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm build
pnpm test:integration
```

`pnpm test:integration` starts a temporary Next.js development server with a disposable SQLite database, checks eight page routes and the route manifest, then exercises diagnostic → saved-answer recovery → scoring → targeted practice → fresh reassessment → exact baseline comparison, including duplicate finalization and rejected post-completion edits. It uses fictional data only and cleans up its temporary database. Run it only when port `3000` is available.

## Current boundaries

- No teacher assessment authoring, timed quiz, class records, submission review, analytics, reports or exports are available yet.
- No production user accounts or role switching are available. Local progress belongs to one fixed fictional demo learner; it is not a multi-user auth system.
- No LearnLoop Supabase project exists, so cloud persistence, Supabase SSR authentication, PostgreSQL migrations/RLS and their security tests are blocked.
- No `GEMINI_API_KEY` is configured; student explanations currently use curated content. AI drafting/explanations are not live.
- No production deployment has been attempted; there is no live deployment URL.

## Project documentation

Start with [`AGENTS.md`](AGENTS.md), [`MEMORY.md`](MEMORY.md), [`plan.md`](plan.md), [`TODO.md`](TODO.md), [`tasks/PROGRESS.md`](tasks/PROGRESS.md), and [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md). Product, technical, schema, API, security, testing, demo, decision and known-issue documents are under `docs/`.

## Repository and delivery

Public GitHub project (user-approved): https://github.com/awakenedarpit/LearnLoop-AI. Preserve the managed Webdev `origin` and use a separate GitHub push remote. Push each meaningful verified milestone; do not force-push or commit secrets/local data. A public deployment URL will be added only after deployment succeeds.

## License

No project license has been selected yet. All rights remain with the project owner unless a license is added.
