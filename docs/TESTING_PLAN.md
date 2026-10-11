# Testing Plan — LearnLoop AI

## Current status (2026-10-11)

The base revision passed `pnpm typecheck`, `pnpm lint`, `pnpm test` (20 tests), `pnpm test:integration` (8 page routes plus student learning flow), and a fictional-demo production build. On branch `feat/assessment-http-integration`, expanded `pnpm test:integration`, `pnpm typecheck`, `pnpm lint`, `pnpm test` (20/20), `DEMO_MODE=true DEMO_DB_PATH=:memory: pnpm build`, and `git diff --check` all pass after the current code/documentation edits.

The intended Supabase project `rlglcgtamqwqzmkitdtn` is healthy. Read-only inspection verified four live migrations, 14/14 public application tables with RLS enabled, zero rows, policy text and constrained grants. The source for the fourth recorded migration is missing from this checkout. Five public SECURITY DEFINER assessment RPC warnings remain open. **No authenticated-session RLS or direct-RPC allow/deny test has been run.** Gemini calls and production deployment were not tested.

## Test layers

- **Unit:** scoring, concept gaps, recommendations, difficulty selection, fresh-question selection, confidence storage, deadline calculation, finalization idempotence, CSV escaping and report calculations.
- **Repository/integration:** SQLite persistence and refresh recovery; student answer-save/finalize lifecycle; future Supabase adapter and authenticated policy tests remain required.
- **HTTP integration (current demo):** route manifest/main routes; learning session recovery/scoring/practice/reassessment; quiz input validation, draft visibility, publish lock, student key withholding, timed attempt/save/resume, malformed answer rejection, attempt limit, expiry/late-write behavior, scoring, repeat submit, final-state immutability, teacher review, analytics and CSV formula neutralization. The deadline is advanced directly in the temporary SQLite database.
- **Route/authorization:** future logged-out vs student/teacher/admin; assigned vs unassigned quiz; own vs another student's attempt; assigned vs unassigned class; protected answer keys.
- **Provider boundaries:** future missing Gemini key, timeout/provider rejection, invalid JSON/schema, safe curated fallback, and teacher review before AI draft publication.
- **UI/build:** typecheck, lint, production build, route rendering, accessible labels/focus/keyboard, responsive layout, print flow, reduced motion and empty/error states.
- **End-to-end demo:** fictional diagnostic→gap→explanation→practice→fresh reassessment→honest comparison; plus teacher quiz create/publish→student key withholding/timed attempt/autosave/refresh/deadline/finalization→teacher question review/analytics/CSV.

## Minimum behavior matrix

### Learning

1. Fixed answer fixtures produce hand-calculated diagnostic scores and concept gaps.
2. Recommendations target recorded gaps and avoid unnecessary repetition.
3. Reassessment uses fresh questions where available and compares only stored attempts; unattempted concepts are not called mastered.
4. Progress dashboard values match repository rows and label mastery as an estimate.

### Assessment and access

1. An eligible student accesses only assigned assessments; unassigned students cannot retrieve private quiz data or answer keys.
2. Autosave persists server answers; refresh restores the last successful save.
3. Expired attempts reject late answer updates and finalize using successfully saved answers.
4. Repeated finalization is idempotent; post-finalization writes fail.
5. Server scoring matches database answer keys and score constraints.
6. A blocked pre-start attempt creates a denial record, not a fake attempt/submission.
7. Authorized teachers review only their class submissions; students/other teachers cannot read private results.
8. Termination stores its reason; focus/fullscreen events are reviewable signals only.

The local SQLite HTTP test covers selected behaviors above for the demo identity only. Required future database tests must call both app routes and direct PostgREST/RPC as synthetic authenticated users, covering allowed/denied actions, another user's IDs, role and tenant boundaries, malformed answers, membership changes, deadlines and repeated finalization. The current database has zero rows; prepare only isolated synthetic data for such tests.

### Security and release quality

1. Search tracked files and built client assets for secrets; ensure privileged keys and unreleased answer keys are absent.
2. Verify handlers derive roles from trusted auth and validate all request inputs.
3. Run authenticated RLS allow/deny tests and cloud persistence integration against the confirmed project or an isolated branch.
4. Review the five public SECURITY DEFINER advisor warnings against actual user-session RPC tests; retain only intentionally exposed wrappers.
5. Verify AI inputs/output, timeouts and fallbacks; never send API keys client-side.
6. Run CI/local typecheck, lint, unit, integration and build; review UI, exports and actual deployment smoke test.

## Safety for test data

Use fictional, disposable local fixtures. No live Supabase writes were made during this audit. The intended project is confirmed, but use synthetic accounts/records in an isolated test context for policy tests and review the missing fourth migration source before future migration work. Do not use real learner data. Record exact commands/results in `tasks/PROGRESS.md`.
