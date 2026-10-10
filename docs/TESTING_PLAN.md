# Testing Plan — LearnLoop AI

## Current status

Latest local checks after cloud-mode role gates and documentation updates: `pnpm typecheck`, `pnpm lint`, `pnpm test` (20 tests), `pnpm test:integration` (8 pages and the local student loop in demo mode), and `DEMO_MODE=true DEMO_DB_PATH=:memory: pnpm build` all passed. The dedicated Supabase project and schema now exist; live metadata inspection confirmed RLS flags, applied migrations, narrowed grants, and policy/helper locations. No authenticated user-session RLS tests, cloud persistence flow, Gemini request, or production deployment was run.

## Test layers

- **Unit:** scoring, concept gaps, recommendations, difficulty selection, fresh-question selection, confidence storage, deadline calculation, finalization idempotence, CSV escaping and report calculations.
- **Repository/integration:** SQLite persistence and refresh recovery; server save/submit lifecycle; Supabase adapter tests and authenticated policy tests still required even though project/migrations are present.
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
3. Run authenticated RLS allow/deny tests and cloud persistence integration in the dedicated LearnLoop project; catalog/advisor checks alone do not verify behavior.
4. Verify AI inputs/output, timeouts and failure fallbacks; do not send API keys client-side.
5. Run configured type/lint/build checks; render major routes; verify responsive layouts and empty/error states; confirm exports match underlying records.

## Safety for test data

Use fictional, disposable local fixtures. Do not write/delete through Supabase MCP against shared/production project state in tests. Do not use unrelated existing projects. Only run database policy/migration tests after a dedicated LearnLoop project is available and target identity is confirmed. Record the exact command and result in `tasks/PROGRESS.md` for each milestone.
