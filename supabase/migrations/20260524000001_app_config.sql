-- ============================================================================
-- app_config 테이블 추가 + request_org_verification GUC → 테이블 조회로 교체
--
-- GUC(app.dev_mode) 는 로컬 Supabase postgres 역할에 ALTER DATABASE 권한이 없어
-- supabase db reset 시 실패함. app_config 테이블로 대체.
-- 프로덕션: dev_mode 행 없음 → coalesce false fallback → 코드 미반환.
-- 로컬:    seed.sql 이 dev_mode = 'true' 삽입 → 코드 반환.
-- ============================================================================

create table if not exists public.app_config (
  key   text primary key,
  value text not null
);

-- 클라이언트 직접 접근 차단. security definer 함수는 소유자 권한으로 bypass.
alter table public.app_config enable row level security;

-- ============================================================================
-- request_org_verification: GUC 제거, app_config 테이블 조회로 교체
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
  v_dev_mode        boolean;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  if p_type not in ('school', 'company') then
    raise exception 'invalid_type';
  end if;

  if p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_email_format';
  end if;

  v_domain := lower(split_part(p_email, '@', 2));

  if v_domain = any(v_generic_domains) then
    raise exception 'generic_email';
  end if;

  v_is_school := v_domain like '%ac.kr' or v_domain like '%.edu';
  if p_type = 'school' and not v_is_school then
    raise exception 'not_school_domain';
  end if;
  if p_type = 'company' and v_is_school then
    raise exception 'not_company_domain';
  end if;

  select max(created_at)
    into v_last_request
    from private.verifications
   where user_id = v_uid and status = 'pending';

  if v_last_request is not null and now() - v_last_request < interval '1 minute' then
    raise exception 'rate_limited';
  end if;

  v_code      := lpad((floor(random() * 1000000))::text, 6, '0');
  v_code_hash := encode(digest(v_code, 'sha256'), 'hex');

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

  -- 개발 모드 판별: app_config 테이블 조회 (행 없으면 false)
  select coalesce(
    (select value = 'true' from public.app_config where key = 'dev_mode'),
    false
  ) into v_dev_mode;

  if v_dev_mode then
    return jsonb_build_object('code', v_code);
  else
    -- 프로덕션: 이메일 발송은 별도 Edge Function 이 처리 (Phase 2+)
    return '{}'::jsonb;
  end if;
end;
$$;

revoke all     on function public.request_org_verification(text, text) from public;
grant  execute on function public.request_org_verification(text, text) to authenticated;
