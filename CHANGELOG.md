# Changelog

## Unreleased — 2026-10-10

- Started the teacher quiz builder milestone on `feat/teacher-quiz-builder`: authoring UI, draft CRUD and publish API, validation, quiz metadata/question storage, student preview, and responsive styles. Implementation status and limitations are documented in `tasks/PROGRESS.md`; verification is still pending.

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

 
## 2026-10-10 — Assessment workflow demos

- Added the teacher quiz builder and published-quiz state in PR #2.
- Added student quiz listing, answer submission, server-side grading, result explanations, attempt limits and responsive quiz review in PR #3.
- Both are demo-only; no role authorization, shared durable cloud storage, or server-enforced quiz timer is implemented. Verification of the latest branches and Vercel preview is pending.
