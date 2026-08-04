-- pastelcraft 핵심 계정을 대표·최고 관리자 상태로 고정
-- 202608040004_representative_position.sql 적용 후 실행합니다.

update public.employees
set
  position = 'representative',
  role = 'admin',
  account_status = 'active',
  failed_login_count = 0,
  locked_until = null
where login_id = 'pastelcraft';

insert into public.activity_logs (
  employee_id,
  action_type,
  target_type,
  target_id,
  changed_data
)
select
  id,
  'admin.representative.promote',
  'employee',
  id,
  jsonb_build_object(
    'login_id', login_id,
    'position', 'representative',
    'role', 'admin',
    'account_status', 'active'
  )
from public.employees
where login_id = 'pastelcraft';
