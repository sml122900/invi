-- ============================================================================
-- Phase 1C 보강 (검토 M2 후속): update_ideal_type 인자에 default null 추가
--
-- 1C 원본 마이그레이션(20260524000002)은 7개 인자에 default 를 안 붙여 선언했다.
-- PostgreSQL 런타임은 NOT NULL 제약이 없으므로 NULL 전달이 정상 작동하지만,
-- supabase gen types 가 "default 없음 = required(non-null)" 로 추론해
-- 자동 생성된 Args 타입이 `number` / `string` (non-null) 으로 나온다.
--
-- 클라이언트 IdealTypeInput 은 `number | null` (NULL = "상관없음" 도메인 값)이라
-- 타입이 충돌한다. 1A 의 update_profile 패턴과 일관성을 맞추기 위해
-- create or replace 로 시그니처에 default null 을 명시해, 생성된 TS 타입이
-- 옵셔널(`p_age_min?: number`)이 되도록 한다.
--
-- 함수 본문 로직은 20260524000002 와 동일하다 (전체 교체, 범위·enum 검증).
-- 이미 커밋된 마이그레이션은 immutability 원칙에 따라 건드리지 않는다.
-- ============================================================================
create or replace function public.update_ideal_type(
  p_age_min       int  default null,
  p_age_max       int  default null,
  p_height_min    int  default null,
  p_height_max    int  default null,
  p_smoking_pref  text default null,
  p_drinking_pref text default null,
  p_religion_pref text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  -- 범위 검증 (UI 가드 + 한 번 더)
  if p_age_min is not null and (p_age_min < 18 or p_age_min > 80) then
    raise exception 'invalid_age_min';
  end if;
  if p_age_max is not null and (p_age_max < 18 or p_age_max > 80) then
    raise exception 'invalid_age_max';
  end if;
  if p_age_min is not null and p_age_max is not null and p_age_min > p_age_max then
    raise exception 'invalid_age_range';
  end if;
  if p_height_min is not null and (p_height_min < 130 or p_height_min > 220) then
    raise exception 'invalid_height_min';
  end if;
  if p_height_max is not null and (p_height_max < 130 or p_height_max > 220) then
    raise exception 'invalid_height_max';
  end if;
  if p_height_min is not null and p_height_max is not null and p_height_min > p_height_max then
    raise exception 'invalid_height_range';
  end if;

  -- enum 검증
  if p_smoking_pref is not null and p_smoking_pref not in
     ('none','sometimes','social','often') then
    raise exception 'invalid_smoking_pref';
  end if;
  if p_drinking_pref is not null and p_drinking_pref not in
     ('none','sometimes','social','often') then
    raise exception 'invalid_drinking_pref';
  end if;
  if p_religion_pref is not null and p_religion_pref not in
     ('no_religion','christian','catholic','buddhist','other') then
    raise exception 'invalid_religion_pref';
  end if;

  -- 전체 교체. onboarding 트리거가 행을 미리 만들지만, 안전하게 upsert.
  -- 세분화(school/company/salary/paid_until) 컬럼은 명시적으로 제외해 보존.
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
    height_min    = excluded.height_min,
    height_max    = excluded.height_max,
    smoking_pref  = excluded.smoking_pref,
    drinking_pref = excluded.drinking_pref,
    religion_pref = excluded.religion_pref;
end;
$$;

revoke all     on function public.update_ideal_type from public;
grant  execute on function public.update_ideal_type to authenticated;
