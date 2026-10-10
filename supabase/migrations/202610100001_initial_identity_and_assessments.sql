-- LearnLoop AI identity and assessment schema.
-- Apply only to a dedicated LearnLoop Supabase project after reviewing this migration.
-- Never run against unrelated or production databases without a reviewed migration plan.

create extension if not exists pgcrypto;

create type public.app_role as enum ('student', 'teacher', 'org_admin');
create type public.quiz_status as enum ('draft', 'published', 'archived');
create type public.attempt_status as enum ('in_progress', 'submitted', 'expired');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role public.app_role not null default 'student',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.teacher_quizzes (
  id uuid primary key default gen_random_uuid(),
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
  student_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (quiz_id, student_id)
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.teacher_quizzes(id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete restrict,
  status public.attempt_status not null default 'in_progress',
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score_percent integer check (score_percent between 0 and 100),
  correct_count integer check (correct_count >= 0),
  total_questions integer not null check (total_questions > 0),
  unique (id, student_id)
);

create table public.quiz_attempt_answers (
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id uuid not null references public.quiz_questions(id) on delete restrict,
  selected_option_index integer check (selected_option_index between 0 and 3),
  answered_at timestamptz not null default now(),
  primary key (attempt_id, question_id)
);

create index teacher_quizzes_owner_updated_idx on public.teacher_quizzes(owner_id, updated_at desc);
create index quiz_assignments_student_idx on public.quiz_assignments(student_id, created_at desc);
create index quiz_attempts_student_idx on public.quiz_attempts(student_id, started_at desc);
create index quiz_attempts_quiz_idx on public.quiz_attempts(quiz_id, started_at desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'name', '')), ''),
    'student'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.teacher_quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_assignments enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_attempt_answers enable row level security;

-- Profile roles are assigned from trusted administrative tooling, not signup metadata.
create policy "users can read their own profile"
on public.profiles for select to authenticated
using (id = (select auth.uid()));

create policy "users can update their own display name"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()) and role = (select p.role from public.profiles p where p.id = (select auth.uid())));

create policy "teachers manage their own quizzes"
on public.teacher_quizzes for all to authenticated
using (
  owner_id = (select auth.uid())
  and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('teacher', 'org_admin'))
)
with check (
  owner_id = (select auth.uid())
  and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('teacher', 'org_admin'))
);

-- Questions can be read by the owning teacher, or by students assigned to a
-- published quiz. Correct-answer columns must still be omitted by API DTOs until grading.
create policy "teachers manage questions for their quizzes"
on public.quiz_questions for all to authenticated
using (exists (
  select 1 from public.teacher_quizzes q
  join public.profiles p on p.id = (select auth.uid())
  where q.id = quiz_id and q.owner_id = (select auth.uid()) and p.role in ('teacher', 'org_admin')
))
with check (exists (
  select 1 from public.teacher_quizzes q
  join public.profiles p on p.id = (select auth.uid())
  where q.id = quiz_id and q.owner_id = (select auth.uid()) and p.role in ('teacher', 'org_admin')
));

create policy "assigned students can read published quizzes"
on public.quiz_assignments for select to authenticated
using (student_id = (select auth.uid()));

create policy "teachers manage assignments for owned quizzes"
on public.quiz_assignments for all to authenticated
using (assigned_by = (select auth.uid()) and exists (
  select 1 from public.teacher_quizzes q where q.id = quiz_id and q.owner_id = (select auth.uid())
))
with check (assigned_by = (select auth.uid()) and exists (
  select 1 from public.teacher_quizzes q where q.id = quiz_id and q.owner_id = (select auth.uid())
));

create policy "students see their own attempts"
on public.quiz_attempts for select to authenticated
using (student_id = (select auth.uid()));

create policy "students create their own attempts"
on public.quiz_attempts for insert to authenticated
with check (student_id = (select auth.uid()) and status = 'in_progress');

create policy "teachers read attempts for owned quizzes"
on public.quiz_attempts for select to authenticated
using (exists (
  select 1 from public.teacher_quizzes q
  where q.id = quiz_id and q.owner_id = (select auth.uid())
));

create policy "students read and save their own attempt answers"
on public.quiz_attempt_answers for all to authenticated
using (exists (
  select 1 from public.quiz_attempts a where a.id = attempt_id and a.student_id = (select auth.uid()) and a.status = 'in_progress'
))
with check (exists (
  select 1 from public.quiz_attempts a where a.id = attempt_id and a.student_id = (select auth.uid()) and a.status = 'in_progress'
));

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.teacher_quizzes to authenticated;
grant select, insert, update, delete on public.quiz_questions to authenticated;
grant select, insert, delete on public.quiz_assignments to authenticated;
grant select, insert on public.quiz_attempts to authenticated;
grant select, insert, update, delete on public.quiz_attempt_answers to authenticated;
