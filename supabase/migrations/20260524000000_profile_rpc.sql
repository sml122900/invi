-- ============================================================================
-- Phase 1A: 프로필 RPC + 학교/직장 인증 RPC
-- ============================================================================

-- private.verifications 에 이메일 인증 코드 관련 컬럼 추가
alter table private.verifications
  add column if not exists code_hash     text,
  add column if not exists attempt_count int not null default 0,
  add column if not exists expires_at    timestamptz;

-- org_name 은 도메인 평문 보관용. nullable 허용(미래 확장 대비).
alter table private.verifications
  alter column org_name drop not null;

-- ============================================================================
-- update_profile RPC
-- security definer: 클라이언트가 profiles 를 직접 UPDATE 하지 않고 이 함수로만.
-- 전달된 필드만 갱신(null = 변경 없음). 완성도 재계산 후 반환.
-- ============================================================================
create or replace function public.update_profile(
  p_height_cm      int      default null,
  p_region         text     default null,
  p_active_regions text[]   default null,
  p_mbti           text     default null,
  p_face_type      text     default null,
  p_smoking        text     default null,
  p_drinking       text     default null,
  p_religion       text     default null,
  p_intro_prompts  jsonb    default null,
  p_tags           text[]   default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid          uuid := auth.uid();
  v_completeness int  := 0;
  v_item         jsonb;
  v_answer       text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  -- 범위/enum 검증
  if p_height_cm is not null and (p_height_cm < 130 or p_height_cm > 220) then
    raise exception 'invalid_height';
  end if;
  if p_mbti is not null and p_mbti !~ '^[EI][NS][TF][JP]$' then
    raise exception 'invalid_mbti';
  end if;
  if p_face_type is not null and p_face_type not in
     ('dog','cat','fox','rabbit','deer','bear','wolf','squirrel') then
    raise exception 'invalid_face_type';
  end if;
  if p_smoking is not null and p_smoking not in ('none','sometimes','social','often') then
    raise exception 'invalid_smoking';
  end if;
  if p_drinking is not null and p_drinking not in ('none','sometimes','social','often') then
    raise exception 'invalid_drinking';
  end if;
  if p_religion is not null and p_religion not in
     ('no_religion','christian','catholic','buddhist','other') then
    raise exception 'invalid_religion';
  end if;

  -- 자기소개 답변 길이 (최대 300자, 빈 답변 금지)
  if p_intro_prompts is not null then
    if jsonb_array_length(p_intro_prompts) > 6 then
      raise exception 'too_many_prompts';
    end if;
    for v_item in select * from jsonb_array_elements(p_intro_prompts)
    loop
      v_answer := v_item->>'answer';
      if v_answer is null or char_length(trim(v_answer)) = 0 then
        raise exception 'empty_answer';
      end if;
      if char_length(v_answer) > 300 then
        raise exception 'answer_too_long';
      end if;
    end loop;
  end if;

  -- 태그 최대 10개
  if p_tags is not null and coalesce(array_length(p_tags, 1), 0) > 10 then
    raise exception 'too_many_tags';
  end if;

  -- 부분 업데이트: null 전달 시 기존 값 유지
  update public.profiles set
    height_cm      = coalesce(p_height_cm,      height_cm),
    region         = coalesce(p_region,          region),
    active_regions = coalesce(p_active_regions,  active_regions),
    mbti           = coalesce(p_mbti,            mbti),
    face_type      = coalesce(p_face_type,       face_type),
    smoking        = coalesce(p_smoking,         smoking),
    drinking       = coalesce(p_drinking,        drinking),
    religion       = coalesce(p_religion,        religion),
    intro_prompts  = coalesce(p_intro_prompts,   intro_prompts),
    tags           = coalesce(p_tags,            tags)
  where user_id = v_uid;

  -- 완성도 계산 (8개 체크포인트)
  -- 핵심 6개: height/region/face_type/mbti/smoking/drinking
  -- + 자기소개 3개 이상 + 태그 5개 이상
  select
    (case when height_cm  is not null then 1 else 0 end +
     case when region     is not null then 1 else 0 end +
     case when face_type  is not null then 1 else 0 end +
     case when mbti       is not null then 1 else 0 end +
     case when smoking    is not null then 1 else 0 end +
     case when drinking   is not null then 1 else 0 end +
     case when jsonb_array_length(intro_prompts) >= 3 then 1 else 0 end +
     case when coalesce(array_length(tags, 1), 0) >= 5 then 1 else 0 end
    ) * 100 / 8
  into v_completeness
  from public.profiles where user_id = v_uid;

  update public.profiles set completeness = v_completeness where user_id = v_uid;

  return jsonb_build_object('completeness', v_completeness);
end;
$$;

revoke all     on function public.update_profile from public;
grant  execute on function public.update_profile to authenticated;

-- ============================================================================
-- request_org_verification RPC
-- 이메일 도메인 정책 적용 후 6자리 인증 코드 생성.
-- 개발 모드(app.dev_mode GUC = 'true')에서만 평문 코드 반환.
-- 프로덕션: 빈 응답만 반환 (실제 이메일 발송은 별도 Edge Function에서).
-- ============================================================================
create or replace function public.request_org_verification(
  p_email text,
  p_type  text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid             uuid    := auth.uid();
  v_domain          text;
  v_is_school       boolean;
  v_generic_domains text[]  := array[
    'gmail.com','googlemail.com','naver.com','daum.net','hanmail.net',
    'kakao.com','nate.com','hotmail.com','outlook.com','live.com',
    'yahoo.com','icloud.com','me.com'
  ];
  v_last_request    timestamptz;
  v_code            text;
  v_code_hash       text;
  v_dev_mode        boolean := false;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  if p_type not in ('school', 'company') then
    raise exception 'invalid_type';
  end if;

  -- 이메일 기본 형식 검증
  if p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_email_format';
  end if;

  v_domain := lower(split_part(p_email, '@', 2));

  -- 범용 메일 거부
  if v_domain = any(v_generic_domains) then
    raise exception 'generic_email';
  end if;

  -- 학교/직장 판정
  v_is_school := v_domain like '%ac.kr' or v_domain like '%.edu';
  if p_type = 'school' and not v_is_school then
    raise exception 'not_school_domain';
  end if;
  if p_type = 'company' and v_is_school then
    raise exception 'not_company_domain';
  end if;

  -- 분당 1회 요청 제한
  select max(created_at)
    into v_last_request
    from private.verifications
   where user_id = v_uid and status = 'pending';

  if v_last_request is not null and now() - v_last_request < interval '1 minute' then
    raise exception 'rate_limited';
  end if;

  -- 6자리 코드 생성 + 해시 저장
  v_code      := lpad((floor(random() * 1000000))::text, 6, '0');
  v_code_hash := encode(digest(v_code, 'sha256'), 'hex');

  -- 기존 pending 대체
  delete from private.verifications
   where user_id = v_uid and status = 'pending';

  insert into private.verifications
    (user_id, type, org_name, org_name_hash, email_hash,
     method, status, code_hash, attempt_count, expires_at)
  values
    (v_uid,
     p_type,
     v_domain,
     encode(digest(v_domain, 'sha256'), 'hex'),
     encode(digest(lower(p_email), 'sha256'), 'hex'),
     'email',
     'pending',
     v_code_hash,
     0,
     now() + interval '10 minutes');

  -- 개발 모드 분기: app.dev_mode GUC 가 'true' 일 때만 평문 코드 반환
  -- 프로덕션에서는 이 GUC 가 설정되지 않으므로 current_setting 은 null 반환
  begin
    v_dev_mode := current_setting('app.dev_mode', true) = 'true';
  exception when others then
    v_dev_mode := false;
  end;

  if v_dev_mode then
    -- 개발 전용: 코드 확인용. 프로덕션 빌드에서는 서버가 이 분기에 진입하지 않음.
    return jsonb_build_object('code', v_code);
  else
    -- 프로덕션: 이메일 발송은 별도 Edge Function 이 처리 (미구현 — Phase 2+)
    return '{}'::jsonb;
  end if;
end;
$$;

revoke all     on function public.request_org_verification(text, text) from public;
grant  execute on function public.request_org_verification(text, text) to authenticated;

-- ============================================================================
-- confirm_org_verification RPC
-- 인증 코드 확인. 만료/시도초과/해시 불일치 처리.
-- ============================================================================
create or replace function public.confirm_org_verification(
  p_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_row       private.verifications%rowtype;
  v_code_hash text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_row
    from private.verifications
   where user_id = v_uid and status = 'pending'
   order by created_at desc
   limit 1;

  if not found then
    raise exception 'no_pending_verification';
  end if;

  if v_row.expires_at < now() then
    update private.verifications set status = 'expired' where id = v_row.id;
    raise exception 'code_expired';
  end if;

  if v_row.attempt_count >= 5 then
    raise exception 'too_many_attempts';
  end if;

  v_code_hash := encode(digest(p_code, 'sha256'), 'hex');

  if v_code_hash <> v_row.code_hash then
    update private.verifications
       set attempt_count = attempt_count + 1
     where id = v_row.id;
    raise exception 'invalid_code';
  end if;

  update private.verifications set
    status       = 'verified',
    verified_at  = now(),
    reverify_due = now() + interval '6 months'
  where id = v_row.id;

  return jsonb_build_object('type', v_row.type);
end;
$$;

revoke all     on function public.confirm_org_verification(text) from public;
grant  execute on function public.confirm_org_verification(text) to authenticated;

-- ============================================================================
-- get_my_verifications RPC
-- 본인의 verified 인증 목록 반환 (타입 + 인증일만. 조직명 노출 없음).
-- ============================================================================
create or replace function public.get_my_verifications()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_result jsonb;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'type',        type,
    'verified_at', verified_at
  )), '[]'::jsonb)
  into v_result
  from private.verifications
  where user_id = v_uid and status = 'verified';

  return v_result;
end;
$$;

revoke all     on function public.get_my_verifications() from public;
grant  execute on function public.get_my_verifications() to authenticated;
