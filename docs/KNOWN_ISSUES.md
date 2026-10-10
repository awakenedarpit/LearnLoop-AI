# Known Issues and Blockers

## Confirmed blockers

- **The app is not yet connected to Supabase persistence.** Dedicated project `LearnLoop` (`rlglcgtamqwqzmkitdtn`, `ap-south-1`) exists in the approved `RajArpit` organization; project creation was checked at `$0/month`. Three migrations are applied, 14/14 application tables have RLS enabled, and grant/policy catalogs were inspected. However, application services still use local SQLite; production sign-in-to-data flow, trusted membership/bootstrap, and authenticated allowed/denied RLS behavior are not verified. Do not enter real learner data.
- **Gemini is not live.** No protected `GEMINI_API_KEY` is configured, and no request has been made. Keep any future key in protected server configuration; never paste it into chat, commit it, or expose it to the browser.
- **Production deployment is unverified.** Vercel previously reported `Deployment rate limited — retry in 24 hours`; no production URL is confirmed. No new deployment was attempted in this task.
- **Source synchronization is complete; production deployment is not.** Commit `5482c379fe353c705a9290989b3a92162e17f9f2` is pushed to the user-approved public `main`, and the remote SHA was verified. This is not evidence of a live production deployment.

## Limitations to revisit

- The student Learn MVP and teacher assessment demo still use one fixed fictional identity and local Node `node:sqlite`; this Node module is experimental and the demo is not shared production storage.
- Demo assessment authoring, attempts/autosave/deadlines, review, quiz-level analytics and CSV export are implemented. Full assessment HTTP/browser integration and edge-case coverage remain incomplete. Class/organization administration and multi-student analytics UI are not implemented.
- Assessment API handlers now require authenticated student/teacher organization roles in cloud mode, but the service layer still uses SQLite rather than Postgres. The account has no organization membership provisioned, no trusted first-admin workflow, and no email delivery/callback verification.
- Database metadata was reviewed, but no real-user allowed/denied RLS integration test has been run. The Supabase security advisor retains one intentional warning for the signed-in safe student quiz DTO `get_assigned_quiz`; see [remediation guidance](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
- Access-denial/integrity-event tables exist in the schema, but app event creation/review routes and workflows do not.
