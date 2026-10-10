# Testing Plan — LearnLoop AI

## Current status

The Phase 1 student-learning MVP has been verified in the current workspace. Teacher analytics tests have been added on `feat/teacher-results-analytics`, but have not yet been executed; that source milestone remains unverified. `pnpm typecheck`, `pnpm test` (4 tests), `pnpm lint`, `pnpm build`, and `pnpm test:integration` passed. The HTTP integration run rendered eight main routes and exercised server-saved learning answers, recovery, scoring, fresh practice/reassessment, linked score comparison, idempotent completion, private answer withholding, and post-completion write rejection. This does **not** verify teacher assessments, authentication, Supabase RLS, Gemini, production persistence, or deployment; those remain unimplemented/blocked.

## Test layers

- **Unit:** scoring, concept gaps, recommendations, difficulty selection, fresh-question selection, confidence storage, deadline calculation, finalization idempotence, CSV escaping and report calculations.
- **Repository/integration:** SQLite persistence and refresh recovery; server save/submit lifecycle; Supabase adapter/policies when dedicated project is available; migrations are deterministic and additive.
- **Route/authorization:** logged-out vs student/teacher/admin; assigned vs unassigned assessment; student own vs other student's attempt; teacher assigned vs unassigned class; protected correct answers before release.
- **Provider boundaries:** missing Gemini key, timeout/provider rejection, invalid JSON/schema, safe curated explanation fallback, AI quiz draft requires teacher edit/publish.
- **UI/build:** typecheck, lint, build, route rendering, accessible labels/focus/keyboard states, route manifest HTTP response, responsive layout and reduced-motion behavior.
- **End-to-end demo:** fictional student diagnostic→gap→explanation→practice→fresh reassessment→honest comparison; then teacher timed assessment→student server autosave/refresh recovery→manual or deadline finalization→teacher question review/analytics/print report.

## Minimum behavior matrix

### Learning

1. For fixed answer fixtures, diagnostic score and concept gaps match hand-calculated expected results.
2. Recommendations are restricted to concepts with recorded gaps and avoid unnecessary repetition.
3. Reassessment draws fresh questions where the pool permits and compares only attempted, stored results; unattempted concepts are not labelled mastered.
4. Progress dashboard values match repository rows and identify mastery as an estimate.

### Assessment and access

1. An authorized student can access an eligible assigned assessment; unassigned or unauthorized students cannot retrieve it or its private key.
2. Server autosave persists answers and timestamps; refreshing restores the latest successful server save.
3. Expired attempts reject late answer changes and finalize using the most recent successfully saved answer.
4. Repeating finalization does not create another submission or score; post-finalization answer writes fail.
5. Server scoring matches the answer key and score constraints.
6. A blocked pre-start attempt creates an access-denial record and no fake submission.
7. Authorized teachers can inspect individual responses; other classes/teachers and students cannot inspect private submissions.
8. Termination stores reason and finalizes saved answers; focus/fullscreen signals appear as reviewable signals only.

### Security and quality

1. Search tracked files and built client assets for secrets; confirm privileged keys and answer keys are absent.
2. Verify server routes derive identity/role from trusted auth and validate inputs.
3. When a Supabase project exists, enable/test RLS and least-privilege grants for each exposed table, inspect security advisors and run database policy tests. Before that, report cloud RLS as blocked/unverified.
4. Verify AI inputs/output, timeouts and failure fallbacks; do not send API keys client-side.
5. Run configured type/lint/build checks; render major routes; verify responsive layouts and empty/error states; confirm exports match underlying records.

## Safety for test data

Use fictional, disposable local fixtures. Do not write/delete through Supabase MCP against shared/production project state in tests. Do not use unrelated existing projects. Only run database policy/migration tests after a dedicated LearnLoop project is available and target identity is confirmed. Record the exact command and result in `tasks/PROGRESS.md` for each milestone.
