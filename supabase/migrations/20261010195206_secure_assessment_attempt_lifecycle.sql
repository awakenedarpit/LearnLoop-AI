-- Recovered from the LearnLoop Supabase migration ledger on 2026-10-11.
-- Source statements are preserved from the recorded migration; do not replay against the already-migrated production project.

-- Server-authoritative assessment lifecycle. Student clients no longer write attempt
-- deadlines, state, grades, answers or submissions directly; RPCs own each transaction.

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
    and (q.available_until is null or q.available_until >= now() or exists (
      select 1 from public.quiz_attempts active_attempt
      join public.quiz_assignments active_assignment on active_assignment.id = active_attempt.assignment_id
      where active_assignment.quiz_id = q.id and active_attempt.student_id = (select auth.uid())
        and active_attempt.status = 'in_progress'
    ))
    and exists (
      select 1 from public.quiz_assignments a
      join public.classes c on c.id = a.class_id
      join public.class_memberships cm on cm.class_id = c.id
      where a.quiz_id = q.id and cm.student_id = (select auth.uid()) and cm.status = 'active'
        and private.is_org_member(c.organization_id, array['student']::public.app_role[])
        and c.archived_at is null
        and (a.due_at is null or a.due_at >= now() or exists (
          select 1 from public.quiz_attempts active_attempt
          where active_attempt.assignment_id = a.id and active_attempt.student_id = (select auth.uid())
            and active_attempt.status = 'in_progress'
        ))
    )
$$;

create or replace function public.list_assigned_quizzes()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', q.id, 'title', q.title, 'instructions', q.instructions,
    'durationMinutes', q.duration_minutes, 'availableFrom', q.available_from,
    'availableUntil', q.available_until, 'attemptLimit', q.attempt_limit,
    'questionCount', q.question_count, 'attemptsUsed', q.attempts_used
  ) order by q.created_at desc), '[]'::jsonb)
  from (
    select distinct on (quiz.id)
      quiz.id, quiz.title, quiz.instructions, quiz.duration_minutes, quiz.available_from,
      quiz.available_until, quiz.attempt_limit, quiz.created_at,
      (select count(*)::integer from public.quiz_questions question where question.quiz_id = quiz.id) as question_count,
      (select count(*)::integer from public.quiz_attempts attempt
        join public.quiz_assignments prior_assignment on prior_assignment.id = attempt.assignment_id
        where prior_assignment.quiz_id = quiz.id and prior_assignment.class_id = assignment.class_id
          and attempt.student_id = (select auth.uid()) and attempt.status <> 'in_progress') as attempts_used
    from public.teacher_quizzes quiz
    join public.quiz_assignments assignment on assignment.quiz_id = quiz.id
    join public.classes class_row on class_row.id = assignment.class_id
    join public.class_memberships membership on membership.class_id = class_row.id
    where membership.student_id = (select auth.uid()) and membership.status = 'active'
      and class_row.archived_at is null
      and private.is_org_member(class_row.organization_id, array['student']::public.app_role[])
      and quiz.status = 'published'
      and (quiz.available_from is null or quiz.available_from <= now())
      and (quiz.available_until is null or quiz.available_until >= now() or exists (
        select 1 from public.quiz_attempts active_attempt
        where active_attempt.assignment_id = assignment.id and active_attempt.student_id = (select auth.uid())
          and active_attempt.status = 'in_progress'
      ))
      and (assignment.due_at is null or assignment.due_at >= now() or exists (
        select 1 from public.quiz_attempts active_attempt
        where active_attempt.assignment_id = assignment.id and active_attempt.student_id = (select auth.uid())
          and active_attempt.status = 'in_progress'
      ))
    order by quiz.id, assignment.created_at desc
  ) q
$$;

create or replace function private.active_attempt_payload(p_attempt_id uuid, p_student_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'attemptId', attempt.id, 'quizId', quiz.id, 'startedAt', attempt.started_at,
    'expiresAt', attempt.deadline_at, 'status', attempt.status,
    'answers', coalesce((select jsonb_object_agg(answer.question_id::text, answer.selected_option_index)
      from public.quiz_attempt_answers answer
      where answer.attempt_id = attempt.id and answer.selected_option_index is not null), '{}'::jsonb)
  )
  from public.quiz_attempts attempt
  join public.quiz_assignments assignment on assignment.id = attempt.assignment_id
  join public.teacher_quizzes quiz on quiz.id = assignment.quiz_id
  where attempt.id = p_attempt_id and attempt.student_id = p_student_id
$$;

