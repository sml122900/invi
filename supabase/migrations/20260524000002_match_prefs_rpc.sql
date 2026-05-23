-- ============================================================================
-- Phase 1C: 이상형 조건 RPC
--
-- ideal_types 는 NULL 자체가 "상관없음" 으로 의미가 있다.
-- 그래서 1A 의 coalesce(p_x, x) 부분 업데이트 패턴 대신 전체 교체(replace)로
-- 처리한다. 클라이언트는 7개 필드를 항상 함께 보내고, NULL = 상관없음.
-- 세분화(school/company/salary/paid_until) 는 이 RPC 가 건드리지 않는다.
-- ============================================================================
create or replace function public.update_ideal_type(
  p_age_min       int,
  p_age_max       int,
  p_height_min    int,
  p_height_max    int,
  p_smoking_pref  text,
  p_drinking_pref text,
  p_religion_pref text
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
