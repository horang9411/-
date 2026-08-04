-- 캘린더 기본 시작 요일을 일요일로 변경

do $$
begin
  if to_regclass('public.system_settings') is not null then
    alter table public.system_settings
      alter column week_starts_on set default 0;

    update public.system_settings
    set week_starts_on = 0
    where id = true;
  end if;
end $$;
