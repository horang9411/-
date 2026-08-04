-- 현재 Supabase 프로젝트를 배포 코드와 맞추기 위한 재실행 가능한 SQL입니다.
-- SQL Editor에서 전체를 한 번에 실행합니다. Storage 객체를 삭제하지 않습니다.

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

drop index if exists public.tasks_department_status_idx;
alter table public.tasks drop column if exists status;
drop type if exists public.task_status;

alter type public.leave_type add value if not exists 'morning_quarter';
alter type public.leave_type add value if not exists 'afternoon_quarter';
alter type public.leave_day_type add value if not exists 'morning_quarter';
alter type public.leave_day_type add value if not exists 'afternoon_quarter';

update storage.buckets
set file_size_limit = 4194304
where id in ('profile-images', 'task-attachments', 'leave-attachments');
