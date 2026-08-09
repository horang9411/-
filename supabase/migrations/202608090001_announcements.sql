-- 캘린더 상단에 노출할 사내 공지사항입니다.
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title varchar(120) not null,
  content text not null,
  created_by uuid not null references public.employees(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint announcements_title_length
    check (char_length(trim(title)) between 1 and 120),
  constraint announcements_content_length
    check (char_length(trim(content)) between 1 and 5000)
);

create index if not exists announcements_created_at_idx
  on public.announcements (created_at desc);

drop trigger if exists announcements_set_updated_at on public.announcements;
create trigger announcements_set_updated_at
before update on public.announcements
for each row execute function public.set_updated_at();

alter table public.announcements enable row level security;
revoke all on table public.announcements from anon, authenticated;

comment on table public.announcements is
  '관리자·팀장·대표가 작성하고 전 직원에게 노출하는 사내 공지사항';
