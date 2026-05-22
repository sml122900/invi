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

## 템플릿

### [소재 제목]

**Problem**
어떤 상황이었는지, 어떤 문제가 있었는지

**Action**
내가 구체적으로 무엇을 했는지 (기술·방법론 포함)

**Result**
수치 또는 구체적인 결과. "~% 개선", "~건 처리" 등

---
