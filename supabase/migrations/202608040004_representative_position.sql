-- 대표 직급 추가
-- enum 값 추가는 적용 후 커밋되어야 사용 가능하므로 이 파일을 먼저 단독 실행합니다.

alter type public.employee_position
  add value if not exists 'representative' after 'team_lead';
