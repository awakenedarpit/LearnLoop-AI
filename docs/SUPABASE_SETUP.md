# Supabase authentication and database setup

The dedicated **LearnLoop** Supabase project is provisioned in `RajArpit` (`rlglcgtamqwqzmkitdtn`, region `ap-south-1`). Project creation cost was checked at `$0/month`. Three migrations are applied. Cloud mode is **not live in the app**: services still use the local SQLite demo adapter, and production authentication/authorization and persistence are not fully verified. Never point LearnLoop migrations at an unrelated project.

## 1. Provision the project

1. Project created and healthy: `https://rlglcgtamqwqzmkitdtn.supabase.co`.
2. In Project Settings → API, retrieve the current publishable key. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` only in protected local/deployment configuration. These values are intended for browser use; never use a service-role key in either variable.
3. In Authentication → URL Configuration, set the eventual production site URL and allow the exact callback `https://YOUR_HOST/auth/callback` (plus local development callback during development).
4. Configure email delivery and verify magic-link redirects. This has not yet been tested.

## 2. Apply the schema

The following migrations were applied to the dedicated project: `202610100001_initial_identity_and_assessments.sql` (profiles, organizations, memberships, classes, quizzes, assignments, attempts, saved answers, submissions, denial/integrity events, RLS); `202610100002_correct_rls_correlations_and_grants.sql` (least-privilege grants, fixed correlated policies, indexes); and `202610100003_move_internal_functions_private.sql` (move auth and authorization helpers out of the exposed API schema). The provider migration ledger records all three. Live inspection confirmed 14/14 application tables have RLS enabled and no authenticated direct writes to submissions or attempt lifecycle/results. Do not replay these migrations on another project without reviewing the actual applied state.

New accounts receive a profile only. Roles are assigned through trusted organization-membership provisioning; no self-serve role assignment or admin bootstrap workflow exists yet. Do **not** accept role from signup metadata. Never expose service-role credentials to the browser.

## 3. Verify security before enabling cloud writes

- Sign up two students and one teacher; confirm student profiles cannot change their role.
- Confirm one student cannot read another student's attempts or answers.
- Confirm teachers cannot edit another teacher's quizzes or assignments.
- Confirm students cannot access drafts or unassigned quizzes.
- Confirm answer keys and explanations are not exposed before the server has graded an attempt.
- Confirm published quizzes cannot be modified after attempts exist, and deadlines/attempt limits are enforced on the server.
- Run migration/RLS tests against the dedicated project and review every policy before adding real learner data.

## Current boundary

The app's learning and quiz services still use the local SQLite demo adapter. Assessment routes have server-side role gates in cloud mode, but authorized calls still do not read/write Postgres. No row-isolation test with authenticated student/teacher sessions has passed; the schema, grants, and policy text were inspected only. Organization/class CRUD, a trusted first-admin workflow, server-side attempt finalization/scoring, and deployment configuration are missing. Do not switch off demo mode for user-facing production data or use real student records until cloud repositories, role bootstrap, email configuration, and allowed/denied RLS integration tests are implemented and verified.
