# Technical Requirements — LearnLoop AI

## Current environment facts

The workspace is `/home/ubuntu/learnloop`, branch `main`; Node `v22.13.0`, pnpm `11.25.0`, Next.js `16.4.0`, React `19.3.0`, TypeScript `5.9.3`, Tailwind CSS `4.3.3`, managed runtime port `3000`. TypeScript host-managed diagnostics are registered. The managed Webdev project has `server:true`, `database:false`; its `origin` is Manus-managed.

The user explicitly approved keeping the GitHub repository `awakenedarpit/LearnLoop-AI` public. Before the first project push, the separate `github` remote still needs verification/configuration without replacing `origin`. Supabase project creation was rejected because the selected organization reached its two-active-project free-tier limit; no LearnLoop Supabase project was created or modified. No Gemini API key is configured.

## Stack and serving

- Next.js App Router, TypeScript, React, Tailwind CSS, accessible reusable UI.
- Node server routes on port 3000, bound to `0.0.0.0` in the managed Sandbox.
- **Local demo persistence:** Node's built-in `node:sqlite` via `DatabaseSync`, with a fictional question bank and server-side learning sessions/answers. The local SQLite file is ignored by Git. SQLite is experimental in the pinned Node 22 release; this is not shared production storage.
- **Cloud target (not connected):** Supabase Auth/PostgreSQL via `@supabase/ssr` and `@supabase/supabase-js`, once a dedicated project and protected configuration are available.
- **AI target (not connected):** Google GenAI SDK (`@google/genai`) with server-only Gemini Interactions API calls and curated fallbacks, once a protected key is available.
- Vercel-compatible source/build; deployment has not been attempted.

The browser calls relative same-origin routes. Correct answers/explanations are withheld from active learning responses and released only after session completion. Secrets and server-derived absolute URLs are not embedded in browser code.

## Implemented behavior

Phase 1 includes the shared responsive product shell; a Python Fundamentals question bank with three variants for each of six concepts; diagnostic sessions, confidence capture, saved answers, server scoring/gap analysis, curated hints/explanations, unseen gap-targeted practice, fresh reassessment linked to its actual diagnostic baseline, and a data-backed progress/history view. Local learning answers are persisted on the server; reload recovers saved answers. Production mode refuses the local demo adapter.

Teacher authoring/classes/timed tests, real authentication and roles, Supabase database/RLS, Gemini calls, teacher analytics/export, and deployment remain unimplemented.

## Environment variable names

See root `.env.example`; it contains empty placeholders only. Names include `DEMO_MODE`, `DEMO_DB_PATH`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `GEMINI_API_KEY`, and `GEMINI_MODEL`. Cloud values are not currently configured. Do not place secrets in chat, source, or public documentation; use protected project configuration when available. No service-role key is used by the current demo.

## Routes and modules

Implemented HTTP endpoints: `GET /api/health`; `GET|POST /api/learn/sessions`; `GET /api/learn/sessions/:sessionId`; `PUT /api/learn/sessions/:sessionId/answers/:questionId`; `POST /api/learn/sessions/:sessionId/complete`; `GET /api/learn/progress`. Full request contracts and unimplemented future routes are listed in `API_SPECIFICATION.md`.

Current source includes `app/` pages and handlers, `components/` shell/session/dashboard UI, `lib/learning/` question bank and pure scorer, `lib/db/demo-store.ts`, `lib/services/learning.ts`, `tests/learning-scoring.test.ts`, and demo/integration scripts. Supabase and teacher/AI modules remain planned.

## Build and dependency policy

Pin pnpm 11 in `package.json`; use `pnpm-workspace.yaml` `allowBuilds` decisions for required/blocked scripts. The nonfunctional native `better-sqlite3` package was removed after opening a database caused a reproducible segmentation fault; the implemented adapter uses Node's built-in SQLite instead. `public/manus-routes.json` is served and matches the page routes. TypeScript diagnostics were registered before application-source edits.

## Verification and blockers

Verified in the current workspace: `pnpm typecheck`, `pnpm test` (4 deterministic unit tests), `pnpm lint`, `pnpm build`, and `pnpm test:integration` (8 page routes plus student API lifecycle, save/recovery, answer-key withholding, scoring, duplicate finalization, rejection of post-completion edits, gap-targeted practice, fresh reassessment and linked comparison).

Not verified/blocked: Supabase migrations, authentication, RLS, shared persistence, Gemini provider requests, teacher assessment workflows, security/role-isolation tests, and production deployment. Do not claim these are live or passed.

## Official references consulted

- Supabase SSR client: https://supabase.com/docs/guides/auth/server-side/creating-a-client
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Gemini API key security: https://ai.google.dev/gemini-api/docs/api-key
- Gemini text generation: https://ai.google.dev/gemini-api/docs/text-generation
- Gemini Interactions API status/SDK: https://ai.google.dev/gemini-api/docs/interactions-overview
