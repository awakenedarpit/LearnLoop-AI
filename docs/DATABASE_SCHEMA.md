# Database Schema — LearnLoop AI

**Status:** The normalized tables below describe the future Supabase/PostgreSQL target only. No LearnLoop Supabase project, cloud migrations, or cloud application tables exist. Separately, local `lib/db/demo-store.ts` creates fictional-only SQLite demo tables (`question_bank`, `learning_sessions`, `learning_responses`) at runtime. This document is not evidence of live cloud database state.

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

## RLS and grants (target)

Enable RLS on every exposed table. Revoke unnecessary default privileges from `anon` and `authenticated`; grant only the required operations. Policies must scope rows to the verified `auth.uid()` plus trusted organization/class membership. Students may read their own profile, assigned published quizzes (without protected answer keys), their own attempts/saved answers/submissions and their own learning sessions. Teachers may manage quizzes and review attempts only for classes they are assigned to. Organization admins may manage records only in their organization. Inserts/updates on attempts must enforce valid assignment and lifecycle on the server, with the database/RLS boundary preventing cross-user record access. Do not use a service-role key in browser clients.

Views, RPCs and functions require separate review because views can bypass RLS depending on their security mode. Migrations and automated database policy tests must be committed. The official Supabase RLS guide recommends RLS plus explicit grants/policies for exposed tables; see `docs/DECISIONS.md`.

## Migration plan

Apply additive, deterministic migrations in `supabase/migrations/`, record versioned seed data separately, and never overwrite user edits on startup. Use disposable fixtures for tests. The only production target is a dedicated LearnLoop Supabase project after its quota blocker is resolved and configuration is authorized; unrelated existing projects are not migration targets.
