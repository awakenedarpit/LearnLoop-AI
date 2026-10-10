# Implementation Plan

Statuses use `NOT_STARTED`, `IN_PROGRESS`, `BLOCKED`, or `DONE`. A phase/task becomes `DONE` only after its acceptance behavior has been implemented and verified. Product acceptance details are also preserved in root `TODO.md`; tests and outcomes belong in `docs/TESTING_PLAN.md` and `tasks/PROGRESS.md`.

## Phase 0 — Foundation

### P0.1 Project docs, memory, and Git foundation — `IN_PROGRESS`
- **Objective:** Establish project continuity and a safe, verified milestone-push workflow.
- **Prerequisites:** GitHub repository exists; the user explicitly approved its current public visibility; managed Webdev workspace initialized.
- **Affected files:** `README.md`, `AGENTS.md`, `MEMORY.md`, `CHANGELOG.md`, `.gitignore`, `.env.example`, `plan.md`, `TODO.md`, `docs/*`, `tasks/*`, Git remotes.
- **Approach:** Populate every required doc with project-specific facts; exclude secrets/build outputs/local DB; preserve managed `origin`; add a distinct GitHub remote; validate `main` and push each meaningful verified milestone.
- **Acceptance:** Repository and documentation match real project state; persistent memory handoff is complete; secrets and local data are ignored; both intended remotes contain the recorded commit without force-push.
- **Verification:** Inspect status/diff, scan tracked names for secret/local files, inspect branch/remotes, compare remote heads after push.

### P0.2 Runtime, diagnostics, dependencies, and route manifest — `DONE`
- **Objective:** Set up a reproducible Next.js TypeScript app and host diagnostics before application edits.
- **Prerequisites:** P0.1 documentation/backlog exists; runtime port 3000 remains selected.
- **Affected files:** `package.json`, `pnpm-workspace.yaml`, lockfile, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `app.config.ts`, `public/manus-routes.json`.
- **Approach:** Pin pnpm 11; review lifecycle build permissions; install an App Router toolchain; register TypeScript diagnostics; implement complete page-route manifest before starting dev server.
- **Acceptance:** Reproducible install, correct port/bind behavior, `GET /manus-routes.json` returns valid JSON with the actual page routes, and diagnostics are registered.
- **Verification:** Clean install, typecheck/lint/build and HTTP route-manifest check.

