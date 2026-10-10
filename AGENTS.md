# Agent Instructions — LearnLoop AI

Before modifying code, read `MEMORY.md`, `tasks/PROGRESS.md`, `tasks/TASKS.md`, `docs/IMPLEMENTATION_PLAN.md`, `TODO.md`, and this file. Inspect the actual source and current Git state; documented status never overrides verified code or database state.

- Preserve the approved product scope and working behavior. Make small, testable, well-scoped changes. Do not claim planned or partially built features are complete.
- Keep active assessment answers server-persisted; never use browser storage as the authoritative active-test record. Enforce deadlines/finalization on the server and make finalization idempotent.
- Current local demo mode is fictional-only, single-student and not production authentication or multi-user authorization. It uses server-side Node `node:sqlite`, experimental in the pinned Node runtime; do not put real learner data in it or describe it as shared/cloud persistence.
- Production roles/identity must be verified server-side and reinforced with Supabase RLS. Never trust client-provided roles, expose protected answer keys, or let students read another student's submissions.
- No dedicated LearnLoop Supabase project exists. Its creation was blocked by the selected organization's two-active-project free-tier limit. Do not use or modify unrelated projects, change billing, or claim live Supabase verification. Re-check quota and current cost after the user resolves the limit.
- Keep `GEMINI_API_KEY`, Supabase privileged keys, passwords, private credentials, real student data and `.env` files out of browser bundles, Git, logs and memory. Use protected secret input for credentials. `.env.example` may contain names and safe placeholders only.
- Read current official integration documentation before changing Supabase or Gemini integrations.
- After meaningful changes, update relevant specs, `MEMORY.md`, `tasks/PROGRESS.md`, `tasks/TASKS.md`, `docs/IMPLEMENTATION_PLAN.md`, `docs/KNOWN_ISSUES.md`, and `CHANGELOG.md` as appropriate.
- Run applicable tests, type/lint/build checks; inspect changed files/diffs; fix issues before calling a milestone verified. Report failures accurately.
- When authorized, commit and push each verified milestone to managed `origin` and the user's public GitHub mirror (`github`). Verify actual refs and record the full hash. Never force-push, rewrite shared history, overwrite unrelated work, discard user changes, or commit secrets.
