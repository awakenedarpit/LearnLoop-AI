# Supabase authentication and database setup

This is a **setup guide and initial schema migration**, not a claim that cloud mode is already active. The LearnLoop Supabase project has not yet been provisioned. Use a new, dedicated project only; do not point migrations at an unrelated project.

## 1. Provision the project

1. Create a dedicated LearnLoop project in Supabase when the organization/project limit is resolved.
2. In Project Settings → API, copy the project URL and publishable key.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in local/Vercel environments. These are browser-visible values; never put a service-role key in either variable.
4. In Authentication → URL Configuration, set the production site URL and allow the exact callback URL `https://YOUR_HOST/auth/callback` (plus local development callback during development).
5. Configure email delivery and test magic-link redirects.

## 2. Apply the schema

Review `supabase/migrations/202610100001_initial_identity_and_assessments.sql`, then apply it only to the new LearnLoop project using the Supabase migration workflow. It creates profile/role, teacher quiz, question, assignment, attempt, and answer tables with RLS enabled.

New accounts are always assigned the `student` role by the database trigger. Do **not** accept role from signup metadata. Promote a teacher only through trusted administrative tooling after verifying their identity. Never expose service-role credentials to the browser.

## 3. Verify security before enabling cloud writes

- Sign up two students and one teacher; confirm student profiles cannot change their role.
- Confirm one student cannot read another student's attempts or answers.
- Confirm teachers cannot edit another teacher's quizzes or assignments.
- Confirm students cannot access drafts or unassigned quizzes.
- Confirm answer keys and explanations are not exposed before the server has graded an attempt.
- Confirm published quizzes cannot be modified after attempts exist, and deadlines/attempt limits are enforced on the server.
- Run migration/RLS tests against the dedicated project and review every policy before adding real learner data.

## Current boundary

The app's existing quiz services still use the local SQLite demo adapter. The migration and Supabase client/session scaffolding are the next integration layer, not a completed replacement for SQLite. Do not switch off demo mode or use real student records until the Supabase project, migration, auth flows, server-side repository adapter, and RLS tests are all verified.
