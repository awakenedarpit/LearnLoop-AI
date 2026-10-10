# Demo Guide — LearnLoop AI

## Current readiness

The student Python Fundamentals flow is implemented and verified in a local fictional-data demo. The dedicated Supabase project could not be created because the selected organization reached its two-active-project free-tier limit. No Gemini key is configured. There are no production accounts, user-specific identities, class records, teacher assessment workflows, analytics/exports, or deployment URL. Local demo progress is not cloud-synced. Do not enter real student or organization data.

## Local setup

Prerequisites: Node `>=22.13.0`, pnpm `11.25.0`, and port `3000` available.

```bash
pnpm install
pnpm dev
```

When running in development with no Supabase credentials, the app automatically uses the fictional local demo. A visible label identifies this mode. The persistent local database is `data/learnloop-demo.sqlite` (ignored by Git); it uses Node's built-in `node:sqlite`, which is experimental in the pinned Node 22 runtime.

To reset local demo progress, stop the dev server first:

```bash
pnpm demo:reset
pnpm dev
```

Restarting the server ensures the reset database is re-opened. The helper refuses to delete paths outside the project `data/` directory.

## Student rehearsal

1. Open the dashboard and choose the Python Fundamentals diagnostic.
2. Answer the six questions covering variables, data types, conditionals, loops, functions and lists; confidence can be recorded with each selected answer.
3. Use a hint when needed. The app saves each answer server-side and shows a saved/unsaved state; refreshing the session restores the latest successful save.
4. Complete the diagnostic to see the actual score, correct answers, beginner-friendly explanations and concept gaps.
5. Start targeted practice for those gaps. The demo chooses unseen question variants when available and does not invent gaps when no diagnostic exists.
6. Complete practice and use the fresh-question reassessment path.
7. Compare the reassessment only with its linked diagnostic baseline; progress shows actual stored attempts and leaves untested concepts unmastered.
8. Review saved sessions in Learning History.

## Automated end-to-end rehearsal

Run with port 3000 available:

```bash
pnpm test:integration
```

This command starts a temporary Next.js server and disposable SQLite database, verifies the 8 main page routes and `/manus-routes.json`, then tests diagnostic session resume, correct-answer withholding, server answer saves and refresh recovery, scoring, gap practice, fresh reassessment, linked score comparison, idempotent completion, and rejection of answer updates after completion. It runs against fictional test records and cleans up the temporary database.

## Not ready for the demo

Teacher quiz creation/publishing, classes/assignments, timed assessments/deadlines, access-denial and integrity records, submission review, class analytics, printable/CSV reports, Supabase authentication/PostgreSQL/RLS, Gemini assistance and public deployment are not implemented. The original ten-step student-plus-teacher demonstration remains incomplete until those phases are delivered and verified.
