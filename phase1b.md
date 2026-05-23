# phase1b.md — 코스 등록 + 네이버 장소 검색 + 가용 시간

> Phase 1 의 둘째 조각. **우리 앱의 핵심 차별점.** 1A(프로필+인증)가 끝나 있어야 한다.
> 여기서 **첫 Edge Function**(네이버 검색 프록시)을 만든다.
>
> - **PART 1**: 사람이 할 일 (네이버 키를 Edge Function 환경에 등록).
> - **PART 2**: Claude Code 구현. 각 Step `verify` 통과 후 진행.
>
> Claude Code 에게: PART 2 를 Step 1부터 순서대로. 네이버 키가 없으면 Step 1에서
> 멈추고 사용자에게 요청한다. 1B 범위 밖(이상형/매칭)은 만들지 않는다.

---

## Phase 1B 목표

사용자가 **데이트 코스를 등록**(시나리오 → 장소 검색·추가 → 순서)하고,
**가용 시간**을 설정할 수 있게 한다. 장소 검색은 **앱 → Edge Function → 네이버**
프록시 구조로, 네이버 키를 클라이언트에 노출하지 않는다.

## 완료 기준 (Definition of Done)

- [ ] Edge Function(naver-search)이 로컬에서 동작하고, 네이버 키는 클라이언트에 없다.
- [ ] 앱에서 식당/카페/술집 등을 검색하면 정제된 결과(이름·주소·카테고리·좌표)가 나온다.
- [ ] 시나리오를 골라 코스를 만들고, 검색한 장소를 순서대로 담아 저장할 수 있다.
- [ ] 코스 목록에서 편집/삭제/공개토글이 된다.
- [ ] 요일별 가용 시간 슬롯을 설정/저장할 수 있다.
- [ ] 코스 1개 + 가용시간 설정 시 "매칭 준비" 안내가 갱신된다.
- [ ] 모든 화면이 INVI 다크 테마(흰 본문)로 렌더된다.

---

# PART 1 — 사용자(본인)가 할 일

### 1. 환경 켜두기
Docker 실행 → `supabase start` → `npx expo start` (USB 테더링 + LAN IP `10.75.58.41`).

### 2. 네이버 검색 키 준비 (이미 발급함)
발급받아 둔 **Client ID / Client Secret** 을 가까이 둔다. Claude Code 가 Step 1에서
`supabase/functions/.env` 템플릿을 만들면, 거기에 **본인이 직접** 값을 넣는다.
(키는 시크릿이라 직접 넣는 습관을 들인다. 이 파일은 `.gitignore` 에 포함.)

넣을 형식(템플릿 생성 후):
```
NAVER_CLIENT_ID=발급받은_Client_ID
NAVER_CLIENT_SECRET=발급받은_Client_Secret
```

### 3. (참고) Edge Function 로컬 실행 개념
Edge Function 은 `supabase` 로컬 스택 위에서 돈다. Claude Code 가 로컬 실행/테스트를
안내한다. 앱은 `supabase.functions.invoke('naver-search', ...)` 로 호출하며, 로컬에선
`http://10.75.58.41:54321/functions/v1/naver-search` 로 닿는다(LAN IP 그대로).

---

# PART 2 — Claude Code 구현 작업

## Step 1. Edge Function 생성 + 네이버 키 환경 셋업

1. `supabase functions new naver-search` 로 함수 골격 생성
   (`supabase/functions/naver-search/index.ts`).
2. `supabase/functions/.env` 템플릿 생성 (빈 값) + `.gitignore` 에 추가:
   ```
   NAVER_CLIENT_ID=
   NAVER_CLIENT_SECRET=
   ```
   → 값은 사용자가 직접 채운다. 값이 비어 있으면 사용자에게 입력을 요청하고 멈춘다.
3. 로컬 실행 방법 정리(README 또는 주석):
   `supabase functions serve naver-search --env-file supabase/functions/.env`
   (또는 현재 CLI 버전의 권장 로컬 실행 방식 확인 후 안내).

**verify:** 함수 골격이 생기고, `.env` 템플릿이 만들어지며 `.gitignore` 에 포함된다.

## Step 2. 네이버 검색 프록시 로직

`naver-search/index.ts` (Deno):
1. **JWT 검증 유지**(로그인 사용자만 호출). 익명 호출 거부.
2. 입력: `{ query: string, display?: number }` (display 기본 5, 최대 5).
3. 네이버 지역 검색 호출:
   - `GET https://openapi.naver.com/v1/search/local.json?query=...&display=5&sort=random`
   - 헤더 `X-Naver-Client-Id`, `X-Naver-Client-Secret` 를 `Deno.env.get(...)` 으로.
4. 응답 정제 후 반환:
   - `title` 의 `<b></b>` 등 HTML 태그 제거.
   - 좌표: 네이버 `mapx`(경도)·`mapy`(위도) 정수를 위경도로 변환
     (형식 확인 후 적절히 스케일링; 예: /1e7). `lat`,`lng` 로 반환.
   - 필드: `{ name, category, address, roadAddress, lat, lng, naverLink }`.
   - 카테고리 매핑: 네이버 category 문자열 → 우리 카테고리
     (restaurant/cafe/bar/walk/activity) 추정 매핑 + 원본 보존.
