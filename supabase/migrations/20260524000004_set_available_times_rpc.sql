-- ============================================================================
-- Phase 1B 보강 (검토 H3): set_available_times RPC
--
-- 기존 클라이언트의 setAvailableTimes 는 delete-then-insert 가 두 번의
-- 분리된 호출이어서 중간 실패 시 사용자가 가용 시간을 통째로 잃을 수 있었다.
-- 단일 트랜잭션 + 본인 행 한정 + 입력 검증을 갖춘 security definer RPC 로 교체.
--
-- 1A 의 update_profile / complete_onboarding 과 동일 패턴:
--   - auth.uid() null 가드
--   - 자원 한정(user_id = auth.uid())
--   - 입력 형식·범위 검증
--   - 함수 내부가 자동 단일 트랜잭션 (plpgsql)
-- ============================================================================
create or replace function public.set_available_times(
  p_slots jsonb   -- [{"day_of_week": <0-6>, "slot": "<weekday_evening|lunch|dinner>"}, ...]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid           uuid := auth.uid();
  v_count         int;
  v_invalid_count int;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if p_slots is null or jsonb_typeof(p_slots) <> 'array' then
    raise exception 'invalid_slots';
  end if;

  v_count := jsonb_array_length(p_slots);

  -- 입력 검증: 각 슬롯의 day_of_week / slot 형식·범위
  if v_count > 0 then
    select count(*)::int into v_invalid_count
      from jsonb_array_elements(p_slots) as e(elem)
     where not (e.elem ? 'day_of_week')
        or not (e.elem ? 'slot')
        or jsonb_typeof(e.elem->'day_of_week') <> 'number'
        or jsonb_typeof(e.elem->'slot') <> 'string'
        or (e.elem->>'day_of_week')::int < 0
        or (e.elem->>'day_of_week')::int > 6
        or (e.elem->>'slot') not in ('weekday_evening','lunch','dinner');

    if v_invalid_count > 0 then
      raise exception 'invalid_slot_value';
    end if;
  end if;

  -- 본인 행만 통째로 교체 (delete + insert 가 함수 본문의 단일 트랜잭션 안에서 실행)
  -- 중간 실패 시 전체 롤백 → 사용자 데이터가 통째로 사라지는 사고 방지
  delete from public.available_times
   where user_id = v_uid;

  if v_count > 0 then
    insert into public.available_times (user_id, day_of_week, slot)
    select v_uid,
           (e.elem->>'day_of_week')::int,
           (e.elem->>'slot')
      from jsonb_array_elements(p_slots) as e(elem);
  end if;
end;
$$;

revoke all     on function public.set_available_times(jsonb) from public;
grant  execute on function public.set_available_times(jsonb) to authenticated;
