# 네이버 지역 검색은 Edge Function 프록시로만 호출한다

> 결정일: 2026-05-23 · Phase 1B · 관련 코드: `supabase/functions/naver-search/`, `src/features/courses/api.ts`

## Problem

데이트 코스 등록 시 사용자가 식당·카페·바를 검색해야 하는데, 네이버 검색 API 는
요청 헤더(`X-Naver-Client-Id`, `X-Naver-Client-Secret`)에 시크릿 한 쌍을 직접 실어
보내야 한다. 클라이언트(React Native)에서 호출하면:

- 키가 모바일 앱 번들에 들어가 디컴파일·MITM 으로 쉽게 추출됨
- 한 번 유출되면 키 교체 외에 회수 방법 없음 (네이버 콘솔 재발급 필요)
- 호출량·요청자(우리 앱 사용자)를 서버가 통제할 방법이 없어 abuse 차단 불가
- 네이버 응답이 그대로 클라이언트에 노출되어 응답 포맷 변화에 앱이 깨짐

또한 CLAUDE.md 보안 규칙: "service_role 키·API 시크릿은 클라이언트 번들에 절대
포함 금지" 와 정면 충돌.

## Action

**Supabase Edge Function 을 검색 프록시로 도입**.

- `supabase functions new naver-search` 로 Deno 런타임 함수 생성
- 키는 `supabase/functions/.env` (gitignore 대상) 에만 보관, `Deno.env.get(...)` 으로 런타임 주입
- 프로덕션 배포 시에는 `supabase secrets set` 으로 동일 키 이름 등록 (env 파일은 로컬 전용)
- 함수는 **JWT 검증 필수**: `Authorization: Bearer` 헤더로 들어온 토큰을 `supabase.auth.getUser()` 로 검증, 익명 호출은 401 반환 → 키 사용량이 로그인 사용자에게만 귀속
- 입력은 `{ query, display }` 만 받고 `display` 는 1–5 로 clamp → 비용·페이로드 통제
- 응답을 그대로 패스스루하지 않고 우리 도메인 모델(`SearchResult`)로 정제:
  - `<b>` 등 HTML 태그 strip
  - `mapx/mapy` (정수 × 1e7) → `lat/lng` (float) 변환
  - 네이버 카테고리 문자열 → 우리 5종 카테고리(restaurant/cafe/bar/walk/activity) 자동 매핑, 원본도 보존
- 키 누락·네이버 오류는 사용자에게 `Search service unavailable` 메시지만 노출, 식별정보 로깅 금지
- 앱 클라이언트는 `supabase.functions.invoke('naver-search', { body })` 한 줄로 호출 — Supabase 클라이언트가 JWT 를 자동으로 헤더에 실어줌

## Result

- **네이버 키가 클라이언트 번들에 존재하지 않음**: `git ls-files` 및 빌드 산출물에서 키 노출 0건
- 호출 권한이 인증된 사용자로 한정되어, 키 유출 시에도 abuse 경로가 좁아짐
- 응답 포맷이 우리 도메인에 맞게 정제되어, 네이버 API 변경 시 함수 1개만 수정하면 됨
- Phase 1B 이후 카카오 지도·구글 Places 등 다른 외부 API 추가 시 같은 패턴
  (Edge Function 프록시 + JWT 검증 + 응답 정제) 재사용 — Phase 2+ 의 매칭 알고리즘
  (service_role 키 필요) 도 동일 구조로 확장 예정

## 트레이드오프

- **레이턴시**: 앱 → Edge Function → 네이버 → Edge Function → 앱 (홉 2개 추가)
  - 로컬 LAN(`10.75.58.41`) 기준 체감 차이 미미. 프로덕션은 Supabase 리전 선택으로 통제 가능
- **로컬 개발 복잡도**: Docker + `supabase start` + `supabase functions serve --env-file ...` 필요
  - 키 안전성·일관된 응답 포맷 이득이 더 큼

## 대안 검토

- **a) 클라이언트 직접 호출**: 키 노출 위험 → 즉시 기각
- **b) 자체 백엔드 서버 별도 구축**: Supabase 외 Node/Express 띄울 명분 없음 — Edge Function 으로 충분
- **c) 검색 결과를 DB 캐시**: Phase 1B 범위 밖. 호출량이 문제될 때 함수 안에 캐시 레이어를 더하면 됨

## 참고

- 함수 본체: `supabase/functions/naver-search/index.ts`
- 앱 래퍼: `src/features/courses/api.ts` `searchPlaces()`
- 호출 지점: `app/(tabs)/course-edit.tsx` `SearchModal`
