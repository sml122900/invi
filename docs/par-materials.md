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

> 후속: 로컬 Supabase `postgres` 역할이 `ALTER DATABASE ... SET` 권한이 없어 `db reset` 시 seed 실행이 실패함. GUC 대신 `public.app_config (key, value)` 테이블 + RLS + security definer RPC 조회 패턴으로 교체. 분기 책임이 여전히 서버에 남는 동일한 보안 모델을 유지하면서 권한 문제 해결.

---

## Edge Function 프록시로 외부 API 키를 클라이언트에서 완전 격리

**Problem**
React Native 앱에서 네이버 지역 검색 API 를 호출해야 하는데, 네이버는 요청 헤더에 Client ID/Secret 시크릿 한 쌍을 직접 실어 보내는 인증 방식만 제공. 모바일 번들에 키를 넣으면 디컴파일·MITM 으로 추출되어 즉시 유출, 호출자 통제도 불가능. 키 1쌍이 유출되면 회수 방법은 콘솔 재발급뿐.

**Action**
Supabase Edge Function(Deno 런타임)을 검색 프록시로 도입. 키는 `supabase/functions/.env`(gitignore)에만 존재하고 `Deno.env.get(...)` 으로 런타임 주입. 함수가 `Authorization: Bearer` 헤더의 JWT 를 `supabase.auth.getUser()` 로 검증해 로그인 사용자만 호출 허용. 응답을 우리 도메인 모델(`SearchResult`)로 정제 — HTML 태그 strip, 좌표(`mapx/mapy` × 1e7 → 위경도) 변환, 네이버 카테고리 → 우리 5종 카테고리 자동 매핑. 앱은 `supabase.functions.invoke('naver-search', { body })` 한 줄로 호출.

**Result**
빌드 산출물·`git ls-files`에서 키 노출 0건. 호출 권한이 인증된 사용자로 한정되어 유출 시에도 abuse 경로가 좁음. 같은 패턴(Edge Function + JWT 검증 + 응답 정제)이 Phase 2+ 의 매칭 알고리즘(service_role 키 필요)·카카오·구글 Places 등 추가 외부 API 에 그대로 재사용 가능한 표준 구조 확립.

---

## NULL 시맨틱이 다른 두 도메인에 partial / replace 두 RPC 패턴을 분리 적용

**Problem**
프로필(`profiles`) 저장은 1A 에서 `update_profile(...)` RPC 의 `coalesce(p_x, x)` partial update 로 일원화했다. 그런데 1C 의 이상형(`ideal_types`) 에서는 NULL 자체가 "상관없음" 이라는 도메인 의미를 가져, 같은 partial 패턴을 그대로 쓰면 "흡연 상관없음으로 바꾸기" 같은 사용자 의도가 서버에 전달되지 않고 기존 값이 그대로 유지되는 버그가 생긴다. NULL 이 "값 없음" 인지 "도메인 값 = 상관없음" 인지 구분할 길이 인자 시그니처에 없다.

**Action**
RPC 패턴을 두 가지로 분리하고, 향후 새 테이블에 적용할 판단 기준을 결정 문서로 남김(`docs/decisions/ideal-types-replace-pattern.md`):
- NULL 이 **"비어 있음"** 의미 → partial update (`coalesce`, 1A)
- NULL 이 **"상관없음/없음"** 같은 도메인 값 → 전체 교체 (upsert + on conflict do update set excluded.*, 1C)
`update_ideal_type` 은 후자로 구현하되, 잠금 컬럼(school/company/salary/paid_until) 은 `set` 목록에서 명시적으로 제외해 결제 연동 전까지 보존. 검증(범위/enum) 과 security definer + 본인만 호출 가능한 보안 모델은 1A 와 동일하게 유지해, 두 RPC 가 같은 보안 골격 위에서 시맨틱만 다르다는 구조를 만듦.

**Result**
사용자 의도가 DB 까지 손실 없이 전달되는 흐름 확보. 두 패턴의 사용 기준이 결정 문서로 명문화되어, 향후 새 RPC 추가 시 판단 비용 제거. 한 도메인에서 채택한 패턴을 다른 도메인에 무비판적으로 복제했다면 발생했을 잠재 버그(잠금 컬럼 우연한 덮어쓰기, 사용자 의도 손실)를 설계 단계에서 차단.

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
