# Changelog

## Unreleased — 2026-10-11

- Added an assessment HTTP integration verifier to the existing disposable demo harness. It covers draft validation/visibility, publishing, answer-key withholding, attempt autosave/recovery/deadline/limits, server scoring, idempotent finalization, review, analytics, CSV export, and formula neutralization.
- Expanded setup/security/testing/architecture documentation and added a source-backed completion audit.
- Rechecked the intended Supabase project read-only: four migrations recorded, 14/14 public application tables have RLS enabled and report zero rows. Five public authenticated SECURITY DEFINER RPC warnings remain; the source for the fourth live migration is absent from this checkout. No database changes were made.
- Merged PR #8 to `main` as `cefae2c`: consolidated teacher quiz authoring, student timed attempts with autosave/recovery/deadlines, teacher analytics, question-by-question submission review, print-friendly review, filtered CSV export, and GitHub Actions CI.
- Fixed React lint findings in assessment views and corrected CI setup ordering. GitHub Actions run `38078124788` passed typecheck, lint, unit tests, and production build on the combined branch. Full assessment HTTP integration remains unverified.
- Added `GET /api/teacher/analytics/export` with assessment filtering, safe CSV quoting, and formula-like cell neutralization. All assessment data remains fictional demo data for one learner; production authorization/cloud persistence are not available.

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
- Production authentication/RLS, dedicated Supabase cloud persistence, live Gemini, class assignment/access-denial/integrity review, full class reports, and successful production deployment remain incomplete/unverified.

 
## 2026-10-10 — Assessment workflow demos

- Added the teacher quiz builder and published-quiz state in PR #2.
- Added student quiz listing, answer submission, server-side grading, result explanations, attempt limits and responsive quiz review in PR #3.
- Both are demo-only; no role authorization, shared durable cloud storage, or server-enforced quiz timer is implemented. Verification of the latest branches and Vercel preview is pending.

## Unreleased — timed assessment flow

- Added server-backed active quiz attempts, deadline enforcement, answer autosave, resume after refresh, and automatic submit behavior in the student quiz interface.
- Added service tests for active-attempt recovery and ensuring late payloads cannot replace saved answers after the deadline.
- Demo-only: uses fixed fictional student identity and local SQLite. Typecheck, lint, tests, build, browser testing and preview deployment remain unverified.

## Unreleased — 2026-10-11 (production foundation)

- Provisioned dedicated Supabase project `LearnLoop` in approved `RajArpit` organization; project cost check returned `$0/month`. Existing projects untouched.
- Applied schema, grant/policy correction, and private-helper migrations. Verified 14/14 public application tables have RLS enabled, narrowed authenticated grants, and no direct user writes to submissions or attempt result/lifecycle fields. One documented advisor warning remains for the signed-in safe quiz DTO RPC.
- Added trusted organization-membership role resolution and cloud-mode student/teacher route gates. These routes still use demo-only service implementations; cloud persistence and authorization behavior are not fully verified.
- Re-ran typecheck, lint, 20 unit tests, and production build successfully. Live authenticated RLS tests, Gemini, cloud repository integration, email/Auth callback configuration, and production deployment remain incomplete.
