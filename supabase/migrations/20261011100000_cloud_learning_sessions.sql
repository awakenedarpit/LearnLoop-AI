-- Durable per-user Python fundamentals learning sessions.
-- Apply through Supabase migrations after review; do not replay against a project
-- whose migration ledger already contains this version.
create table public.learning_question_keys (
  question_id text primary key,
  concept text not null,
  question_order integer not null check (question_order between 1 and 99),
  correct_option_id text not null check (correct_option_id in ('a','b','c','d')),
  unique (concept, question_order)
);

insert into public.learning_question_keys(question_id, concept, question_order, correct_option_id) values
  ('variables-01','variables',1,'a'),
  ('variables-02','variables',2,'a'),
  ('variables-03','variables',3,'b'),
  ('data-types-01','data-types',1,'a'),
  ('data-types-02','data-types',2,'a'),
  ('data-types-03','data-types',3,'a'),
  ('conditionals-01','conditionals',1,'a'),
  ('conditionals-02','conditionals',2,'a'),
  ('conditionals-03','conditionals',3,'a'),
  ('loops-01','loops',1,'a'),
  ('loops-02','loops',2,'a'),
  ('loops-03','loops',3,'a'),
  ('functions-01','functions',1,'a'),
  ('functions-02','functions',2,'a'),
  ('functions-03','functions',3,'a'),
  ('lists-01','lists',1,'a'),
  ('lists-02','lists',2,'a'),
  ('lists-03','lists',3,'a')
on conflict (question_id) do update set
  concept = excluded.concept,
  question_order = excluded.question_order,
  correct_option_id = excluded.correct_option_id;

create table public.learning_sessions (
  session_id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('diagnostic','practice','reassessment')),
  status text not null default 'in_progress' check (status in ('in_progress','completed')),
  question_ids jsonb not null check (jsonb_typeof(question_ids) = 'array' and jsonb_array_length(question_ids) > 0),
  comparison_session_id uuid references public.learning_sessions(session_id) on delete set null,
  score_percent integer check (score_percent between 0 and 100),
  correct_count integer check (correct_count >= 0),
  answered_count integer check (answered_count >= 0),
  total_questions integer not null check (total_questions > 0),
  gaps jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  check ((status = 'in_progress' and completed_at is null) or (status = 'completed' and completed_at is not null))
);

create table public.learning_responses (
  session_id uuid not null references public.learning_sessions(session_id) on delete cascade,
  question_id text not null references public.learning_question_keys(question_id) on delete restrict,
  selected_option_id text not null check (selected_option_id in ('a','b','c','d')),
  confidence text check (confidence in ('guessing','somewhat','confident')),
  answered_at timestamptz not null default now(),
  primary key (session_id, question_id)
);

create index learning_sessions_student_started_idx
  on public.learning_sessions(student_id, started_at desc);
create index learning_sessions_student_kind_status_idx
  on public.learning_sessions(student_id, kind, status);
create index learning_responses_session_idx on public.learning_responses(session_id);

alter table public.learning_question_keys enable row level security;
alter table public.learning_sessions enable row level security;
alter table public.learning_responses enable row level security;

revoke all on public.learning_question_keys, public.learning_sessions, public.learning_responses from public, anon, authenticated;
grant select on public.learning_sessions, public.learning_responses to authenticated;
grant insert(student_id, kind, status, question_ids, comparison_session_id, total_questions)
  on public.learning_sessions to authenticated;
grant update(status) on public.learning_sessions to authenticated;
grant insert(session_id, question_id, selected_option_id, confidence),
  update(selected_option_id, confidence)
  on public.learning_responses to authenticated;

create policy "learners read their own learning sessions"
  on public.learning_sessions for select to authenticated
  using (student_id = (select auth.uid()));
create policy "learners create their own learning sessions"
  on public.learning_sessions for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and status = 'in_progress'
    and score_percent is null
    and correct_count is null
    and answered_count is null
    and gaps is null
    and completed_at is null
    and total_questions = jsonb_array_length(question_ids)
    and not exists (
      select 1
      from jsonb_array_elements_text(question_ids) q(question_id)
      left join public.learning_question_keys bank on bank.question_id = q.question_id
      where bank.question_id is null
    )
  );
create policy "learners complete their own active learning sessions"
  on public.learning_sessions for update to authenticated
  using (student_id = (select auth.uid()) and status = 'in_progress')
  with check (student_id = (select auth.uid()));

create policy "learners read their own learning responses"
  on public.learning_responses for select to authenticated
  using (exists (
    select 1 from public.learning_sessions s
    where s.session_id = learning_responses.session_id
      and s.student_id = (select auth.uid())
  ));
create policy "learners save answers to their own active sessions"
  on public.learning_responses for insert to authenticated
  with check (exists (
    select 1 from public.learning_sessions s
    where s.session_id = learning_responses.session_id
      and s.student_id = (select auth.uid())
      and s.status = 'in_progress'
      and s.question_ids @> jsonb_build_array(learning_responses.question_id)
  ));
create policy "learners update answers to their own active sessions"
  on public.learning_responses for update to authenticated
  using (exists (
    select 1 from public.learning_sessions s
    where s.session_id = learning_responses.session_id
      and s.student_id = (select auth.uid())
      and s.status = 'in_progress'
      and s.question_ids @> jsonb_build_array(learning_responses.question_id)
  ))
  with check (exists (
    select 1 from public.learning_sessions s
    where s.session_id = learning_responses.session_id
      and s.student_id = (select auth.uid())
      and s.status = 'in_progress'
      and s.question_ids @> jsonb_build_array(learning_responses.question_id)
  ));

create or replace function public.finalize_learning_session()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_correct integer;
  v_answered integer;
  v_total integer;
  v_completed_at timestamptz;
  v_gaps jsonb;
begin
  if old.status = 'completed' then
    raise exception 'SESSION_COMPLETED';
  end if;
  if new.status <> 'completed' then
    return new;
  end if;

  select count(*) filter (where r.selected_option_id = q.correct_option_id),
         count(r.question_id),
         count(*)
    into v_correct, v_answered, v_total
  from jsonb_array_elements_text(new.question_ids) item(question_id)
  join public.learning_question_keys q on q.question_id = item.question_id
  left join public.learning_responses r
    on r.session_id = new.session_id and r.question_id = q.question_id;

  if v_total <> jsonb_array_length(new.question_ids) or v_total = 0 then
    raise exception 'INVALID_SESSION_QUESTIONS';
  end if;

  select coalesce(jsonb_agg(concept), '[]'::jsonb)
    into v_gaps
  from (
    select q.concept
    from jsonb_array_elements_text(new.question_ids) item(question_id)
    join public.learning_question_keys q on q.question_id = item.question_id
    left join public.learning_responses r
      on r.session_id = new.session_id and r.question_id = q.question_id
    group by q.concept
    having round(100.0 * count(*) filter (where r.selected_option_id = q.correct_option_id) / count(*)) < 60
  ) g;

  v_completed_at := now();
  new.score_percent := round(100.0 * v_correct / v_total)::integer;
  new.correct_count := v_correct;
  new.answered_count := v_answered;
  new.gaps := v_gaps;
  new.completed_at := v_completed_at;
  return new;
end;
$$;

revoke all on function public.finalize_learning_session() from public, anon, authenticated;
create trigger finalize_learning_session_before_update
  before update of status on public.learning_sessions
  for each row execute function public.finalize_learning_session();
