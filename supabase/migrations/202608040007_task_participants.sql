-- 업무에 여러 명의 참여 직원을 연결합니다.
create table if not exists public.task_participants (
  task_id uuid not null references public.tasks(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (task_id, employee_id)
);

create index if not exists task_participants_employee_id_idx
  on public.task_participants (employee_id, task_id);

alter table public.task_participants enable row level security;
revoke all on table public.task_participants from anon, authenticated;

comment on table public.task_participants is
  '업무의 주 담당자 외에 함께 참여하는 직원을 연결합니다.';