create or replace function private.finalized_attempt_payload(p_attempt_id uuid, p_student_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'attemptId', attempt.id, 'quizId', quiz.id, 'quizTitle', quiz.title,
    'scorePercent', attempt.score_percent, 'correctCount', attempt.correct_count,
    'totalQuestions', attempt.total_questions, 'submittedAt', attempt.submitted_at,
    'answers', coalesce((select jsonb_agg(jsonb_build_object(
      'questionId', question.id, 'prompt', question.prompt,
      'selectedOptionIndex', answer.selected_option_index,
      'selectedAnswer', case when answer.selected_option_index is null then null else question.options ->> answer.selected_option_index end,
      'correctOptionIndex', question.correct_option_index,
      'correctAnswer', question.options ->> question.correct_option_index,
      'isCorrect', answer.selected_option_index = question.correct_option_index,
      'explanation', question.explanation, 'concept', question.concept
    ) order by question.position)
      from public.quiz_questions question
      left join public.quiz_attempt_answers answer on answer.question_id = question.id and answer.attempt_id = attempt.id
      where question.quiz_id = quiz.id), '[]'::jsonb)
  )
  from public.quiz_attempts attempt
  join public.quiz_assignments assignment on assignment.id = attempt.assignment_id
  join public.teacher_quizzes quiz on quiz.id = assignment.quiz_id
  where attempt.id = p_attempt_id and attempt.student_id = p_student_id
    and attempt.status in ('submitted','expired','terminated')
$$;

