-- 오전/오후 반반차(0.25일) 종류와 단위를 추가합니다.
alter type public.leave_type add value if not exists 'morning_quarter';
alter type public.leave_type add value if not exists 'afternoon_quarter';

alter type public.leave_day_type add value if not exists 'morning_quarter';
alter type public.leave_day_type add value if not exists 'afternoon_quarter';
