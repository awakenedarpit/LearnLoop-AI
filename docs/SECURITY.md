# Security — LearnLoop AI

## Verified status

LearnLoop Supabase project `rlglcgtamqwqzmkitdtn` is `ACTIVE_HEALTHY`; four migrations are recorded. Live metadata shows RLS enabled on all 14 public application tables, all currently reporting zero rows. Policies and grants were inspected. This is not proof of effective isolation: no authenticated student/teacher sessions or direct RPC allow/deny tests have been run. One live database migration (`secure_assessment_attempt_lifecycle`) has no matching source file in the current Git checkout; recover and review it before claiming a reproducible database build.

The web application still runs learning and teacher-assessment services through a local fictional `node:sqlite` adapter. The database schema, Supabase SSR clients and role-gate scaffold do not make those services production-persistent or suitable for real learner information.

## Identity and authorization

Cloud-mode assessment route gates validate a Supabase Auth user with `auth.getUser()` and resolve role from a trusted `organization_memberships` row. Never accept a client-supplied role, `student_id`, class ownership or teacher authorization as truth. This is only route-gate scaffolding: no trusted membership/admin provisioning exists, app services remain demo-backed, no authenticated user journey passed, and multi-organization context selection is incomplete.

Every future cloud handler must verify identity, organization, class membership, quiz assignment, attempt owner and lifecycle. RLS must enforce the same row boundaries. Demo mode uses a fixed fictional learner and is never a substitute for sign-in; do not enter real learner records.

## RLS, grants, and Security Advisor

Read-only catalog inspection confirmed all 14 current public tables have RLS enabled. Authenticated table grants are constrained; attempt lifecycle/result and submission writes are intended to go through server-side functions rather than direct student table writes. Metadata inspection does not simulate the effective behavior of real users.

Security Advisor reports five warnings for authenticated execution of public `SECURITY DEFINER` RPCs: `get_assigned_quiz`, `list_assigned_quizzes`, `start_assessment_attempt`, `save_assessment_answers`, and `finalize_assessment_attempt`. The functions were manually inspected: `search_path=''` is set; user-specific operations bind to `auth.uid()` and check assignment/attempt ownership; the student quiz DTO omits correct answers/explanations before submission. Treat these as intentionally callable wrappers only provisionally. The warnings remain open until direct authenticated RPC tests show that actor scoping, answer-key withholding, assignment availability, attempts and finalization cannot be bypassed. Review the official [0029 linter guidance](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) before deciding whether wrappers should instead be moved/restricted.

Performance Advisor reported 16 unused-index notices on the empty/new database and six multiple-permissive-policy notices. Review these after representative workload tests; do not remove indexes solely based on a zero-usage snapshot.

## Assessment integrity

The local HTTP integration verifies quiz validation, answer-key withholding, saved-answer recovery, expiry, server-side scoring, idempotent finalization, immutable submitted answers, teacher review and CSV neutralization. Expiry is advanced in the disposable SQLite test database. These are demo behaviors and do not prove Postgres transaction, concurrency or multi-instance safety.

In the live SQL schema, answer changes/finalization are exposed through `SECURITY DEFINER` RPC wrappers; function definitions reviewed in this task validate answer keys/question IDs and compute scores from database-held correct options. Test direct PostgREST/RPC calls with synthetic authenticated users, including foreign attempts, wrong role, malformed answers, repeated finalization, after-deadline saves, membership removal and other-class/tenant IDs. Do not use real learner accounts for these tests.

## Secrets, AI, and operations

`GEMINI_API_KEY`, Supabase service-role credentials, passwords and signing keys are secrets. Use protected runtime configuration; never request/commit secrets or place them in browser code, docs, screenshots or logs. Gemini is not implemented in the application, and no provider request/key has been verified. Do not describe the app as production-ready or the database as production-integrated until repository adapters, auth provisioning, tests, migration reproducibility and deployment are completed.

## Release requirements

Recover/review the fourth migration source; implement tenant-scoped PostgreSQL repositories and atomic attempt finalization; provision memberships through a trusted flow; run authenticated student-vs-student and teacher-vs-class/org allow/deny/RPC tests; verify auth callback/email configuration; review RPC Advisor warnings and audit logs/rate limits/dependencies; identify the correct Vercel project; and verify a deployed synthetic-data smoke test.
