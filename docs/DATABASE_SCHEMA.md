# Database Schema — LearnLoop AI

**Status (2026-10-11):** Dedicated LearnLoop Supabase project `rlglcgtamqwqzmkitdtn` exists. Three migrations have been applied, creating the organization/class and assessment tables listed below (14 public application tables). Live metadata confirms RLS enabled on all 14 and the expected key constraints. The table names below are a target-level overview, not exact names/columns: the current implementation uses `teacher_quizzes`, `quiz_questions`, `quiz_assignments`, `quiz_attempts`, and `quiz_attempt_answers`; `organization_memberships` contains a composite `(organization_id,user_id)` primary key; there is no role column in `profiles`. Application services still use local SQLite (`question_bank`, `learning_sessions`, `learning_responses`), so cloud application persistence is not implemented. No authenticated row-isolation test has passed.

## Core tables

| Table | Main columns and purpose | Relationships / constraints |
|---|---|---|
| `organizations` | `id uuid PK`, `name`, `created_at` | Organization tenant root. |
| `profiles` | `id uuid PK` (same as `auth.users.id`), `display_name`, `created_at`, `updated_at` | One profile per Supabase user. Role is assigned through a controlled membership table, not accepted from the browser. |
| `organization_memberships` | `id uuid PK`, `organization_id`, `user_id`, `role` (`student`,`teacher`,`org_admin`), `created_at` | FKs to organizations/profiles; unique `(organization_id,user_id)`; role check constraint. |
| `classes` | `id uuid PK`, `organization_id`, `name`, `created_by`, `created_at`, `archived_at nullable` | FKs to organization/profile; indexes by tenant and active state. |
| `class_memberships` | `class_id`, `student_id`, `joined_at`, `status` | Composite PK `(class_id,student_id)`; unique membership; class/student FKs. |
| `class_teachers` | `class_id`, `teacher_id`, `assigned_at` | Composite PK `(class_id,teacher_id)`; authorized teaching scope. |
| `quizzes` | `id uuid PK`, `organization_id`, `created_by`, `title`, `instructions`, `duration_seconds`, `available_from`, `available_until`, `attempt_limit`, `status` (`draft`,`published`,`archived`), `created_at`, `updated_at` | FKs to tenant/teacher; duration > 0; time window check; indexes `(organization_id,status)` and `(available_from,available_until)`. |
| `questions` | `id uuid PK`, `quiz_id`, `position`, `prompt`, `options jsonb`, `correct_option_id`, `explanation`, `concept`, `difficulty`, `created_at` | FK to quiz; unique `(quiz_id,position)`; valid concept/difficulty checks. Correct answer fields are never exposed before permitted release. |
| `assessment_assignments` | `id uuid PK`, `quiz_id`, `class_id`, `assigned_by`, `assigned_at`, `due_at`, `status` | FKs to quiz/class/teacher; unique `(quiz_id,class_id)`; index by class/due date. |
| `assessment_attempts` | `id uuid PK`, `assignment_id`, `student_id`, `attempt_number`, `status` (`in_progress`,`submitted`,`expired`,`terminated`), `started_at`, `deadline_at`, `finalized_at`, `termination_reason`, `score`, `total_points`, `created_at`, `updated_at` | FKs to assignment/student; unique `(assignment_id,student_id,attempt_number)`; check score bounds; indexes `(student_id,status)` and `(assignment_id,status)`. |
| `saved_answers` | `attempt_id`, `question_id`, `selected_option_id`, `saved_at`, `version` | Composite PK `(attempt_id,question_id)`; FKs; latest confirmed server save is authoritative. No answer writes after finalization. |
| `submissions` | `id uuid PK`, `attempt_id unique`, `student_id`, `score`, `submitted_at`, `finalization_key` | One final submission per attempt; unique finalization key for idempotence; score copied from server result. |
| `learning_sessions` | `id uuid PK`, `student_id`, `kind` (`diagnostic`,`practice`,`reassessment`), `started_at`, `completed_at`, `score`, `total_questions`, `source_session_id nullable` | Student ownership; source session supports honest comparison/recommendations. |
| `learning_responses` | `id uuid PK`, `session_id`, `question_id`, `concept`, `selected_option_id`, `is_correct`, `confidence nullable`, `answered_at` | FK to session; concept check; unique `(session_id,question_id)`. |
| `access_denials` | `id uuid PK`, `assignment_id`, `student_id nullable`, `reason`, `occurred_at` | No fake attempt/submission; indexes by assessment/time. |
| `integrity_events` | `id uuid PK`, `attempt_id`, `event_type`, `occurred_at`, `metadata jsonb` | Event types are reviewable signals only; metadata minimized. |

Use `timestamptz` for server timestamps, generated UUIDs, `NOT NULL` where required, explicit `CHECK` constraints for statuses and score ranges, and foreign-key deletion rules that preserve submitted records. Avoid storing real learner data in demo seeds.

## RLS and grants

RLS is enabled on all current public application tables. The corrective migration revokes inherited default privileges and restores narrowly scoped grants; specifically, authenticated users cannot write submissions or update attempt lifecycle/result fields. Current policies scope intended rows using verified `auth.uid()` and membership/class assignment predicates, but role-scoped behavior remains untested with actual users. Use these policies as a foundation, not proof of production security. Teacher/API data access, admin provisioning, and transactional finalization are not implemented. Do not use a service-role key in browser clients.

Views, RPCs and functions require separate review because views can bypass RLS depending on their security mode. Migrations and automated database policy tests must be committed. The official Supabase RLS guide recommends RLS plus explicit grants/policies for exposed tables; see `docs/DECISIONS.md`.

## Migration plan

Applied to the dedicated LearnLoop project: `202610100001_initial_identity_and_assessments.sql`, `202610100002_correct_rls_correlations_and_grants.sql`, and `202610100003_move_internal_functions_private.sql`. Continue with additive, deterministic migrations and separate seed data; use disposable fixtures for tests. Never target either unrelated existing project.
