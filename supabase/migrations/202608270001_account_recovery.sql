-- 아이디 찾기와 보안 질문 기반 비밀번호 재설정
alter table public.employees
  add column if not exists security_question varchar(64),
  add column if not exists security_answer_hash text,
  add column if not exists password_changed_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'employees_security_question_value_check'
      and conrelid = 'public.employees'::regclass
  ) then
    alter table public.employees
      add constraint employees_security_question_value_check check (
        security_question is null or security_question in (
          'high_school', 'first_pet', 'childhood_neighborhood',
          'favorite_teacher', 'first_company'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'employees_security_answer_hash_format'
      and conrelid = 'public.employees'::regclass
  ) then
    alter table public.employees
      add constraint employees_security_answer_hash_format check (
        security_answer_hash is null or security_answer_hash ~ '^\$2[aby]\$'
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'employees_security_recovery_pair_check'
      and conrelid = 'public.employees'::regclass
  ) then
    alter table public.employees
      add constraint employees_security_recovery_pair_check check (
        (security_question is null and security_answer_hash is null)
        or
        (security_question is not null and security_answer_hash is not null)
      );
  end if;
end $$;
