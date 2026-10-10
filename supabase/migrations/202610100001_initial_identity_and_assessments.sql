-- LearnLoop AI production identity, class, assessment, persistence, and audit schema.
-- Apply only to the dedicated LearnLoop Supabase project.
-- Roles are assigned by trusted administrators; signup metadata is never authoritative.
create extension if not exists pgcrypto;

create type public.app_role as enum ('student', 'teacher', 'org_admin');
create type public.quiz_status as enum ('draft', 'published', 'archived');
create type public.attempt_status as enum ('in_progress', 'submitted', 'expired', 'terminated');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  created_at timestamptz not null default now()
);
create table public.organization_memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);
create table public.class_memberships (
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active', 'removed')),
  primary key (class_id, student_id)
);
create table public.class_teachers (
  class_id uuid not null references public.classes(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (class_id, teacher_id)
);
create table public.teacher_quizzes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  title text not null check (char_length(title) between 3 and 120),
  instructions text not null default '',
  duration_minutes integer not null check (duration_minutes between 1 and 240),
  available_from timestamptz,
  available_until timestamptz,
  attempt_limit integer not null default 1 check (attempt_limit between 1 and 10),
  status public.quiz_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (available_until is null or available_from is null or available_until > available_from)
);
create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.teacher_quizzes(id) on delete cascade,
  position integer not null check (position between 0 and 99),
  prompt text not null check (char_length(prompt) between 5 and 1000),
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) = 4),
  correct_option_index integer not null check (correct_option_index between 0 and 3),
  explanation text not null default '',
  concept text not null default 'General',
  unique (quiz_id, position)
);
create table public.quiz_assignments (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.teacher_quizzes(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  assigned_by uuid not null references public.profiles(id) on delete restrict,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  unique (quiz_id, class_id)
);
create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.quiz_assignments(id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete restrict,
  attempt_number integer not null check (attempt_number between 1 and 10),
  status public.attempt_status not null default 'in_progress',
  started_at timestamptz not null default now(),
  deadline_at timestamptz not null,
  submitted_at timestamptz,
  termination_reason text,
  score_percent integer check (score_percent between 0 and 100),
  correct_count integer check (correct_count >= 0),
  total_questions integer not null check (total_questions > 0),
  unique (assignment_id, student_id, attempt_number),
  unique (id, student_id)
);
create table public.quiz_attempt_answers (
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id uuid not null references public.quiz_questions(id) on delete restrict,
  selected_option_index integer check (selected_option_index between 0 and 3),
  answered_at timestamptz not null default now(),
  primary key (attempt_id, question_id)
);
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null unique references public.quiz_attempts(id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete restrict,
  score_percent integer not null check (score_percent between 0 and 100),
  submitted_at timestamptz not null default now(),
  finalization_key uuid not null unique
);
create table public.access_denials (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references public.quiz_assignments(id) on delete set null,
  student_id uuid references public.profiles(id) on delete set null,
  reason text not null check (reason in ('not_assigned', 'not_available', 'deadline_passed', 'attempt_limit', 'class_access_denied', 'other')),
  occurred_at timestamptz not null default now()
);
create table public.integrity_events (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  event_type text not null check (event_type in ('focus_lost', 'fullscreen_exit', 'visibility_hidden')),
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object')
);
create index organization_memberships_user_idx on public.organization_memberships(user_id, organization_id);
create index classes_org_active_idx on public.classes(organization_id, archived_at);
create index class_memberships_student_idx on public.class_memberships(student_id, class_id);
create index class_teachers_teacher_idx on public.class_teachers(teacher_id, class_id);
create index teacher_quizzes_owner_updated_idx on public.teacher_quizzes(owner_id, updated_at desc);
create index quiz_assignments_class_due_idx on public.quiz_assignments(class_id, due_at);
create index quiz_attempts_student_idx on public.quiz_attempts(student_id, started_at desc);
create index quiz_attempts_assignment_idx on public.quiz_attempts(assignment_id, started_at desc);
create index access_denials_student_time_idx on public.access_denials(student_id, occurred_at desc);
create index integrity_events_attempt_time_idx on public.integrity_events(attempt_id, occurred_at desc);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(trim(coalesce(new.raw_user_meta_data ->> 'name', '')), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Narrow helpers avoid recursive membership policies. They are not exposed to anon.
create or replace function public.is_org_member(p_org uuid, p_roles public.app_role[] default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_memberships m
    where m.organization_id = p_org and m.user_id = (select auth.uid())
      and (p_roles is null or m.role = any(p_roles))
  );
$$;
create or replace function public.teaches_class(p_class uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.class_teachers t where t.class_id = p_class and t.teacher_id = (select auth.uid()))
  or exists (
    select 1 from public.classes c join public.organization_memberships m on m.organization_id = c.organization_id
    where c.id = p_class and m.user_id = (select auth.uid()) and m.role = 'org_admin'
  );
$$;
create or replace function public.can_review_assignment(p_assignment uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.quiz_assignments a
    where a.id = p_assignment and public.teaches_class(a.class_id)
  );
$$;
revoke all on function public.is_org_member(uuid, public.app_role[]) from public, anon;
revoke all on function public.teaches_class(uuid) from public, anon;
revoke all on function public.can_review_assignment(uuid) from public, anon;
grant execute on function public.is_org_member(uuid, public.app_role[]) to authenticated;
grant execute on function public.teaches_class(uuid) to authenticated;
grant execute on function public.can_review_assignment(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.classes enable row level security;
alter table public.class_memberships enable row level security;
alter table public.class_teachers enable row level security;
alter table public.teacher_quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_assignments enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_attempt_answers enable row level security;
alter table public.submissions enable row level security;
alter table public.access_denials enable row level security;
alter table public.integrity_events enable row level security;

create policy "profiles read self or organization peers" on public.profiles for select to authenticated
using (id = (select auth.uid()) or exists (
  select 1 from public.organization_memberships mine
  join public.organization_memberships peer using (organization_id)
  where mine.user_id = (select auth.uid()) and peer.user_id = profiles.id
));
create policy "members read own organizations" on public.organizations for select to authenticated
using (public.is_org_member(id));
create policy "members read organization membership" on public.organization_memberships for select to authenticated
using (user_id = (select auth.uid()) or public.is_org_member(organization_id));
create policy "authorized users read classes" on public.classes for select to authenticated
using (public.is_org_member(organization_id) and (
  public.is_org_member(organization_id, array['org_admin']::public.app_role[])
  or exists (select 1 from public.class_teachers t where t.class_id = id and t.teacher_id = (select auth.uid()))
  or exists (select 1 from public.class_memberships s where s.class_id = id and s.student_id = (select auth.uid()) and s.status = 'active')
));
create policy "authorized class membership read" on public.class_memberships for select to authenticated
using (student_id = (select auth.uid()) or public.teaches_class(class_id));
create policy "authorized class teacher read" on public.class_teachers for select to authenticated
using (teacher_id = (select auth.uid()) or public.teaches_class(class_id));
create policy "teachers read and manage own quizzes" on public.teacher_quizzes for all to authenticated
using (owner_id = (select auth.uid()) and public.is_org_member(organization_id, array['teacher','org_admin']::public.app_role[]))
with check (owner_id = (select auth.uid()) and public.is_org_member(organization_id, array['teacher','org_admin']::public.app_role[]));
create policy "assigned students read published quiz metadata" on public.teacher_quizzes for select to authenticated
using (status = 'published' and (available_from is null or available_from <= now())
  and (available_until is null or available_until >= now())
  and exists (select 1 from public.quiz_assignments a join public.class_memberships cm on cm.class_id = a.class_id
    where a.quiz_id = id and cm.student_id = (select auth.uid()) and cm.status = 'active'));
-- Student SQL reads cannot access quiz_questions at all; safe content must come from the allowlisted RPC.
create policy "quiz authors manage question rows" on public.quiz_questions for all to authenticated
using (exists (select 1 from public.teacher_quizzes q where q.id = quiz_id and q.owner_id = (select auth.uid())
  and public.is_org_member(q.organization_id, array['teacher','org_admin']::public.app_role[])))
with check (exists (select 1 from public.teacher_quizzes q where q.id = quiz_id and q.owner_id = (select auth.uid())
  and public.is_org_member(q.organization_id, array['teacher','org_admin']::public.app_role[])));
create policy "class members read assignments" on public.quiz_assignments for select to authenticated
using (public.teaches_class(class_id) or exists (
  select 1 from public.class_memberships cm where cm.class_id = class_id and cm.student_id = (select auth.uid()) and cm.status = 'active'
));
create policy "authorized teacher manages class assignments" on public.quiz_assignments for all to authenticated
using (assigned_by = (select auth.uid()) and public.teaches_class(class_id)
  and exists (select 1 from public.teacher_quizzes q where q.id = quiz_id and q.owner_id = (select auth.uid())))
with check (assigned_by = (select auth.uid()) and public.teaches_class(class_id)
  and exists (select 1 from public.teacher_quizzes q where q.id = quiz_id and q.owner_id = (select auth.uid())));
create policy "students read own attempts" on public.quiz_attempts for select to authenticated
using (student_id = (select auth.uid()));
create policy "teachers read assigned attempts" on public.quiz_attempts for select to authenticated
using (public.can_review_assignment(assignment_id));
create policy "students create own active assigned attempts" on public.quiz_attempts for insert to authenticated
with check (student_id = (select auth.uid()) and status = 'in_progress' and submitted_at is null
  and exists (select 1 from public.quiz_assignments a join public.class_memberships cm on cm.class_id = a.class_id
    join public.teacher_quizzes q on q.id = a.quiz_id
    where a.id = assignment_id and cm.student_id = (select auth.uid()) and cm.status = 'active'
      and q.status = 'published' and (q.available_from is null or q.available_from <= now())
      and (q.available_until is null or q.available_until >= now())));
create policy "students manage own in progress saved answers" on public.quiz_attempt_answers for all to authenticated
using (exists (select 1 from public.quiz_attempts a where a.id = attempt_id and a.student_id = (select auth.uid()) and a.status = 'in_progress'))
with check (exists (select 1 from public.quiz_attempts a where a.id = attempt_id and a.student_id = (select auth.uid()) and a.status = 'in_progress')
  and exists (select 1 from public.quiz_questions q where q.id = question_id));
create policy "students read own submissions" on public.submissions for select to authenticated
using (student_id = (select auth.uid()));
create policy "teachers read assigned submissions" on public.submissions for select to authenticated
using (exists (select 1 from public.quiz_attempts a where a.id = attempt_id and public.can_review_assignment(a.assignment_id)));
create policy "students read own integrity signals" on public.integrity_events for select to authenticated
using (exists (select 1 from public.quiz_attempts a where a.id = attempt_id and a.student_id = (select auth.uid())));
create policy "teachers review integrity signals" on public.integrity_events for select to authenticated
using (exists (select 1 from public.quiz_attempts a where a.id = attempt_id and public.can_review_assignment(a.assignment_id)));
create policy "student records own integrity signals" on public.integrity_events for insert to authenticated
with check (exists (select 1 from public.quiz_attempts a where a.id = attempt_id and a.student_id = (select auth.uid()) and a.status = 'in_progress'));
create policy "students read own denials" on public.access_denials for select to authenticated
using (student_id = (select auth.uid()));
create policy "teachers read class access denials" on public.access_denials for select to authenticated
using (assignment_id is not null and public.can_review_assignment(assignment_id));
create policy "students record their own denial" on public.access_denials for insert to authenticated
with check (student_id = (select auth.uid()));

-- Minimal grants: no client DML on memberships, scores, or submissions.
grant select on public.profiles, public.organizations, public.organization_memberships,
  public.classes, public.class_memberships, public.class_teachers,
  public.teacher_quizzes, public.quiz_assignments, public.quiz_attempts,
  public.submissions, public.access_denials, public.integrity_events to authenticated;
grant insert, update, delete on public.teacher_quizzes to authenticated;
grant insert, update, delete on public.quiz_questions to authenticated;
grant insert, update, delete on public.quiz_assignments to authenticated;
grant insert, update on public.quiz_attempts to authenticated;
grant select, insert, update on public.quiz_attempt_answers to authenticated;
grant insert on public.access_denials, public.integrity_events to authenticated;
revoke all on public.profiles, public.organizations, public.organization_memberships,
  public.classes, public.class_memberships, public.class_teachers,
  public.teacher_quizzes, public.quiz_questions, public.quiz_assignments,
  public.quiz_attempts, public.quiz_attempt_answers, public.submissions,
  public.access_denials, public.integrity_events from anon;

-- Narrow assigned quiz DTO omits correct answers and explanations entirely.
create or replace function public.get_assigned_quiz(p_quiz_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', q.id, 'title', q.title, 'instructions', q.instructions,
    'durationMinutes', q.duration_minutes, 'availableFrom', q.available_from,
    'availableUntil', q.available_until, 'attemptLimit', q.attempt_limit,
    'questions', coalesce((select jsonb_agg(jsonb_build_object(
      'id', question.id, 'prompt', question.prompt, 'options', question.options, 'concept', question.concept
    ) order by question.position) from public.quiz_questions question where question.quiz_id = q.id), '[]'::jsonb)
  )
  from public.teacher_quizzes q
  where q.id = p_quiz_id and q.status = 'published'
    and (q.available_from is null or q.available_from <= now())
    and (q.available_until is null or q.available_until >= now())
    and exists (select 1 from public.quiz_assignments a join public.class_memberships cm on cm.class_id = a.class_id
      where a.quiz_id = q.id and cm.student_id = (select auth.uid()) and cm.status = 'active')
$$;
revoke all on function public.get_assigned_quiz(uuid) from public, anon;
grant execute on function public.get_assigned_quiz(uuid) to authenticated;