5. 에러·rate limit 처리. 키 없거나 네이버 오류 시 사용자용 메시지(식별정보 로깅 금지).

**verify:** 로컬에서 함수 실행 후, 샘플 쿼리("홍대 술집")로 정제된 결과 배열이 온다.

## Step 3. 앱에서 검색 호출 (features/courses)

`src/features/courses/api.ts`:
- `searchPlaces(query)` → `supabase.functions.invoke('naver-search', { body: { query } })`.
- 로딩/에러 상태 처리. 결과 타입 정의.

**verify:** 실기기 앱에서 검색어 입력 → Edge Function 경유 → 결과가 화면에 뜬다.

## Step 4. 코스 생성 — 시나리오 선택

코스 만들기 진입(`app/(tabs)/courses.tsx` 등) + 새 코스 화면:
- 시나리오 택1: cafe / lunch / early_dinner / dinner / activity (한국어 라벨).
- 선택 시 코스 이름 입력 + 기본 슬롯 안내(시나리오별 권장 구성).

**verify:** 시나리오를 고르면 빈 코스 작성 화면으로 넘어간다.

## Step 5. 장소 추가 (검색 → 선택 → 저장) + 순서

- 코스에 장소 추가: 카테고리 선택 → 검색(Step 3) → 결과에서 택1 → 코스에 추가.
- 각 장소: `naver_place_id`(없으면 식별자 대체), `name`, `category`, `sub_category`,
  `lat`,`lng`, `district`(주소에서 구 추출), `stay_minutes`(카테고리 기본값),
  `user_note`(선택), `order_index`.
- 순서 변경(위/아래 또는 드래그). 저장은 `courses` + `places`.
> 참고: 사진+naver.me OG 카드 풀버전은 후순위. 1B 는 이름/주소/카테고리/좌표까지.

**verify:** 검색→선택한 장소가 코스에 순서대로 담기고, 저장 후 재진입 시 유지된다.

## Step 6. 코스 목록 / 편집 / 삭제 / 공개 토글

- 내 코스 목록(시나리오·구성 요약 표시).
- 편집(장소 추가/삭제/순서, 이름/예산/시간 수정), 코스 삭제.
- `is_public` 토글(매칭 카드 노출 여부). 기본 공개.

**verify:** 목록·편집·삭제·공개토글이 모두 DB 에 반영되고 유지된다.

## Step 7. 가용 시간 설정

`features/profile` 또는 `features/courses` 에:
- 요일(월~일) × 슬롯(weekday_evening / lunch / dinner) 체크 UI →
  `available_times` 저장(있는 행 갱신/삭제).
- 슬롯 라벨/시간대 안내(예: 평일저녁 18시 이후 / 점심 11~16 / 저녁 17~22).
- (선택, 후순위) `time_exceptions` 특정 날짜 제외는 다음으로 미뤄도 됨.

**verify:** 요일·슬롯 선택이 저장되고 재진입 시 유지된다.

## Step 8. 매칭 준비 조건 갱신 (표시만)

- 1A의 "매칭 준비" 안내에 **공개 코스 1개 이상 + 가용시간 1개 이상** 조건 추가.
- 미충족 항목 안내(예: "코스를 1개 등록하면 준비 완료").
> 실제 매칭은 Phase 2.

**verify:** 코스·가용시간 충족 여부에 따라 안내가 정확히 바뀐다.

---

## 작업 순서 요약

```
[사람]   환경 켜기 + 네이버 키를 functions/.env 에 입력

[Claude] 1 Edge Function+env → 2 네이버 프록시 로직 → 3 앱 검색 호출
        → 4 시나리오 → 5 장소추가+순서 → 6 코스 목록/편집/공개
        → 7 가용시간 → 8 매칭 준비 안내 갱신
```

## 보안 메모 (CLAUDE.md 와 일치)

- **네이버 키는 Edge Function 환경(`functions/.env` / 프로덕션 secrets)에만.**
  클라이언트 번들·코드에 절대 포함 금지. 앱은 invoke 로만 호출.
- Edge Function 은 **JWT 검증 유지**(로그인 사용자만). 익명 호출 거부.
- 장소 좌표/주소는 공개 정보지만, 사용자 업로드 사진은 받지 않는다(익명성 보호).
- 로그/에러에 식별정보·키를 남기지 않는다.

## Phase 1B 종료 후

다음은 **phase1c.md (이상형 조건 + 학교/회사 제외 설정)** — Phase 2(매칭) 직전 준비.
그 후 Phase 2 에서 매칭 알고리즘(Hard Filter → Scoring → Selection)을 Edge Function 으로.

> 막히거나 명세가 모호하면 멈춰서 질문할 것. (CLAUDE.md 가이드라인 1번)