create or replace function private.finalize_assessment_attempt(p_attempt_id uuid, p_student_id uuid, p_answers jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_attempt public.quiz_attempts%rowtype;
  v_assignment public.quiz_assignments%rowtype;
  v_quiz public.teacher_quizzes%rowtype;
  v_now timestamptz := clock_timestamp();
  v_expired boolean;
  v_correct integer;
  v_score integer;
  v_entry record;
  v_question_id uuid;
  v_option integer;
begin
  select * into v_attempt from public.quiz_attempts where id = p_attempt_id and student_id = p_student_id for update;
  if not found then raise exception 'ATTEMPT_NOT_FOUND'; end if;
  if v_attempt.status <> 'in_progress' then return private.finalized_attempt_payload(v_attempt.id, p_student_id); end if;
  select * into v_assignment from public.quiz_assignments where id = v_attempt.assignment_id;
  select * into v_quiz from public.teacher_quizzes where id = v_assignment.quiz_id;
  v_expired := v_now >= v_attempt.deadline_at or (v_assignment.due_at is not null and v_now >= v_assignment.due_at);
  if not v_expired then
    if p_answers is null or jsonb_typeof(p_answers) <> 'object' then raise exception 'INVALID_ANSWERS'; end if;
    if jsonb_object_length(p_answers) > 100 then raise exception 'INVALID_ANSWERS'; end if;
    for v_entry in select key, value from jsonb_each_text(p_answers) loop
      if v_entry.value is null or v_entry.key !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' or v_entry.value !~ '^[0-3]$' then raise exception 'INVALID_ANSWERS'; end if;
      v_question_id := v_entry.key::uuid;
      v_option := v_entry.value::integer;
      if not exists (select 1 from public.quiz_questions question where question.id = v_question_id and question.quiz_id = v_quiz.id) then raise exception 'INVALID_ANSWERS'; end if;
      insert into public.quiz_attempt_answers(attempt_id, question_id, selected_option_index, answered_at)
      values (v_attempt.id, v_question_id, v_option, v_now)
      on conflict (attempt_id, question_id) do update set selected_option_index = excluded.selected_option_index, answered_at = excluded.answered_at;
    end loop;
  end if;
  select count(*)::integer into v_correct
  from public.quiz_questions question left join public.quiz_attempt_answers answer
    on answer.attempt_id = v_attempt.id and answer.question_id = question.id
  where question.quiz_id = v_quiz.id and answer.selected_option_index = question.correct_option_index;
  v_score := round((v_correct::numeric * 100) / v_attempt.total_questions)::integer;
  update public.quiz_attempts
  set status = case when v_expired then 'expired'::public.attempt_status else 'submitted'::public.attempt_status end,
      termination_reason = case when v_expired then coalesce(termination_reason, 'deadline_expired') else termination_reason end,
      submitted_at = v_now, score_percent = v_score, correct_count = v_correct
  where id = v_attempt.id;
  insert into public.submissions(attempt_id, student_id, score_percent, submitted_at, finalization_key)
  values (v_attempt.id, p_student_id, v_score, v_now, v_attempt.id) on conflict (attempt_id) do nothing;
  return private.finalized_attempt_payload(v_attempt.id, p_student_id);
end;
$$;

create or replace function public.start_assessment_attempt(p_quiz_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_student uuid := (select auth.uid());
  v_attempt public.quiz_attempts%rowtype;
  v_assignment public.quiz_assignments%rowtype;
  v_quiz public.teacher_quizzes%rowtype;
  v_questions integer;
  v_used integer;
  v_number integer;
  v_deadline timestamptz;
begin
  if v_student is null then raise exception 'AUTH_REQUIRED'; end if;
  select attempt.* into v_attempt
  from public.quiz_attempts attempt
  join public.quiz_assignments assignment on assignment.id = attempt.assignment_id
  join public.classes class_row on class_row.id = assignment.class_id
  join public.class_memberships membership on membership.class_id = class_row.id
  where assignment.quiz_id = p_quiz_id and attempt.student_id = v_student
    and membership.student_id = v_student and membership.status = 'active' and class_row.archived_at is null
    and private.is_org_member(class_row.organization_id, array['student']::public.app_role[])
    and attempt.status = 'in_progress'
  order by attempt.started_at desc limit 1 for update of attempt;
  if found then
    if clock_timestamp() >= v_attempt.deadline_at then perform private.finalize_assessment_attempt(v_attempt.id, v_student, '{}'::jsonb); end if;
    return private.active_attempt_payload(v_attempt.id, v_student);
  end if;
  select assignment.* into v_assignment
  from public.quiz_assignments assignment
  join public.classes class_row on class_row.id = assignment.class_id
  join public.class_memberships membership on membership.class_id = class_row.id
  join public.teacher_quizzes quiz on quiz.id = assignment.quiz_id
  where assignment.quiz_id = p_quiz_id and membership.student_id = v_student and membership.status = 'active'
    and class_row.archived_at is null
    and private.is_org_member(class_row.organization_id, array['student']::public.app_role[])
    and quiz.status = 'published'
    and (quiz.available_from is null or quiz.available_from <= clock_timestamp())
    and (quiz.available_until is null or quiz.available_until > clock_timestamp())
    and (assignment.due_at is null or assignment.due_at > clock_timestamp())
  order by assignment.created_at desc limit 1 for update of assignment;
  if not found then
    insert into public.access_denials(student_id, reason) values (v_student, 'not_assigned');
    return jsonb_build_object('errorCode', 'QUIZ_NOT_AVAILABLE');
  end if;
  select * into v_quiz from public.teacher_quizzes where id = p_quiz_id;
  select count(*)::integer into v_questions from public.quiz_questions where quiz_id = p_quiz_id;
  if v_questions = 0 then return jsonb_build_object('errorCode', 'QUIZ_NOT_AVAILABLE'); end if;
  select count(*)::integer into v_used from public.quiz_attempts where assignment_id = v_assignment.id and student_id = v_student;
  if v_used >= v_quiz.attempt_limit then
    insert into public.access_denials(assignment_id, student_id, reason) values (v_assignment.id, v_student, 'attempt_limit');
    return jsonb_build_object('errorCode', 'ATTEMPT_LIMIT_REACHED');
  end if;
  v_number := v_used + 1;
  v_deadline := least(clock_timestamp() + make_interval(mins => v_quiz.duration_minutes),
    coalesce(v_quiz.available_until, 'infinity'::timestamptz), coalesce(v_assignment.due_at, 'infinity'::timestamptz));
  if v_deadline <= clock_timestamp() then
    insert into public.access_denials(assignment_id, student_id, reason) values (v_assignment.id, v_student, 'deadline_passed');
    return jsonb_build_object('errorCode', 'QUIZ_NOT_AVAILABLE');
  end if;
  insert into public.quiz_attempts(assignment_id, student_id, attempt_number, deadline_at, total_questions)
  values (v_assignment.id, v_student, v_number, v_deadline, v_questions) returning * into v_attempt;
  return private.active_attempt_payload(v_attempt.id, v_student);
end;
$$;

create or replace function public.save_assessment_answers(p_attempt_id uuid, p_answers jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_student uuid := (select auth.uid());
  v_attempt public.quiz_attempts%rowtype;
  v_entry record;
  v_question_id uuid;
  v_option integer;
begin
  if v_student is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_attempt from public.quiz_attempts where id = p_attempt_id and student_id = v_student for update;
  if not found then raise exception 'ATTEMPT_NOT_FOUND'; end if;
  if v_attempt.status <> 'in_progress' then raise exception 'ATTEMPT_NOT_ACTIVE'; end if;
  if clock_timestamp() >= v_attempt.deadline_at then
    perform private.finalize_assessment_attempt(v_attempt.id, v_student, '{}'::jsonb);
    return jsonb_build_object('errorCode', 'ATTEMPT_EXPIRED');
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then raise exception 'INVALID_ANSWERS'; end if;
  if jsonb_object_length(p_answers) > 100 then raise exception 'INVALID_ANSWERS'; end if;
  for v_entry in select key, value from jsonb_each_text(p_answers) loop
    if v_entry.value is null or v_entry.key !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' or v_entry.value !~ '^[0-3]$' then raise exception 'INVALID_ANSWERS'; end if;
    v_question_id := v_entry.key::uuid;
    v_option := v_entry.value::integer;
    if not exists (select 1 from public.quiz_questions question join public.quiz_assignments assignment on assignment.quiz_id = question.quiz_id
      where question.id = v_question_id and assignment.id = v_attempt.assignment_id) then raise exception 'INVALID_ANSWERS'; end if;
    insert into public.quiz_attempt_answers(attempt_id, question_id, selected_option_index, answered_at)
    values (v_attempt.id, v_question_id, v_option, clock_timestamp())
    on conflict (attempt_id, question_id) do update set selected_option_index = excluded.selected_option_index, answered_at = excluded.answered_at;
  end loop;
  return private.active_attempt_payload(v_attempt.id, v_student);
end;
$$;

create or replace function public.finalize_assessment_attempt(p_attempt_id uuid, p_answers jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_student uuid := (select auth.uid());
begin
  if v_student is null then raise exception 'AUTH_REQUIRED'; end if;
  return private.finalize_assessment_attempt(p_attempt_id, v_student, coalesce(p_answers, '{}'::jsonb));
end;
$$;

create or replace function private.guard_published_quiz_content()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_quiz_id uuid; v_status public.quiz_status;
begin
  if tg_op <> 'INSERT' then
    select status into v_status from public.teacher_quizzes where id = old.quiz_id for update;
    if v_status = 'published' then raise exception 'PUBLISHED_QUIZ_LOCKED'; end if;
  end if;
  if tg_op <> 'DELETE' then
    v_quiz_id := new.quiz_id;
    select status into v_status from public.teacher_quizzes where id = v_quiz_id for update;
    if v_status = 'published' then raise exception 'PUBLISHED_QUIZ_LOCKED'; end if;
  end if;
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

create or replace function private.guard_quiz_state()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_question_count integer;
begin
  if tg_op = 'DELETE' then
    if old.status = 'published' then raise exception 'PUBLISHED_QUIZ_LOCKED'; end if;
    return old;
  end if;
  if old.status = 'published' and new.status <> 'published' then raise exception 'PUBLISHED_QUIZ_LOCKED'; end if;
  if old.status = 'published' and (new.title, new.instructions, new.duration_minutes, new.available_from, new.available_until, new.attempt_limit)
    is distinct from (old.title, old.instructions, old.duration_minutes, old.available_from, old.available_until, old.attempt_limit) then raise exception 'PUBLISHED_QUIZ_LOCKED'; end if;
  if new.status = 'published' and old.status <> 'published' then
    select count(*)::integer into v_question_count from public.quiz_questions where quiz_id = old.id;
    if v_question_count = 0 then raise exception 'QUIZ_NEEDS_QUESTIONS'; end if;
  end if;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

create trigger quiz_questions_published_immutable before insert or update or delete on public.quiz_questions
for each row execute function private.guard_published_quiz_content();
create trigger teacher_quizzes_state_guard before update or delete on public.teacher_quizzes
for each row execute function private.guard_quiz_state();

revoke insert, update, delete on public.quiz_attempts, public.quiz_attempt_answers from authenticated;
revoke all on function private.active_attempt_payload(uuid, uuid) from public, anon, authenticated;
revoke all on function private.finalized_attempt_payload(uuid, uuid) from public, anon, authenticated;
revoke all on function private.finalize_assessment_attempt(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function private.guard_published_quiz_content() from public, anon, authenticated;
revoke all on function private.guard_quiz_state() from public, anon, authenticated;
revoke all on function public.list_assigned_quizzes() from public, anon;
revoke all on function public.start_assessment_attempt(uuid) from public, anon;
revoke all on function public.save_assessment_answers(uuid, jsonb) from public, anon;
revoke all on function public.finalize_assessment_attempt(uuid, jsonb) from public, anon;
grant execute on function public.list_assigned_quizzes() to authenticated;
grant execute on function public.start_assessment_attempt(uuid) to authenticated;
grant execute on function public.save_assessment_answers(uuid, jsonb) to authenticated;
grant execute on function public.finalize_assessment_attempt(uuid, jsonb) to authenticated;

