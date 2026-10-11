# Database Schema — LearnLoop AI

## Current live status

The intended Supabase project **LearnLoop** (`rlglcgtamqwqzmkitdtn`, `ap-south-1`) is `ACTIVE_HEALTHY`. Read-only inspection on 2026-10-11 returned 14 public application tables; **all 14 have RLS enabled and all report zero rows**. Keys, table columns, policy text and grants were inspected. No authenticated-user RLS/authorization test has passed. The application still uses local SQLite; the live schema is not yet wired into app services.

Live ledger:

| Version | Name | Source in this checkout |
|---|---|---|
| `20261010192616` | `initial_identity_assessments_multitenancy` | Present as `202610100001_initial_identity_and_assessments.sql` |
| `20261010192807` | `correct_rls_correlations_and_grants` | Present as `202610100002_correct_rls_correlations_and_grants.sql` |
| `20261010193044` | `move_internal_functions_to_private_schema` | Present as `202610100003_move_internal_functions_private.sql` |
| `20261010195206` | `secure_assessment_attempt_lifecycle` | **Missing from this checkout** |

Recover and review the exact fourth migration source before considering the database reproducible from Git or applying later changes. Do not guess or replay it.

## Deployed public application tables

| Table | Purpose and notable current fields |
|---|---|
| `profiles` | Auth user profile: `id`, `display_name`, `created_at`, `updated_at` |
| `organizations` | Tenant root: `id`, `name`, `created_at` |
| `organization_memberships` | Composite PK `(organization_id,user_id)`, enum role `student`/`teacher`/`org_admin` |
| `classes` | Tenant class: `organization_id`, `name`, `created_by`, `archived_at` |
| `class_memberships` | Composite PK `(class_id,student_id)`, joined timestamp and active/removed status |
| `class_teachers` | Composite PK `(class_id,teacher_id)` |
| `teacher_quizzes` | Quiz metadata/ownership, duration, availability, attempt limit, draft/published/archived status |
| `quiz_questions` | Four-option JSON array, `correct_option_index`, explanation and concept; answer key kept from direct student table access |
| `quiz_assignments` | Links quiz and class; assigner and optional `due_at` |
| `quiz_attempts` | Student/assignment/attempt number, status, authoritative start/deadline, submit state, score/counts |
| `quiz_attempt_answers` | Composite PK `(attempt_id,question_id)`, selected option index and `answered_at` |
| `submissions` | One unique row per attempt, student, score, timestamp and idempotent finalization key |
| `access_denials` | Optional assignment/student, reason and timestamp |
| `integrity_events` | Attempt, allowed signal type, timestamp and metadata JSON |

`learning_sessions` and `learning_responses` are used by the local SQLite demo and are not among the live Supabase project's 14 public tables. Cloud learning-schema/repository support remains unimplemented.

## RLS, grants and policies

Catalog inspection confirms `relrowsecurity=true` for all 14 tables (none has `FORCE ROW LEVEL SECURITY`). The policy predicates use `auth.uid()`, membership, assignment, attempt ownership and private helper functions. Authenticated direct table privileges are constrained: attempt answers and submissions are not directly writable by students; attempt lifecycle/result updates are not directly granted. Assessment lifecycle is exposed through server-side RPC functions. These observations are metadata, not a behavior proof. Test both allowed and denied paths under real authenticated synthetic student/teacher/admin sessions before handling learner data.

Security Advisor currently flags five public `SECURITY DEFINER` functions as executable by `authenticated`: `get_assigned_quiz(uuid)`, `list_assigned_quizzes()`, `start_assessment_attempt(uuid)`, `save_assessment_answers(uuid,jsonb)`, and `finalize_assessment_attempt(uuid,jsonb)`. Manual function-definition inspection found `search_path=''`, actor scoping through `auth.uid()` and attempt/assignment checks; the student quiz DTO excludes answer keys/explanations before submission. The warnings remain open pending direct authenticated RPC tests and a deliberate decision on whether each wrapper must remain exposed. See [`SECURITY.md`](SECURITY.md) and [Supabase linter 0029](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

Performance Advisor also reported 16 unused indexes (all tables currently empty) and six multiple-permissive-policy notices. Do not remove indexes based solely on this empty-database snapshot; revisit after representative workload data/tests.

## Future cloud learning schema

The app's demo SQLite tables `question_bank`, `learning_sessions`, and `learning_responses` are not persisted to this Supabase project. Design and migrate tenant-safe cloud learning tables/repositories only after confirming data ownership and consent, then test RLS and session recovery with disposable synthetic users.
