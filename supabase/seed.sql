-- 로컬 개발 전용 설정
-- supabase db reset 시 자동 실행됨. 프로덕션에는 이 파일이 적용되지 않음.

-- request_org_verification RPC 가 인증 코드를 응답에 포함하도록 설정
-- 프로덕션에서는 이 GUC 가 없으므로 current_setting('app.dev_mode', true) = null → 코드 미반환
alter database postgres set "app.dev_mode" = 'true';
