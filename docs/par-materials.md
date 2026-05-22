# 이력서 소재 모음 (PAR 형식)

> **PAR**: Problem(상황/문제) → Action(내가 한 행동) → Result(결과/임팩트)

---

## DB 트리거 FK 제약 오류 디버깅 및 스키마 수정

**Problem**
소개팅 앱 개발 중 회원가입 시 `AuthApiError: Database error saving new user` 발생. 앱에는 제네릭 에러만 노출되어 원인 불명.

**Action**
`console.error`로 실제 에러 객체를 노출하고, Docker 컨테이너 로그(`docker logs supabase_db_invi`)로 PostgreSQL 수준 에러를 직접 확인. `token_balances` → `profiles` FK 참조 구조 문제를 진단하고, 트리거 함수와 스키마(nullable 컬럼)를 수정해 가입 → 온보딩 분리 구조로 재설계.

**Result**
회원가입 플로우 정상화. 가입 시 프로필 빈 행 자동 생성 → 온보딩에서 성별/생년 입력 → `complete_onboarding` RPC로 토큰 지급까지 원자적으로 처리되는 구조 완성.

---

## Security Definer RPC로 데이터 쓰기 경로 일원화

**Problem**
프로필 저장 시 클라이언트가 `profiles` 테이블을 직접 UPDATE하면 RLS 정책 우회·잘못된 값 삽입 등 서버 측 검증 공백이 생기고, 완성도(completeness) 계산 로직이 클라이언트에 분산되는 문제.

**Action**
`update_profile(...)` RPC를 `security definer`로 설계해 단일 진입점 확보. 전달된 필드만 `coalesce`로 partial update하고, enum 범위·답변 길이 등 검증과 completeness 재계산(8체크포인트, 0–100)을 RPC 내에서 원자적으로 처리. 클라이언트 코드에서 직접 INSERT/UPDATE 제거.

**Result**
프로필 쓰기 경로가 RPC 하나로 통일되어, 향후 검증 로직 변경 시 서버 파일 1개만 수정. `complete_onboarding`(Phase 0)·`update_profile`·`request/confirm_org_verification` 패턴이 일관되어 코드 리뷰 기준 명확해짐.

---

## 개발/프로덕션 모드 분기를 서버 GUC로 제어

**Problem**
이메일 인증 코드를 개발 중에 확인하려면 실제 메일 발송 없이 코드를 노출해야 하는데, 클라이언트 코드에 `__DEV__` 분기를 두면 번들에 개발 전용 로직이 남아 보안 리스크가 생김.

**Action**
PostgreSQL GUC(`app.dev_mode`)를 `supabase/seed.sql`에서 로컬 전용으로 설정. RPC가 `current_setting('app.dev_mode', true) = 'true'`일 때만 평문 코드를 반환하도록 서버 측에서 분기. 클라이언트는 응답에 `code` 필드가 있을 때만 화면에 노출 — 클라이언트 코드에 환경 조건 분기 없음.

**Result**
프로덕션 빌드에서 인증 코드 노출 경로가 서버 레벨에서 차단됨. seed.sql은 로컬 `db reset` 시에만 실행되어 프로덕션 DB에는 GUC가 존재하지 않는 구조로 개발/프로덕션 환경 분리 명확화.

---

## 템플릿

### [소재 제목]

**Problem**
어떤 상황이었는지, 어떤 문제가 있었는지

**Action**
내가 구체적으로 무엇을 했는지 (기술·방법론 포함)

**Result**
수치 또는 구체적인 결과. "~% 개선", "~건 처리" 등

---
