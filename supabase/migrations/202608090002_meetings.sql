-- 모든 직원이 등록할 수 있는 회의와 참여자, 자동 공지 연결입니다.
create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  subject varchar(120) not null,
  content text not null,
  meeting_date date not null,
  start_time time not null,
  end_time time not null,
  created_by uuid not null references public.employees(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meetings_subject_length
    check (char_length(trim(subject)) between 1 and 120),
  constraint meetings_content_length
    check (char_length(trim(content)) between 1 and 5000),
  constraint meetings_time_range check (end_time > start_time)
);

create table if not exists public.meeting_participants (
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (meeting_id, employee_id)
);

alter table public.announcements
  add column if not exists meeting_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'announcements_meeting_id_fkey'
      and conrelid = 'public.announcements'::regclass
  ) then
    alter table public.announcements
      add constraint announcements_meeting_id_fkey
      foreign key (meeting_id) references public.meetings(id) on delete cascade;
  end if;
end $$;

create unique index if not exists announcements_meeting_id_unique_idx
  on public.announcements (meeting_id)
  where meeting_id is not null;
create index if not exists meetings_schedule_idx
  on public.meetings (meeting_date, start_time);
create index if not exists meeting_participants_employee_idx
  on public.meeting_participants (employee_id, meeting_id);

drop trigger if exists meetings_set_updated_at on public.meetings;
create trigger meetings_set_updated_at
before update on public.meetings
for each row execute function public.set_updated_at();

alter table public.meetings enable row level security;
alter table public.meeting_participants enable row level security;
revoke all on table public.meetings from anon, authenticated;
revoke all on table public.meeting_participants from anon, authenticated;
