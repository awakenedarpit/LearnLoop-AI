# Changelog

## Unreleased — 2026-10-10

- Created the user-approved public `awakenedarpit/LearnLoop-AI` repository and initialized the managed LearnLoop project workspace.
- Added the approved product/design plan, outcome backlog, populated product/technical/architecture/schema/API/security/testing/demo documentation, agent instructions, README, persistent memory and progress tracking.
- Configured pinned Next.js/TypeScript/Tailwind stack, pnpm lifecycle policy, TypeScript diagnostics, environment example, project logo metadata and source-controlled LearnLoop double-loop mark.
- Recorded the Supabase dedicated-project creation failure: the selected organization reached its two-active-project free-tier limit. No cloud project was created and no existing project was modified.
- Implemented the responsive Next.js app shell, route manifest, loading/error/not-found states and student Python Fundamentals Learn flow across six concepts.
- Implemented fictional server-side local persistence with Node's built-in experimental `node:sqlite`; added diagnostic scoring/gap analysis, confidence capture, curated hints/explanations, gap-targeted unseen practice, fresh reassessment tied to a diagnostic baseline, progress/history and safe answer-key release.
- Removed `better-sqlite3` after opening a database reproducibly segfaulted in the sandbox; Node built-in SQLite create/read/transaction was verified instead.
- Added deterministic scoring/catalog tests and a disposable HTTP integration harness for routes, recovery, scoring, idempotency, post-completion edits, targeted practice and reassessment comparison.
- Verification passed: `pnpm typecheck`, 4 `pnpm test` checks, `pnpm lint`, `pnpm build`, and `pnpm test:integration`. Exact output is summarized in `tasks/PROGRESS.md`.
- Teacher authoring/timed assessments, real authentication/RLS, Supabase cloud project, live Gemini, reports/exports, and production deployment remain incomplete/unverified.
