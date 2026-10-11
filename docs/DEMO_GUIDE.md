# Demo Guide — LearnLoop AI

## Current readiness

The student Python Fundamentals journey and demo teacher assessment/review/analytics/export flows are implemented and locally verified against fictional SQLite data. The intended Supabase project `rlglcgtamqwqzmkitdtn` is healthy and has four recorded migrations; live metadata shows 14 public tables with RLS enabled and zero rows. The fourth live migration source is missing from this checkout, five public assessment RPCs remain flagged by Security Advisor, and no authenticated-user RLS behavior tests have been run. App services remain local SQLite. There is no class assignment UI, cloud persistence, verified real-user sign-in, Gemini request, or confirmed production deployment. Use fictional data only.

## Local setup

Prerequisites: Node `>=22.13.0`, pnpm `10.12.1`, and port `3000` available.

```bash
pnpm install
pnpm dev
```

When running in development without configured Supabase credentials, the app uses the fictional local demo. A visible label identifies this mode. The persistent local database is `data/learnloop-demo.sqlite` (ignored by Git); it uses Node's built-in `node:sqlite`, which is experimental in the pinned Node 22 runtime.

To reset local demo progress, stop the dev server first:

```bash
pnpm demo:reset
pnpm dev
```

Restart the server so the reset database is reopened. The helper refuses to delete paths outside the project `data/` directory.

## Student learning rehearsal

1. Open the dashboard and choose the Python Fundamentals diagnostic.
2. Answer the six questions for variables, data types, conditionals, loops, functions and lists; confidence may be recorded with each selection.
3. Use hints if needed. The app saves answers server-side; refresh to see the latest successful save restored.
4. Complete the diagnostic to see the score, explanations and concept gaps.
5. Start targeted practice for those gaps, then take the fresh-question reassessment.
6. Compare the reassessment only with its linked diagnostic baseline. Progress reflects stored attempts; untested concepts remain unmastered.
7. Review saved sessions in Learning History.

## Teacher/student assessment rehearsal

The UI uses fictional shared demo identity/data. The same journey is also verified automatically:

```bash
pnpm test:integration
```

The assessment verifier creates a synthetic quiz, confirms invalid input is rejected and draft quizzes are hidden from students, publishes the quiz, confirms active students do not receive answer keys, starts an attempt, autosaves and resumes answers, checks malformed answers/attempt limits/deadlines, finalizes using server-held scoring, replays finalization, verifies post-submit immutability, inspects teacher review/analytics and downloads a filtered CSV. It also checks formula-like user content is neutralized for spreadsheets. Deadline expiry is simulated by advancing only the isolated test SQLite database's timestamp.

## Automated integration details

`pnpm test:integration` starts a temporary Next.js server, a disposable SQLite database and checks the 8 main page routes plus `/manus-routes.json`. It then runs the learner journey and teacher/student assessment flow above. Tests use fictional records and clean up their temporary database. They verify local demo behavior only, not Supabase, authenticated authorization, cross-user/class access, deployed runtime, or real database transactions.

## Not yet ready

Do not use real learner or organization data. The app is not production-ready: services do not persist to Supabase; memberships/admins and classes/assignments are not provisioned in the product; user-session RLS/RPC tests are missing; exact source for the fourth applied database migration is absent; five Security Advisor warnings remain open; Gemini calls and a linked Vercel deployment are unverified. See [`COMPLETION_AUDIT.md`](COMPLETION_AUDIT.md) for the full status matrix.
