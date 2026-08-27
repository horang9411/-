# 파스텔크래프트 워크스페이스

직원 업무 일정, 휴가 신청·2단계 승인, 직원·관리자 운영 기능을 제공하는 사내 웹서비스입니다. 로그인하지 않은 사용자는 `/login`으로 이동하고, 승인된 계정만 `/calendar`에 접근할 수 있습니다.

## 기술 구성

- Next.js 16.3.0 / App Router / TypeScript
- Tailwind CSS 4 / shadcn/ui 방식 UI
- FullCalendar 6
- Supabase PostgreSQL / 비공개 Storage
- Zod / React Hook Form
- Vercel 배포 구조

## 로컬 실행

Node.js 20.9 이상이 필요합니다.

```bash
npm install
cp .env.example .env.local
npm run dev
```

`http://localhost:3000`을 열면 로그인 화면으로 이동합니다.

## Supabase 설정

새 프로젝트는 `supabase/migrations`의 SQL 파일을 파일명 순서대로 실행합니다. 이미 초기 스키마를 적용한 현재 프로젝트는 배포 전에 아래 파일 하나를 SQL Editor에서 실행하면 됩니다.

```text
supabase/DEPLOY_BEFORE_VERCEL.sql
```

이 SQL은 다음 항목을 코드와 일치시킵니다.

- 업무 참여 직원 연결 테이블 생성
- 더 이상 사용하지 않는 업무 상태 컬럼·타입 제거
- 오전·오후 반반차 enum 추가
- Vercel Function 요청 한도에 맞춰 Storage 업로드를 4MB로 제한
- 아이디 찾기와 보안 질문 기반 비밀번호 재설정 컬럼 추가

SQL 적용 후 `.env.example`을 복사한 `.env.local`에 프로젝트 URL, publishable key, service role key와 pepper를 설정합니다. service role key와 pepper는 서버 전용이며 브라우저 코드나 저장소에 넣으면 안 됩니다.

## 초기 관리자 생성

`.env.local`의 `INITIAL_ADMIN_*` 값을 설정한 뒤 다음 명령을 한 번 실행합니다.

```bash
npm run admin:create
```

비밀번호는 서버 전용 pepper와 bcrypt cost 12로 해시됩니다. 생성 후 `INITIAL_ADMIN_PASSWORD`는 환경변수에서 제거할 수 있습니다.

## 핵심 보안 정책

- 세션 원문은 HTTP-only, Secure(운영), SameSite=Lax 쿠키에만 저장하며 DB에는 해시만 저장합니다.
- 로그인 실패 횟수와 시간 구간별 요청을 제한하고 사용 중지 계정의 기존 세션도 즉시 폐기합니다.
- 비밀번호 재설정 답변은 bcrypt로 해시하며, 10분짜리 HTTP-only 인증 쿠키와 요청 횟수 제한을 적용합니다.
- 데이터 변경 API는 세션, 역할·직급·부서 권한, 요청 Origin, Zod 입력을 서버에서 검사합니다.
- 프로필 이미지는 확장자·MIME·파일 시그니처를 검사합니다.
- Storage는 비공개이며 권한 확인 후 짧은 만료 시간의 서명 URL만 제공합니다.
- 관리자 변경 작업은 `activity_logs`에 기록합니다.
- 최종 휴가 승인은 `admin`이면서 직급이 `대표`인 계정만 수행합니다.
- CSP, HSTS, clickjacking 방지, MIME sniffing 방지 헤더를 전 경로에 적용합니다.

프로필 이미지, 업무 첨부, 휴가 첨부는 Vercel의 4.5MB 요청 본문 제한을 고려해 신규 요청 합계 최대 4MB로 제한합니다.

## 검증

```bash
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
npm audit --omit=dev
```

한 번에 배포 전 검증을 수행하려면 `npm run test:deploy`를 사용합니다. E2E 최초 실행 전에 Chromium이 없다면 `npx playwright install chromium`을 실행합니다.

## Vercel 배포

Vercel 프로젝트에 아래 환경변수를 Production·Preview 환경별로 등록합니다.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SESSION_TOKEN_PEPPER`
- `PASSWORD_PEPPER`
- `SESSION_COOKIE_NAME` (선택, 기본 `pc_session`)
- `SESSION_TTL_HOURS` (선택, 기본값은 운영 설정 사용)

배포 전 `supabase/DEPLOY_BEFORE_VERCEL.sql` 적용과 `npm run test:deploy` 통과를 확인합니다. 초기 관리자 생성용 `INITIAL_ADMIN_*` 값은 Vercel에 등록하지 않아도 됩니다.
