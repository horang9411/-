-- 업무 상태 기능을 제거합니다. 업무는 날짜와 기간만으로 관리합니다.
drop index if exists public.tasks_department_status_idx;

alter table public.tasks
  drop column if exists status;

drop type if exists public.task_status;
