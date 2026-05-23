# `ideal_types` 저장은 partial update 가 아닌 전체 교체로 한다

> 결정일: 2026-05-23 · Phase 1C · 관련 코드: `supabase/migrations/20260524000002_match_prefs_rpc.sql`

## Problem

1A 에서 프로필 본문 저장 경로를 `update_profile(...)` RPC 로 일원화했다.
1A 의 패턴은 **partial update**:

```sql
update public.profiles set
  height_cm = coalesce(p_height_cm, height_cm),
  region    = coalesce(p_region,    region),
  ...
```

전달된 인자가 `NULL` 이면 기존 값을 유지(= 변경 없음)한다. 이 패턴은
"필드를 안 보내면 안 바뀐다" 라는 명확한 시맨틱을 준다.

그런데 1C 의 이상형(`ideal_types`)에선 **NULL 자체가 "상관없음" 이라는 의미**를
가진다. 사용자가 "흡연 상관없음" 으로 두고 싶으면 `smoking_pref` 를 NULL 로
저장해야 한다. 1A 의 patial update 패턴을 그대로 쓰면 다음 경계가 무너진다:

- 클라이언트가 "흡연 상관없음" 으로 바꿔서 NULL 을 보내면 → 서버가 "변경 없음" 으로 해석 → 기존 값 유지 (사용자 의도와 반대)
- 클라이언트가 "흡연 = none" 으로 명시하면 → 그대로 저장 (OK)
- "smoking 만 비우고 다른 건 그대로" 같은 패턴이 표현 불가

요약: **저장 입력에서 "안 건드림" 과 "NULL 로 설정" 을 구분할 길이 없다.**

## Action

`update_ideal_type` RPC 를 **전체 교체(full replace)** 패턴으로 설계.

```sql
insert into public.ideal_types (
  user_id, age_min, age_max, height_min, height_max,
  smoking_pref, drinking_pref, religion_pref
) values (
  v_uid, p_age_min, p_age_max, p_height_min, p_height_max,
  p_smoking_pref, p_drinking_pref, p_religion_pref
)
on conflict (user_id) do update set
  age_min       = excluded.age_min,
  age_max       = excluded.age_max,
  ...
  religion_pref = excluded.religion_pref;
```

- 7개 필드를 **항상 함께** 받는다. 클라이언트는 매번 현재 화면 상태 전체를 보낸다.
- NULL = "상관없음" 으로 직접 매핑.
- 세분화(school/company/salary/paid_until) 컬럼은 `set` 목록에서 **명시적으로 제외**
  → 잠금 상태가 우연히 덮어쓰이지 않도록 보존.
- RPC 가 security definer 이므로 RLS 우회로 변경되는 컬럼이 명시적으로만 통제됨.

검증은 1A 와 동일한 모양:
- 범위(`age 18–80`, `height 130–220`), min ≤ max
- enum 값(smoking/drinking 4종, religion 5종)
- 위반 시 `raise exception` 으로 사용자에게 보일 코드 반환

클라이언트(`src/features/match-prefs/api.ts`) 도 `Partial` 인터페이스가 아닌
**전체 입력**(`IdealTypeInput`)을 받는 시그니처로 강제.

## Result

- 사용자 의도 ("상관없음") 가 DB 까지 손실 없이 전달됨
- 잠금 컬럼은 RPC 가 절대 건드리지 않으므로, Phase 2+ 의 결제 모듈에서만 변경 가능
- 1A 의 `update_profile`(partial) 과 1C 의 `update_ideal_type`(replace) 가 **같은 보안 모델**(security definer + 본인만 + 검증) 위에 다른 시맨틱을 둔다는 점이 명확해짐
- 향후 새 테이블에 RPC 를 만들 때 판단 기준 확립:
  - 컬럼 NULL 이 **"비어 있음"** 의미면 partial update (1A)
  - 컬럼 NULL 이 **"상관없음/없음"** 같은 도메인 의미면 replace (1C)

## 트레이드오프

- **네트워크 페이로드 증가**: 7개 필드 항상 전송. 작은 RPC 라 무시 가능
- **클라이언트 입력 구성 책임**: 화면이 모든 필드의 현재값을 들고 있어야 함. `useState` + DB 초기 로드 패턴으로 자연스럽게 해결됨
- **부분 갱신이 정말 필요한 경우**: 1C 범위에선 없음. 만약 미래에 "흡연 필드만 빠르게 바꾸기" UX 가 필요해지면 별도 RPC 를 둘 수 있다 — 지금 만들지 않음 (CLAUDE.md 2. Simplicity First)

## 대안 검토

- **a) 1A 패턴 그대로(partial)**: NULL 시맨틱 충돌로 즉시 기각
- **b) 센티널 값** (예: `-1` 또는 `'__unset__'`): 도메인 타입을 오염시킴. enum 컬럼에는 도입 자체가 부자연스러움
- **c) `p_clear text[]`** 로 NULL 처리할 컬럼명을 명시: 클라이언트가 어떤 컬럼 이름이 있는지 알아야 하고, 두 인자 사이의 일관성 검증이 필요. 표현력은 같지만 호출 측 코드가 복잡
- **d) jsonb 단일 인자**: 타입 안전성 손해. Supabase generated types 도 활용 못 함

## 참고

- 함수 본체: `supabase/migrations/20260524000002_match_prefs_rpc.sql`
- 클라이언트 래퍼: `src/features/match-prefs/api.ts` `updateIdealType()`
- 1A partial update 비교: `supabase/migrations/20260524000000_profile_rpc.sql` `update_profile()`
