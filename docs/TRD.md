# Technical Requirements — LearnLoop AI

## Current environment facts

Current audit checkout is `/home/ubuntu/learnloop-audit`, branch `feat/assessment-http-integration`; Node `v22.13.0`, pnpm `11.25.0`, Next.js `16.4.0`, React `19.3.0`, TypeScript `5.9.3`, Tailwind CSS `4.3.3`, runtime port `3000`. The managed workspace lives separately at `/home/ubuntu/learnloop`.

The user approved the public GitHub repository `awakenedarpit/LearnLoop-AI`; active remote is `origin`, and pushes must be verified. Dedicated Supabase project LearnLoop (`rlglcgtamqwqzmkitdtn`, `ap-south-1`) is healthy. The live ledger has four migrations and 14 RLS-enabled tables (zero rows); migration 004 source is missing locally and local filename prefixes do not match ledger versions. Cloud repositories, live auth/member provisioning, and user-scoped RLS tests are incomplete. Five SECURITY DEFINER RPC warnings remain open. No Gemini API key is configured.

## Stack and serving

- Next.js App Router, TypeScript, React, Tailwind CSS, accessible reusable UI.
- Node server routes on port 3000, bound to `0.0.0.0` in the managed Sandbox.
- **Local demo persistence:** Node's built-in `node:sqlite` via `DatabaseSync`, with a fictional question bank and server-side learning sessions/answers. The local SQLite file is ignored by Git. SQLite is experimental in the pinned Node 22 release; this is not shared production storage.
- **Cloud foundation (in progress):** Supabase Auth/PostgreSQL via `@supabase/ssr` and `@supabase/supabase-js`; project/schema are provisioned. Assessment role gates resolve trusted membership in cloud mode, but data services still use SQLite. Do not enable for real data.
- **AI target (not connected):** Google GenAI SDK (`@google/genai`) with server-only Gemini Interactions API calls and curated fallbacks, once a protected key is available.
- Vercel-compatible source/build; no successful production deployment is verified.

The browser calls relative same-origin routes. Correct answers/explanations are withheld from active learning responses and released only after session completion. Secrets and server-derived absolute URLs are not embedded in browser code.

## Implemented behavior

Phase 1 includes the shared responsive product shell; a Python Fundamentals question bank with three variants for each of six concepts; diagnostic sessions, confidence capture, saved answers, server scoring/gap analysis, curated hints/explanations, unseen gap-targeted practice, fresh reassessment linked to its actual diagnostic baseline, and a data-backed progress/history view. Local learning answers are persisted on the server; reload recovers saved answers. Production mode refuses the local demo adapter.

Demo teacher quiz authoring, timed tests, review, analytics, and export are integrated and now HTTP-tested. Production class/organization administration, Postgres persistence, authenticated RLS behavior tests, Gemini calls, and deployment remain incomplete.

## Environment variable names

See root `.env.example`; it contains empty placeholders only. Names include `DEMO_MODE`, `DEMO_DB_PATH`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `GEMINI_API_KEY`, and `GEMINI_MODEL`. App cloud values and Gemini are not configured. Do not place secrets in chat, source, or public documentation; use protected project configuration. No service-role key is used by the current demo.

## Routes and modules

Implemented HTTP endpoints include `GET /api/health`, learner session/progress APIs, student quiz/attempt APIs, teacher quiz authoring/publish APIs, teacher review/analytics and CSV export. Full request contracts and cloud/data limitations are listed in `API_SPECIFICATION.md`.

Current source includes learning and assessment pages/routes, teacher/student services and UI, `lib/auth/` role-gate scaffold, `lib/supabase/` clients, local SQLite demo store, unit tests and HTTP integration scripts. Gemini provider code and Supabase-backed service repositories remain absent.

## Build and dependency policy

Pin pnpm 11 in `package.json`; use `pnpm-workspace.yaml` `allowBuilds` decisions for required/blocked scripts. The nonfunctional native `better-sqlite3` package was removed after opening a database caused a reproducible segmentation fault; the implemented adapter uses Node's built-in SQLite instead. `public/manus-routes.json` is served and matches the page routes. TypeScript diagnostics were registered before application-source edits.

## Verification and blockers

On `feat/assessment-http-integration`, `pnpm typecheck`, `pnpm lint`, `pnpm test` (20/20), expanded `pnpm test:integration` (learning and assessment flows), and `DEMO_MODE=true DEMO_DB_PATH=:memory: pnpm build` all passed.

Live project migrations, RLS flags, grants, policies and helpers were inspected read-only. Not verified: real-user auth/membership provisioning, effective RLS allow/deny behavior, PostgreSQL-backed application persistence, Gemini, class/admin operations, or production deployment. The teacher assessment flows remain local-only. Do not claim unverified paths are live or passed.

## Official references consulted

- Supabase SSR client: https://supabase.com/docs/guides/auth/server-side/creating-a-client
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Gemini API key security: https://ai.google.dev/gemini-api/docs/api-key
- Gemini text generation: https://ai.google.dev/gemini-api/docs/text-generation
- Gemini Interactions API status/SDK: https://ai.google.dev/gemini-api/docs/interactions-overview
