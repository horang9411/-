-- 휴가 2단계 승인: 부서 팀장 승인 후 대표자(admin) 최종 승인

alter table public.leave_requests
  add column if not exists team_lead_status varchar(20) not null default 'pending',
  add column if not exists team_lead_reviewed_by uuid references public.employees(id) on delete restrict,
  add column if not exists team_lead_reviewed_at timestamptz,
  add column if not exists team_lead_rejection_reason text,
  add column if not exists representative_status varchar(20) not null default 'pending',
  add column if not exists representative_reviewed_by uuid references public.employees(id) on delete restrict,
  add column if not exists representative_reviewed_at timestamptz,
  add column if not exists representative_rejection_reason text;

-- 기존 승인·반려 기록을 새 승인 단계와 호환되게 보정합니다.
update public.leave_requests
set
  team_lead_status = 'approved',
  team_lead_reviewed_by = approved_by,
  team_lead_reviewed_at = approved_at,
  representative_status = 'approved',
  representative_reviewed_by = approved_by,
  representative_reviewed_at = approved_at
where status = 'approved';

do $$ begin
  alter table public.leave_requests
    add constraint leave_requests_team_lead_status_check
    check (team_lead_status in ('pending', 'approved', 'rejected'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.leave_requests
    add constraint leave_requests_representative_status_check
    check (representative_status in ('pending', 'approved', 'rejected'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.leave_requests
    add constraint leave_requests_team_lead_review_check
    check (
      (team_lead_status = 'pending' and team_lead_reviewed_by is null and team_lead_reviewed_at is null)
      or
      (team_lead_status in ('approved', 'rejected') and team_lead_reviewed_by is not null and team_lead_reviewed_at is not null)
    );
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.leave_requests
    add constraint leave_requests_representative_review_check
    check (
      (representative_status = 'pending' and representative_reviewed_by is null and representative_reviewed_at is null)
      or
      (
        representative_status in ('approved', 'rejected')
        and team_lead_status = 'approved'
        and representative_reviewed_by is not null
        and representative_reviewed_at is not null
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.leave_requests
    add constraint leave_requests_two_step_final_status_check
    check (
      status <> 'approved'
      or (team_lead_status = 'approved' and representative_status = 'approved')
    );
exception when duplicate_object then null; end $$;

create index if not exists leave_requests_team_lead_queue_idx
  on public.leave_requests (team_lead_status, created_at desc);
create index if not exists leave_requests_representative_queue_idx
  on public.leave_requests (representative_status, team_lead_status, created_at desc);
