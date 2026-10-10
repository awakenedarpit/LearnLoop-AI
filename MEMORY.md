# LearnLoop AI — Persistent Project Memory

**Last updated:** 2026-10-11

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
- Teacher quiz authoring, timed student attempt/autosave code, and a demo-only teacher analytics dashboard have been added on stacked feature branches; verification remains pending. Class assignment, production roles/auth, Supabase migrations/RLS, Gemini, print/CSV exports and deployment remain incomplete.
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


## Dated handoff — 2026-10-11 (teacher analytics)

1. **Implemented, not verified:** branch `feat/teacher-results-analytics` based on `feat/timed-quiz-autosave`. Added `lib/services/teacher-analytics.ts`, `app/api/teacher/analytics/route.ts`, `components/teacher-analytics-dashboard.tsx`, `app/teacher/analytics/page.tsx`, `app/teacher/analytics/analytics.css`, `tests/teacher-analytics.test.ts`; updated teacher entry link, route manifest and docs.
2. **Feature:** actual local demo attempt records power quiz counts, mean/high score, pass-rate indicator, recent submission list and question accuracy. Explicitly one fixed fictional learner; not class analytics or production authorization.
3. **PR:** PR #6 (`feat/teacher-results-analytics`) was merged into `feat/timed-quiz-autosave` on 2026-10-10; the analytics feature branch head is `f020f6a921b46c157a36df1e7fe511253fddd8db`. PR #7 adds teacher submission review, based on that analytics branch.
4. **Verification:** no tests, typecheck, lint, build, integration or browser check has been executed for this branch. No GitHub Actions workflow runs were returned; Vercel status was pending. Do not claim success or deployment.
5. **Next three actions:** (i) run checks and inspect diffs, especially sqlite schema/analytics aggregation; (ii) fix failures and update this handoff; (iii) review PR #6 and stacked assessment PRs in dependency order.


## Dated handoff — 2026-10-11 (teacher submission review)

1. **Implemented, verification pending:** branch `feat/teacher-submission-review`, based on `feat/teacher-results-analytics`. Added `lib/services/teacher-review.ts`, `app/api/teacher/review/route.ts`, `components/teacher-submission-review.tsx`, `app/teacher/review/page.tsx`, `app/teacher/review/review.css`, and `tests/teacher-review.test.ts`; updated analytics navigation, route manifest, README, TODO and progress notes.
2. **Feature:** demo submission inbox; quiz filter; attempt detail lookup; selected/correct answers, explanations, unanswered count, score and timestamp; print-friendly individual review.
3. **PR:** https://github.com/awakenedarpit/LearnLoop-AI/pull/7 (open), based on `feat/teacher-results-analytics`. Latest confirmed head at handoff update: `9eefe0935b5d1a99be78f0d9988e8cf40d00c288`.
4. **Verification:** no local test/typecheck/lint/build/browser checks were run. GitHub Actions workflow runs for this head were empty. Do not claim checks or deployment succeeded.
5. **Boundaries/blockers:** fictional local SQLite and one fixed demo learner; no teacher authentication/class authorization, access-denial or integrity-event review, durable cloud storage, or CSV export. Vercel demo needs `DEMO_MODE=true`; use fictional data only.
6. **Next actions:** run typecheck, lint, unit tests, build and integration tests on the combined branch; review UI and print behavior; resolve production auth/cloud prerequisites before real learner data.
