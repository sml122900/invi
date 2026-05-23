-- ============================================================================
-- Phase 1B 보강 (검토 H2): reorder_places RPC
--
-- 기존 클라이언트의 reorderPlaces 는 Promise.all 로 N 개의 update 를 동시
-- 발행해 비원자적이었다. 한쪽만 성공하면 코스 순서가 부분 swap 으로 깨진다.
-- 단일 트랜잭션 + 본인 소유 확인 + 입력 검증을 갖춘 security definer RPC 로 교체.
--
-- 1A 의 update_profile / complete_onboarding 과 동일 패턴:
--   - auth.uid() null 가드
--   - 자원 소유권 확인 후 작업
--   - 입력 형식·범위 검증
--   - 함수 내부가 자동 단일 트랜잭션 (plpgsql)
-- ============================================================================
create or replace function public.reorder_places(
  p_course_id   uuid,
  p_order_pairs jsonb     -- [{"id":"<uuid>", "order_index": <int>}, ...]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid         uuid := auth.uid();
  v_owner       uuid;
  v_pair_count  int;
  v_match_count int;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if p_course_id is null then
    raise exception 'invalid_course_id';
  end if;

  if p_order_pairs is null or jsonb_typeof(p_order_pairs) <> 'array' then
    raise exception 'invalid_order_pairs';
  end if;

  -- 코스 소유권 확인 (남의 코스 순서 조작 차단)
  select user_id into v_owner
    from public.courses
   where id = p_course_id;

  if v_owner is null then
    raise exception 'course_not_found';
  end if;

  if v_owner <> v_uid then
    raise exception 'not_course_owner';
  end if;

  v_pair_count := jsonb_array_length(p_order_pairs);
  if v_pair_count = 0 then
    return;  -- 빈 입력은 no-op
  end if;

  -- 전달된 모든 place 가 본인 코스 소속인지 확인
  --   pair 수와 본인 코스에 속하는 매칭 수가 같아야 함
  --   (남의 코스 place 의 id 를 끼워넣어 순서를 조작하는 시도 차단)
  select count(*)::int into v_match_count
    from jsonb_array_elements(p_order_pairs) as e(elem)
    join public.places p on p.id = (e.elem->>'id')::uuid
   where p.course_id = p_course_id;

  if v_match_count <> v_pair_count then
    raise exception 'place_not_in_course';
  end if;

  -- 일괄 update (함수 본문은 단일 트랜잭션)
  --   places.order_index 에 unique 제약이 없으므로 임시 중복 가능 → swap 안전
  update public.places p
     set order_index = pairs.order_index
    from (
      select (elem->>'id')::uuid          as id,
             (elem->>'order_index')::int  as order_index
        from jsonb_array_elements(p_order_pairs) elem
    ) pairs
   where p.id = pairs.id
     and p.course_id = p_course_id;  -- 이중 잠금: 코스 외 place 방어
end;
$$;

revoke all     on function public.reorder_places(uuid, jsonb) from public;
grant  execute on function public.reorder_places(uuid, jsonb) to authenticated;
