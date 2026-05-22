# AuthApiError: Database error saving new user

## 문제 상황

회원가입 시 `AuthApiError: Database error saving new user` 발생. 앱에서는 "오류가 발생했습니다" 메시지만 노출.

## 시도한 것들

1. `console.error`로 실제 에러 객체 노출 → 에러명 확인
2. Docker 컨테이너 로그 확인 (`docker logs supabase_db_invi`)

## 원인

`auth.users` INSERT 시 `handle_new_user()` 트리거가 실행되는데, 트리거 내부에서 `public.token_balances`에 INSERT 시도 → `token_balances.user_id`가 `public.profiles(user_id)`를 FK 참조하는데 `profiles` 행이 아직 없어서 FK violation 발생.

2차: `profiles` 빈 행 먼저 INSERT하도록 수정했으나, `profiles.gender`가 NOT NULL이어서 다시 실패.

## 최종 해결법

1. `handle_new_user()` 트리거에 `profiles` 빈 행 INSERT 추가 (token_balances 전에)
2. `profiles.gender`, `birth_year` 컬럼을 nullable로 변경 → 온보딩 완료 시 `complete_onboarding` RPC에서 채우는 구조

```sql
-- handle_new_user() 최종
insert into public.profiles (user_id) values (new.id) on conflict do nothing;
insert into public.token_balances (user_id, balance) values (new.id, 200) on conflict do nothing;
```

## 이력서 소재 한 줄

DB 트리거 FK 제약 오류를 Docker 컨테이너 로그 분석으로 정확히 진단하고 스키마 설계를 수정해 해결
