# LearnLoop AI — Persistent Project Memory

**Last updated:** 2026-10-10

## Goal and scope

Build an Education prototype for Team Data Alchemists at HackOverflow 10.0 — Aarohan, NIT Durgapur. Core loop: Diagnose → Understand → Practice → Reassess → Track Improvement. Full scope includes student Python learning, teacher/class assessments, reliable server saves/deadlines, review/analytics/reports, production roles, AI assistance, durable Supabase persistence and reproducible fictional demo data.

## Stack and architecture

- Next.js App Router 16.4.0, React 19.3.0, TypeScript 5.9.3, Tailwind CSS 4.3.3; Node `v22.13.0`; pnpm `11.25.0`.
- Managed server capability on port 3000; managed database disabled; host-managed TypeScript diagnostics registered.
- **Implemented local fallback:** server-side Node `node:sqlite` with fictional learning data. `node:sqlite` is experimental in this Node release; local demo is not production/shared/cloud storage and is disabled in production. Do not enter real student data. Browser storage is not authoritative for saved answers.
- **Cloud target, not connected:** Supabase Auth/PostgreSQL/RLS. Dedicated project creation is blocked by the selected organization's two-active-project free-tier limit. No project created; no existing project modified.
- **AI target, not live:** Gemini via protected server-side key; no `GEMINI_API_KEY` configured.
- Design: calm editorial learning console, neutral surfaces, blue/lavender accents, custom double-loop SVG mark.

## Verified implementation status

- Phase 1 student Learning MVP: diagnostic across variables/data types/conditionals/loops/functions/lists; 3 question variants per concept; confidence field; safe active-session response; server-side saves/recovery; score/gap analysis; curated hints/explanations; unseen targeted practice; fresh reassessment linked to actual diagnostic; server-rendered progress/history; honest comparison.
- Assessment, teacher/class workflows, production roles/auth, Supabase migrations/RLS, Gemini, exports and deployment remain incomplete.
- Verified commands: `pnpm typecheck` PASS; `pnpm test` PASS (4 unit tests); `pnpm lint` PASS; `pnpm build` PASS; `pnpm test:integration` PASS (8 routes + full local student flow). Full detail is in `tasks/PROGRESS.md` and `docs/TESTING_PLAN.md`.
- No public deployment URL exists.

## Important paths

`plan.md`, `TODO.md`, `AGENTS.md`, `README.md`, `MEMORY.md`, `.env.example`, `app.config.ts`, `app/`, `components/`, `lib/learning/`, `lib/db/demo-store.ts`, `lib/services/learning.ts`, `tests/learning-scoring.test.ts`, `scripts/`, `docs/`, `tasks/`, `public/learnloop-mark.svg`, `public/manus-routes.json`.

## Git and integrations

- Workspace `/home/ubuntu/learnloop`; branch `main`; initial managed scaffold `f594498` (`Initial project scaffold`). Preserve managed Webdev `origin`.
- User-approved public GitHub target: `https://github.com/awakenedarpit/LearnLoop-AI`. Source/docs milestone push is still pending. Verify `github` remote and repo before push; do not overwrite `origin`.
- Supabase project creation failed due to the free-tier active-project limit. Retry only after user resolves it, then recheck current price/quota. Do not touch unrelated Supabase projects or billing.
- Gemini key is absent. Never ask for it in chat or commit secrets; use a protected input flow if configured.

## Dated handoff — 2026-10-10

1. **Completed:** requirement/task docs and design plan; Next.js/TypeScript app shell; route manifest; student learning APIs/UI; local demo SQLite via Node builtin; scoring/catalog unit tests and full HTTP integration verifier; data-driven history/progress; global loading/error/not-found; plan/docs refreshed.
2. **In progress:** inspect Git status/remotes, scan for secret/PII, commit and push verified source/docs to managed `origin` and the approved public GitHub mirror; confirm SHA/refs. Then build Phase 2 local demo assessments without claiming production auth.
3. **Files changed:** inspect `git status` for exact list. Core source includes `app/`, `components/`, `lib/learning/`, `lib/db/`, `lib/services/`, `tests/`, `scripts/`, package/lock/config, `public/manus-routes.json`, project docs.
4. **Tests:** `pnpm typecheck`, 4 unit tests, `pnpm lint`, `pnpm build`, `pnpm test:integration` all passed. Integration verified server saves/recovery, answer-key withholding, scoring, idempotency, final-state immutability, unseen practice, fresh reassessment and the linked score delta.
5. **Commit/push:** no new milestone commit/push verified yet. Previous managed scaffold: `f594498`.
6. **Next three actions:** (i) public-content audit + dual push + verify refs; (ii) implement teacher timed-assessment MVP within demo-only boundary; (iii) run checks and persist actual milestone status.

Never put secrets or credentials in memory. Keep statuses aligned with actual source and test evidence.
