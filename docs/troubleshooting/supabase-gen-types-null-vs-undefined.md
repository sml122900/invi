# supabase gen types: NULL semantic 손실 → Args 타입 충돌

## 문제 상황

코드 리뷰 후속으로 `src/types/database.ts` 를 수동 보강 대신 자동 생성으로
교체하려 `supabase gen types typescript --local` 을 돌렸다. 재생성 후
`npx tsc --noEmit` 이 다음과 같이 깨졌다.

```
src/features/match-prefs/api.ts: Type '{ p_age_min: number | null; ... }'
is not assignable to parameter of type 'Args'.
  Types of property 'p_age_min' are incompatible.
    Type 'number | null' is not assignable to type 'number'.
```

즉, gen types 가 만들어준 `update_ideal_type.Args` 가 7개 인자 모두
**non-null required** 로 잡혔다. 런타임은 멀쩡(supabase-js 가 NULL 그대로
보내고 PG 도 잘 받음) 했지만, 클라이언트 도메인 타입 `IdealTypeInput`
(NULL = "상관없음" 도메인 값) 과 충돌해 TS 컴파일 자체가 안 됐다.

## 시도한 것들

1. **Args 를 우회하는 cast** — `supabase.rpc('update_ideal_type', args as any)`
   - 동작은 하나 `any` 가 한 줄 들어가서 보안적으로 비추. 보류.

2. **`IdealTypeInput` 의 NULL 을 undefined 로 통일**
   - `null` 이 도메인적으로 "상관없음" 을 의미하는데 그걸 `undefined` 로
     바꾸면 도메인 의미가 손실. 화면 UI 가 "선택 해제 → null" 로 토글하는
     기존 흐름과도 어긋남. 거부.

3. **gen types 옵션 변경 (`--schema public` 명시 등)** — 시그니처 추출
   결과는 동일. 옵션 문제가 아니라 SQL 함수 시그니처의 문제.

## 원인

`supabase gen types` 는 `pg_proc.proargdefaults` 를 보고 인자별 default
유무로 TS optional 을 결정한다.

- 1A 의 `update_profile(...)` 은 모든 인자에 `default null` 을 붙여서
  선언 → gen types 가 `p_x?: T | null` 으로 추출.
- 1C 의 `update_ideal_type(...)` 은 `default null` 없이 선언 → gen types
  가 `p_x: T` (non-null required) 로 추출.

런타임에는 supabase-js 가 인자명 매칭으로 JSON-RPC 호출을 보내기 때문에
NULL 이 그대로 전달되어 SQL 함수 본문의 `coalesce`/`is null` 분기가
의도대로 동작한다. 하지만 TS 타입은 SQL 선언만 보고 결정되므로 런타임이
허용해도 컴파일러가 거부한다.

## 최종 해결법

### 1) 마이그레이션은 immutability 원칙대로 새 파일로

원본 `20260524000002_match_prefs_rpc.sql` 은 이미 커밋·로컬 적용된 상태라
편집하지 않는다([[migration-immutability]] 결정 문서). 새 파일
`supabase/migrations/20260524000005_update_ideal_type_nullable_args.sql`
에 `create or replace function update_ideal_type(...)` 로 시그니처만
재선언하고 7개 인자 전부 `default null` 명시. 함수 본문 로직은 1C 원본과
동일.

### 2) 클라이언트는 cast 패턴으로 Args 우회 (1A 와 동일)

`default null` 을 붙여도 supabase-js 의 TS 타입은 `T | undefined` 가 되어
도메인 타입의 `T | null` 과 여전히 형식적으로 충돌한다. 1A 의
`update_profile` 호출부에서 이미 쓰던 `Record<string, unknown>` cast
패턴을 동일하게 적용:

```ts
const args: Record<string, unknown> = {
  p_age_min: input.age_min,
  p_age_max: input.age_max,
  // ...
};
const { error } = await supabase.rpc('update_ideal_type', args);
```

`any` 가 아니고 `unknown` 이라 호출부 외부로 누수 없음. 호출 시그니처는
SQL 선언이 단일 진실 소스(single source of truth) 라는 사실에는 변화 없음.

### 3) 검증

`supabase db reset` → 7개 마이그레이션 깨끗하게 적용,
`npx tsc --noEmit` 0 errors,
`npx tsc --noEmit --noUnusedLocals --noUnusedParameters` 0 errors.

## 이력서 소재 한 줄

자동 생성 타입이 SQL 시그니처에 의존한다는 사실을 진단하고, 마이그레이션
immutability 원칙을 지키며 새 파일로 시그니처를 보정해 도메인 NULL
시맨틱과 TS 타입 안정성을 동시에 확보
