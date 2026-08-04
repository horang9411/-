# 파스텔크래프트 워크스페이스 구현 설계

## 제품 구조

- `app/(auth)`: 로그인, 가입, 승인 대기 화면
- `app/(workspace)`: 로그인 후 공통 사이드바·헤더를 사용하는 업무 화면
- `app/api`: 입력 검증, 세션·권한 검사, 데이터 변경을 담당하는 Route Handler
- `components/ui`: shadcn/ui 방식의 재사용 UI 컴포넌트
- `components/calendar`: FullCalendar 기반 업무·휴가 캘린더
- `lib/auth`: 비밀번호 해시, 세션 쿠키, 로그인 제한, 권한 정책
- `lib/supabase`: 브라우저·서버·service role Supabase 클라이언트
- `schemas`: React Hook Form과 API가 함께 쓰는 Zod 스키마
- `supabase/migrations`: PostgreSQL 스키마와 변경 이력

## 인증 및 권한 원칙

1. 직원 비밀번호는 bcrypt cost 12와 서버 전용 pepper를 사용해 해시합니다.
2. 로그인 성공 시 무작위 세션 토큰을 HTTP-only, Secure, SameSite=Lax 쿠키에 저장하고 DB에는 SHA-256 해시만 저장합니다.
3. Supabase anon 키로 테이블을 직접 읽거나 쓰지 않습니다. 모든 업무 데이터는 서버 Route Handler를 통해 접근합니다.
4. `admin`, 과장·차장·부장·팀장, 업무 소유자 규칙을 하나의 서버 권한 함수에서 검사합니다.
5. 비공개 Storage 파일은 서버가 소유권과 상세 조회 권한을 확인한 뒤 짧은 만료 시간의 서명 URL을 발급합니다.
6. 관리자 승인·반려·수정·사용 중지 작업은 `activity_logs`에 남깁니다.

## 단계별 구현 계획

1. **기반과 스키마**: Next.js App Router, Tailwind, 공통 레이아웃, 캘린더 UI, Supabase 연결, 전체 초기 SQL
2. **가입·로그인·승인**: Zod 폼, bcrypt, 로그인 제한, HTTP-only 세션, 승인 대기, 관리자 승인
3. **공통 레이아웃 완성**: 실제 로그인 사용자 정보, 역할별 메뉴, 로그아웃, 모바일 축약 레이아웃
4. **업무 관리**: 등록·조회·수정·삭제, 첨부파일, 필터, 상세 권한
5. **휴가 관리**: 신청·수정·취소, 관리자 승인·반려, 휴가 캘린더
6. **직원 화면**: 직원 목록, 직원별 진행/예정/완료 업무, 프로필 관리
7. **관리자 운영**: 직원 직접 등록, 권한/상태 변경, 회사 휴무일, 감사 로그
8. **품질과 배포**: 단위·통합·E2E 테스트, Supabase 운영 설정, Vercel 환경변수와 배포 점검

사용자가 지정한 10개 구현 순서는 유지하며, 위 묶음은 코드 아키텍처 관점의 작업 단위입니다.

## 현재 상태

- 1~9단계 MVP 기능 구현 완료
- 업무 상태 제거, 참여 직원, 드래그 일정 변경 반영 완료
- 부서별 데이터 가시성 및 서버/API 권한 적용 완료
- 팀장·대표자 2단계 휴가 승인과 반반차 반영 완료
- 단위 테스트, 공개 경로 E2E 스모크 테스트, GitHub Actions 검증 추가
- Vercel 업로드 한도와 보안 응답 헤더 반영 완료

배포 전 남은 운영 작업은 `supabase/DEPLOY_BEFORE_VERCEL.sql`을 대상 프로젝트 SQL Editor에서 실행하고 Vercel 환경변수를 등록하는 것입니다.
