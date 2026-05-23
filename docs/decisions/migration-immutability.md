# 이미 적용된 마이그레이션은 immutable — 보정은 새 파일로

> 결정일: 2026-05-23 · 코드 리뷰 후속 · 관련 코드: `supabase/migrations/20260524000005_update_ideal_type_nullable_args.sql`

## Problem

`supabase gen types` 로 `src/types/database.ts` 를 재생성하니
`update_ideal_type.Args` 가 7개 인자 모두 **non-null required** 로 잡혔다.
런타임은 멀쩡(NULL 전달 OK) 했지만, 클라이언트 `IdealTypeInput`(NULL =
"상관없음" 도메인 값) 과 TS 타입 충돌.

원인은 1C 마이그레이션(`20260524000002_match_prefs_rpc.sql`) 에서 7개 인자에
`default null` 을 빼고 선언한 것. 1A 의 `update_profile` 은 같은 패턴에서
`default null` 을 붙여놨고, gen types 가 옵셔널(`p_x?`)로 추론한다.

수정 방법은 두 갈래였다:

- **A) 새 마이그레이션 파일** 로 `create or replace function` 을 다시 작성, 시그니처에 `default null` 명시
- **B) 기존 1C 마이그레이션 파일** 을 working tree 에서 직접 편집, `default null` 추가

B 는 파일 1개로 깔끔하고 동일한 결과가 나오지만, **이미 git 에 커밋되어 로컬
DB 에 적용 완료된 마이그레이션을 사후 편집** 한다. 프로덕션 미배포 상태라
실용적으로는 안전하나, supabase 마이그레이션의 베스트프랙티스(immutability) 와
어긋난다.

## Action

**A 선택.** 새 마이그레이션 파일(`20260524000005_update_ideal_type_nullable_args.sql`)
로 `create or replace function ... default null ...` 재선언. 함수 본문은 1C
원본과 동일(전체 교체, 범위·enum 검증). 헤더 주석에 결정 배경 명시.

원칙을 다음과 같이 명문화:

> **마이그레이션 파일은 한 번 main 에 머지되거나 어떤 DB 에라도 적용된
> 시점부터 immutable 로 취급한다. 그 안의 SQL 을 사후 편집하지 않는다.
> 시그니처 변경·정책 보정·버그 픽스는 새 마이그레이션 파일에 `create or
> replace function` / `alter table` 로 작성한다.**

예외(워킹 트리에서 사후 편집 OK)는 다음 두 경우로 한정한다:
1. 아직 한 번도 git commit 되지 않은 마이그레이션 — 본인 개발 중인 새 파일
2. 어떤 DB(로컬 포함) 에도 한 번도 적용되지 않은 마이그레이션 — 작성 후
   `supabase db reset` 으로 처음 적용해보기 전 단계

위 두 경우 외에는 모두 새 파일로.

## Result

- 작은 시그니처 변경(1개 함수의 인자 7개에 `default null` 추가) 도 새 파일로 분리됨
- 결과 마이그레이션이 7개로 늘었지만 각각이 하나의 명확한 의도(`*_rpc.sql`, `*_nullable_args.sql`) 를 가져 변경 이력이 추적 가능해짐
- `supabase db reset` 시 시퀀셜하게 적용되어 정확한 결과 재현 가능 (편집 기반이면 어느 시점 스냅샷이냐에 따라 달라짐)
- 향후 프로덕션 배포 시 한 방향 forward-only 마이그레이션 흐름 유지 가능

## 트레이드오프

- **파일 수 증가**: 작은 보정 하나에 새 파일 1개. 마이그레이션 디렉토리가 길어진다
  - 다만 forward-only 분명한 이력이 더 큰 가치
- **로컬 개발 중 잦은 수정**: 시그니처를 여러 번 바꾸는 실험 단계에선 새 파일을 매번 만들기 번거로움
  - **해결**: 예외 2조항(어떤 DB 에도 적용 전이면 편집 OK) 로 흐름이 자연스러움. 첫 `supabase db reset` 통과 후부터 immutable 취급

## 대안 검토

- **B) 기존 파일 직접 편집**: 짧은 기간엔 편하지만, 누군가 다른 환경에서 `db reset` 을 돌렸을 때 결과 불일치 가능. 협업·CI 환경에서 위험
- **C) `down` 마이그레이션으로 되돌렸다가 새로 적용**: supabase migration 은 forward-only. down 미지원
- **D) Squash 마이그레이션**: 누적된 마이그레이션을 한 파일로 합치는 작업. 프로덕션 배포 직전/후에만 의미. 일반 개발 사이클에는 불필요한 의식

## 적용 예시

이 결정의 첫 적용 사례는 `update_ideal_type` 의 `default null` 추가:
- 1C: `20260524000002_match_prefs_rpc.sql` — 원본 함수 선언 (이미 적용·커밋됨)
- 후속: `20260524000005_update_ideal_type_nullable_args.sql` — 시그니처만 `create or replace` 로 보정

향후 동일 패턴:
- 기존 함수 본문 수정 → 새 마이그레이션의 `create or replace function`
- 기존 테이블에 컬럼 추가 → 새 마이그레이션의 `alter table ... add column`
- 기존 정책 변경 → 새 마이그레이션의 `drop policy ... create policy ...`

## 참고

- 첫 적용 마이그레이션: `supabase/migrations/20260524000005_update_ideal_type_nullable_args.sql`
- 원본 함수 선언(immutable 로 보존): `supabase/migrations/20260524000002_match_prefs_rpc.sql`
- 같은 보안 모델(security definer + 본인 한정)의 1A 패턴: `supabase/migrations/20260524000000_profile_rpc.sql`
