# Supabase authentication and database setup

## Current verified project

The Supabase account now connected for this task is the account used for the intended LearnLoop database. The exact project is **LearnLoop**, reference `rlglcgtamqwqzmkitdtn`, region `ap-south-1`, status `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.003. This task made read-only inspections only; no project setting, schema, migration, or data was changed.

The live migration ledger reports four entries:

| Version | Name |
|---|---|
| `20261010192616` | `initial_identity_assessments_multitenancy` |
| `20261010192807` | `correct_rls_correlations_and_grants` |
| `20261010193044` | `move_internal_functions_to_private_schema` |
| `20261010195206` | `secure_assessment_attempt_lifecycle` |

Live metadata exposes 14 public application tables; all 14 report RLS enabled and each reports zero rows. Table definitions, keys, policies and grants were inspected. This is catalog/schema verification only; **no authenticated student/teacher session tests have been run**, and it does not prove effective data isolation.

### Security Advisor

Current Security Advisor reports five warnings for authenticated users being able to execute public `SECURITY DEFINER` assessment RPCs: `get_assigned_quiz`, `list_assigned_quizzes`, `start_assessment_attempt`, `save_assessment_answers`, and `finalize_assessment_attempt`. Their current definitions were read-only inspected: they use `search_path=''`; user-sensitive functions bind the actor to `auth.uid()`, check ownership/assignment, and the quiz-content DTO omits answer keys before submission. Treat that as a preliminary manual review, not a closure of the warnings. Verify direct RPC behavior with authenticated synthetic users and retain or move each exposed wrapper only after reviewing its intended client use. See [Supabase database linter 0029](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

Performance Advisor reports 16 unused-index notices (consistent with an empty/new database) and six multiple-permissive-policy notices; review/optimize only after representative workload testing.

## Migration-source drift — recover before further schema work

The repository currently contains source migrations `supabase/migrations/202610100001_*` through `202610100003_*`, while the live migration ledger has a fourth entry `secure_assessment_attempt_lifecycle`. Its SQL is available in the live `supabase_migrations.schema_migrations.statements` record and was inspected read-only, but it has not been written back to this checkout. Export and review that exact SQL, commit it using a source filename/version that reconciles with the live ledger, and check the first three local filename prefixes against the ledger versions before using Supabase CLI migration commands. Do not guess, replay, or apply it again.

## Application integration status

The application still uses a fictional local SQLite adapter (`node:sqlite`) for learning and teacher/student assessments. Supabase SSR clients, auth callback/session refresh and role-lookup scaffolding exist, but no cloud repository is wired into the learning/assessment journeys. App URL/key configuration, email delivery, trusted initial-admin/membership provisioning, real user sign-in, and PostgreSQL persistence are not verified. The active project currently has no application rows.

Do not configure a real-data workflow or describe the prototype as production-ready until the gaps in [`COMPLETION_AUDIT.md`](COMPLETION_AUDIT.md) are resolved.

## Safe next steps

1. Restore/commit the exact missing fourth migration source and review it against live function definitions, grants and private helpers.
2. Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` through protected environment configuration. Never put a service-role key in client code or in either public variable.
3. Configure Authentication site URL and callback `https://YOUR_HOST/auth/callback`; verify email delivery/redirects with synthetic accounts.
4. Build tenant-scoped Postgres repositories, trusted organization/class provisioning, and transactional attempt persistence/finalization.
5. Use isolated synthetic users/records to test student-vs-student, teacher-vs-class, and organization boundaries via both direct Data API/RPC and the app. Verify allowed and denied reads/writes; do not use shared real learner data.
6. Re-run Supabase Advisors and document remaining intentional warnings. Do not apply additional migrations until source and project target are verified.