### P0.3 Coherent responsive shell — `DONE`
- **Objective:** Give Learn and Assess one accessible, data-aware product navigation shell.
- **Prerequisites:** P0.2.
- **Affected files:** `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, shared navigation/status components, logo assets.
- **Approach:** Implement editorial learning-console design, responsive navigation, a loop mark, real route links and honest demo/system status. Avoid decorative fake analytics.
- **Acceptance:** Major student/teacher entry routes render inside one coherent shell at desktop/mobile sizes and provide clear loading/empty/error states.
- **Verification:** Type/lint/build; route manifest comparison; inspect responsive CSS and use screenshots only if needed to diagnose a concrete visual issue.

## Phase 1 — Student learning MVP

### P1.1 Diagnostic and concept-gap scoring — `DONE`
- **Objective:** Implement Python diagnostic assessment for six named concepts.
- **Prerequisites:** P0.2 and shared shell.
- **Affected files:** `features/learn/*`, `lib/services/scoring.ts`, question seed/migrations, learning API routes.
- **Approach:** Tag MCQs by concept, persist answers/session, compute score and per-concept gaps from submitted responses, optionally store confidence.
- **Acceptance:** Results show actual score, responses, concept-level gaps and next steps for variables, data types, conditionals, loops, functions, and lists.
- **Verification:** Scoring/gap tests against hand-calculated fixtures; persistence check in demo adapter.

### P1.2 Explanations and gap-targeted practice — `DONE`
- **Objective:** Explain errors and route learners into practice matched to gaps.
- **Prerequisites:** P1.1 concept results and curated explanation bank.
- **Affected files:** `features/learn/explanations`, `features/learn/practice`, `lib/ai` fallback/schema, recommendation service.
- **Approach:** Present beginner explanations/worked code/hints; select unseen practice questions from weak concepts; keep difficulty/feedback clear; curated content works without Gemini.
- **Acceptance:** Incorrect answers can be understood and practiced; recommendations derive from recorded gaps and avoid unnecessary repetition.
- **Verification:** Fixture-based recommendation/explanation fallback checks.

### P1.3 Fresh reassessment and progress dashboard — `DONE`
- **Objective:** Show real learning change over time.
- **Prerequisites:** P1.1–P1.2 and persisted session history.
- **Affected files:** `features/learn/reassessment`, dashboard, history/progress services.
- **Approach:** Sample fresh questions for previously weak concepts where available; compare actual diagnostic and reassessment scores/concept changes; display confidence/history and estimated mastery wording.
- **Acceptance:** No fabricated improvement; unattempted questions are not mastered; dashboard fields reflect stored history.
- **Verification:** Fresh-question and comparison tests using persisted attempts.

## Phase 2 — Teacher assessment MVP

### P2.1 Teacher quiz authoring — `IN_PROGRESS` (demo-only milestone; verification pending)
- **Objective:** Build the teacher authoring flow for quiz metadata, multiple-choice questions, answer keys, concept tags, explanations, preview, draft save, and publish.
- **Prerequisites:** Demo-only quiz storage exists; production identity/role boundaries and class/assignment models remain prerequisites for secure class assignment.
- **Affected files:** `features/assess/authoring`, teacher routes/actions, schema, class assignment UI.
- **Approach:** Implement manual question/answer/explanation/concept editing; title/instruction/duration/availability/attempt settings; student preview; draft save/edit; and draft-to-published transition. Keep class assignment out of this milestone until server-side auth and trusted class membership exist.
- **Current implementation:** `components/teacher-quiz-builder.tsx`, `lib/services/teacher-quizzes.ts`, and `app/api/teacher/quizzes/*`; SQLite demo storage is per instance and ephemeral on Vercel when `:memory:` is configured.
- **Acceptance:** Authoring, editing, preview, save, and publish pass UI/API tests; published drafts are locked; invalid question payloads are rejected. Class assignment remains incomplete.
- **Verification:** **Pending** — run typecheck/lint/unit/integration/build and verify the UI against a checked-out branch before marking complete.

### P2.2 Student attempt, autosave, deadlines, and finalization — `IN_PROGRESS` (local demo verified)
- **Objective:** Make the timed test reliable across refreshes and deadline boundaries.
- **Prerequisites:** P2.1 and persistent answer store.
- **Affected files:** `features/assess/attempt`, save/finalize services, answer/session API.
- **Current implementation:** `lib/services/assessments.ts`, `components/assessment-runner.tsx`, and `/api/assessments/*` provide server-saved answers, refresh recovery, server deadline checks, manual/expired finalization, idempotent scoring, and answer-key withholding in the fictional local demo.
- **Approach:** Server saves each answer; UI shows last-successful-save state; server time enforces deadline; finalization idempotently scores the latest saved answers; prevent writes after finalization; record policy termination/access denials/integrity events.
- **Acceptance:** Refresh recovers server answers, late writes fail, duplicate finalization scores once, expiry uses the latest successfully saved answer, and pre-start denial creates no submission.
- **Verification:** `tests/assessments.test.ts` covers save/restore, deadline expiry, duplicate finalization, post-finalization write rejection, and answer-key withholding. Class/identity authorization and access-denial/integrity records remain pending cloud/auth work.

### P2.3 Individual review and integrity review — `NOT_STARTED`
- **Objective:** Give authorized teachers actionable submission review.
- **Prerequisites:** P2.1–P2.2 and review event records.
- **Affected files:** `features/assess/review`, teacher access services/routes.
- **Approach:** Filter by assessment/class/student; display question responses, score/time, unanswered summary, denial reason, and reviewable integrity signals.
- **Acceptance:** Teacher sees only authorized records; signals are not presented as proof of misconduct.
- **Verification:** Teacher/student cross-record authorization checks.

## Phase 3 — AI and analytics

### P3.1 Gemini assistance — `NOT_STARTED` (key setup not available)
- **Objective:** Add validated Gemini explanations and quiz drafts.
- **Prerequisites:** Protected `GEMINI_API_KEY`; official API contract; curated fallbacks.
- **Affected files:** `lib/ai`, secure routes/actions, teacher draft workflow, `.env.example`, docs.
- **Approach:** Use official server SDK/API; validate bounded request and response schemas; keep key private; treat quiz output only as a teacher-editable draft; handle timeouts, invalid output and provider failures.
- **Acceptance:** Configured requests are validated and handled safely; missing-key/provider failures use fallbacks; generated quizzes cannot publish without teacher review.
- **Verification:** Unit tests with mocked provider, key-absence/failure/schema cases; live request only after key setup.

### P3.2 Class, question, concept, and individual analytics — `NOT_STARTED`
- **Objective:** Provide useful authorized insights and exports.
- **Prerequisites:** Persisted assessment/learning records and P2.3 authorization.
- **Affected files:** analytics services/routes, class dashboard, CSV/print views.
- **Approach:** Compute summaries from real submissions/responses; define ranking eligibility and tie behavior; export filtered authorized datasets.
- **Acceptance:** Class scores, leaderboards, question correctness, concepts/common gaps, individual history, printable report and CSV all match stored data.
- **Verification:** Fixture comparisons and authorization checks.

## Phase 4 — Supabase hardening and deployment

### P4.1 Dedicated Supabase project and RLS — `BLOCKED`
- **Objective:** Run the production persistence/auth target requested by the user.
- **Prerequisites:** User resolves the two-active-project free-tier limit; user-approved project cost; dedicated LearnLoop project and protected connection configuration.
- **Affected files:** `supabase/migrations/*`, `supabase/tests/*`, `lib/db/supabase/*`, `lib/auth/*`, security docs.
- **Approach:** Apply reviewed additive migrations; least-privilege grants and per-operation RLS; inspect security advisories; test tenant/class/student/teacher/admin visibility.
- **Acceptance:** Dedicated Supabase project serves auth/database; RLS enforces the intended rows; service-role credentials never enter client output; data persists and recovers.
- **Verification:** `supabase test db`, tool-level schema/advisory review and role-scoped integration checks in that dedicated project. Do not write to unrelated existing projects.

### P4.2 Edge cases, responsive quality, demo, and deployment preparation — `NOT_STARTED`
- **Objective:** Complete the reproducible hackathon prototype and deployment instructions.
- **Prerequisites:** P1–P3 functional, P4.1 when cloud setup is available.
- **Affected files:** app routes, test suites, `README.md`, demo/security/testing docs, deployment config.
- **Approach:** Exercise expiry, save, refresh, access-denial, idempotency and reporting boundaries; review responsive behavior and error states; rehearse a fictional-data student/teacher demo; document Vercel variables and setup.
- **Acceptance:** The ten-step user-specified demo is reproducible; verified and incomplete features/limitations are explicit; production deployment is reported only after success.
- **Verification:** Run configured unit/integration/build checks and complete the documented demo rehearsal.
