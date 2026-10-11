-- Published teacher assessments are immutable, even through direct REST writes.
create or replace function public.prevent_published_quiz_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $lock$
declare
  v_quiz_id uuid;
  v_status public.quiz_status;
begin
  if tg_table_name = 'teacher_quizzes' then
    if tg_op = 'DELETE' then
      if old.status = 'published' then
        raise exception 'PUBLISHED_QUIZ_LOCKED';
      end if;
      return old;
    end if;

    if old.status = 'published' then
      if new.status = 'archived'
        and new.title is not distinct from old.title
        and new.instructions is not distinct from old.instructions
        and new.duration_minutes is not distinct from old.duration_minutes
        and new.available_from is not distinct from old.available_from
        and new.available_until is not distinct from old.available_until
        and new.attempt_limit is not distinct from old.attempt_limit
        and new.owner_id is not distinct from old.owner_id
        and new.organization_id is not distinct from old.organization_id
      then
        return new;
      end if;
      raise exception 'PUBLISHED_QUIZ_LOCKED';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    select q.status into v_status from public.teacher_quizzes q where q.id = old.quiz_id;
    if v_status = 'published' then
      raise exception 'PUBLISHED_QUIZ_LOCKED';
    end if;
    select q.status into v_status from public.teacher_quizzes q where q.id = new.quiz_id;
    if v_status = 'published' then
      raise exception 'PUBLISHED_QUIZ_LOCKED';
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    v_quiz_id := old.quiz_id;
  else
    v_quiz_id := new.quiz_id;
  end if;

  select q.status into v_status from public.teacher_quizzes q where q.id = v_quiz_id;
  if v_status = 'published' then
    raise exception 'PUBLISHED_QUIZ_LOCKED';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$lock$;

revoke all on function public.prevent_published_quiz_mutation() from public, anon, authenticated;

create trigger teacher_quizzes_published_immutable
before update or delete on public.teacher_quizzes
for each row execute function public.prevent_published_quiz_mutation();

create trigger quiz_questions_published_immutable
before insert or update or delete on public.quiz_questions
for each row execute function public.prevent_published_quiz_mutation();
