-- 로컬 개발 전용 설정
-- supabase db reset 시 자동 실행됨. 프로덕션에는 이 파일이 적용되지 않음.

-- request_org_verification RPC 가 인증 코드를 응답에 포함하도록 개발 모드 활성화.
-- 프로덕션 DB 에는 이 행이 없으므로 코드 반환 경로에 진입하지 않음.
insert into public.app_config (key, value)
values ('dev_mode', 'true')
on conflict (key) do update set value = 'true';
