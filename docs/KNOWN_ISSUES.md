# Known Issues and Blockers

## Confirmed implementation gaps

- **No production persistence.** Learning and assessment services still use the fictional local `node:sqlite` adapter. It is not shared cloud storage or suitable for real multi-user data.
- **Live database migration source is incomplete in Git.** LearnLoop project `rlglcgtamqwqzmkitdtn` is healthy and records four migrations, but only source migrations 001–003 are present in this checkout. The fourth `secure_assessment_attempt_lifecycle` migration's source must be recovered/reviewed before the database state is reproducible; do not reconstruct or reapply it blindly.
- **Authentication is a scaffold, not a completed user journey.** Supabase SSR clients, callback, magic-link UI, session proxy and trusted membership role lookup exist, but app URL/key, email redirects and real sign-in are not verified. There is no trusted initial-admin/membership provisioning.
- **Authorization and multitenancy are incomplete.** Some routes have role gates and RLS policies exist in the database, but data services remain demo-backed and there are no authenticated cross-student/class/organization tests. Class/organization admin CRUD, assignment lifecycle and admin bootstrap remain absent.
- **Security Advisor findings remain open.** Five public `SECURITY DEFINER` RPCs are executable by authenticated users. Source/definitions were reviewed and actor/ownership checks exist, but direct RPC testing with authenticated synthetic users is still needed. Performance Advisor also reported 16 unused indexes and six multiple-permissive-policy notices; assess after workload tests.
- **Gemini is not integrated.** The SDK is a dependency, but no provider-call service or live call exists. No app key was verified/configured.
- **Deployment is unverified.** Current Vercel lookup returned no project linked to this GitHub repository and no team context. No deployment or public URL is confirmed.

## Verified fictional-demo behavior

- Student diagnostic, gap analysis, curated feedback, targeted practice, reassessment and saved progress are exercised by `pnpm test:integration` against isolated local SQLite.
- Teacher quiz authoring/publishing, timed student attempt, answer-key withholding, autosave/recovery, deadline handling, server scoring, duplicate finalization, review, analytics and CSV are exercised by the expanded HTTP verifier. These tests cover only the fixed fictional demo identity, not cloud persistence or production authorization.
- Unit tests cover scoring, quizzes, analytics, review and CSV safety. The integration journey covers selected routes/lifecycle boundaries, not all permissions or browser interaction.

## Live database facts

The intended Supabase project is LearnLoop `rlglcgtamqwqzmkitdtn` in `ap-south-1`, `ACTIVE_HEALTHY`. Four migrations are recorded; 14 public application tables have RLS enabled and report zero rows. Policies/grants were inspected as metadata, but no authenticated-session allow/deny behavior has been run. See [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md) and [`COMPLETION_AUDIT.md`](COMPLETION_AUDIT.md).

## Residual work

Add authenticated RLS and direct-RPC tests; implement class assignment and tenant-scoped repositories; make attempt finalization transaction-safe on Postgres; add access-denial/integrity-event workflows and rate limits; recover the fourth migration source; review security advisor warnings; audit dependencies; test accessibility/browser/mobile/print behavior; and identify/configure the intended Vercel project before any deployment claim.
