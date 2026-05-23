# phase0.md — 기반 공사 (Foundation) · 로컬 개발 버전

> 이 단계는 **클라우드 결제 없이 로컬 Supabase 로 개발**한다.
> 베타 출시(라이브 데모 필요) 시점에만 클라우드로 올린다. (맨 아래 "클라우드 전환" 참고)
>
> 이 문서는 두 독자를 위한 것이다.
> - **PART 1**: 사람(개발자 본인)이 직접 하는 환경 준비. 설치/실행 중심.
> - **PART 2**: Claude Code 가 구현할 작업. 각 단계는 `verify` 통과 후 진행.
>
> Claude Code 에게: PART 2 를 위에서부터 한 단계씩 구현한다. 각 단계의 `verify`
> 가 통과해야 다음으로 넘어간다. PART 1(사람이 깔아야 할 도구)이 안 돼 있으면
> 멈추고 사용자에게 요청한다. Phase 0 범위 밖(프로필 본문/코스/매칭)은 만들지 않는다.

---

## Phase 0 목표

**"가입하고 로그인되면, 성별/생년을 입력하는 온보딩 첫 화면까지 도달하는 빈 앱"**.
DB(로컬)·인증·디자인 시스템·네비게이션의 골격을 세운다.

## 완료 기준 (Definition of Done)

- [ ] 로컬 Supabase 가 Docker 로 떠 있고, 마이그레이션으로 17개 테이블 + RLS 가 적용됐다.
- [ ] Expo 앱이 실기기(Expo Go)에서 켜지고, 로컬 Supabase 에 접속된다.
- [ ] 이메일로 회원가입 → 로그인 → 로그아웃이 동작한다.
- [ ] 가입 직후 온보딩(성별/생년) 화면으로 이동한다.
- [ ] 만 19세 미만은 가입이 차단된다.
- [ ] 온보딩 완료 여부에 따라 진입 화면이 분기된다.
- [ ] 모든 화면이 INVI 다크 테마(흰 본문 텍스트)로 렌더된다.

---

# PART 1 — 사용자(본인)가 먼저 할 일 (환경 준비)

> 여기서는 "도구 설치 + 실행"만 한다. Supabase init/start 같은 실제 명령은
> Claude Code 가 PART 2 에서 실행한다. 너는 도구를 깔고 Docker 를 켜두기만 하면 된다.

### 1단계. Node.js 확인
- 터미널에서 `node -v` → **v18 이상**이면 OK. 없으면 nodejs.org 에서 LTS 설치.
- `npx -v` 도 확인.

### 2단계. Docker Desktop 설치 + 실행 (로컬 Supabase 의 필수 조건)
- 로컬 Supabase 는 Docker 컨테이너로 돈다. Docker 가 꺼져 있으면 아무것도 안 된다.
1. https://www.docker.com/products/docker-desktop 에서 Windows 용 설치.
   (설치 중 WSL2 백엔드 사용에 동의 — Windows 라면 WSL2 권장)
2. 설치 후 **Docker Desktop 을 실행해서 켜둔다.** (트레이 아이콘이 초록/실행 상태)
3. 터미널에서 `docker --version` 으로 확인.
> 작업할 때마다 Docker Desktop 이 실행 중이어야 한다. (PC 재부팅 후 깜빡 주의)

### 3단계. Supabase CLI 설치
- Windows 권장(Scoop):
  ```
  scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
  scoop install supabase
  ```
  (Scoop 이 없으면 https://scoop.sh 안내대로 먼저 설치, 또는
   Supabase 공식 문서 "Installing the CLI" 의 다른 방법 사용)
- 확인: `supabase --version`

### 4단계. 컴퓨터의 LAN IP 확인 (⚠️ 실기기 테스트의 핵심 함정)
휴대폰(Expo Go)에서 `localhost` 는 **휴대폰 자신**을 가리킨다. 그래서 로컬 Supabase
주소를 `localhost` 로 두면 실기기에서 접속이 안 된다. **컴퓨터의 LAN IP** 가 필요하다.
1. Windows 터미널에서 `ipconfig` 입력.
2. 사용 중인 Wi-Fi 어댑터의 **IPv4 주소** 를 찾는다. (예: `192.168.0.10`)
3. 이 값을 메모. PART 2 의 환경변수에 쓴다. (예: `http://192.168.0.10:54321`)
> 방화벽이 54321 포트를 막으면 접속이 안 될 수 있다. 안 되면 Windows Defender
> 방화벽에서 해당 포트(또는 Node/Docker)를 사설 네트워크에 허용한다.

### 5단계. 휴대폰에 Expo Go 설치 + 같은 Wi-Fi
- App Store / Play Store 에서 **Expo Go** 설치.
- **컴퓨터와 휴대폰이 같은 Wi-Fi** 에 연결돼 있어야 한다. (이게 안 맞으면 접속 불가)

### Claude Code 에게 전달할 것
- 4단계에서 확인한 **LAN IP** (예: `192.168.0.10`)
> 로컬 Supabase 의 URL/anon key 는 Claude 가 `supabase start` 실행 후 출력에서
> 직접 읽어 `.env.local` 을 채운다. 너는 LAN IP 만 알려주면 된다.

---

# PART 2 — Claude Code 구현 작업

> 전제: PART 1(Node, Docker 실행, Supabase CLI)이 준비돼 있다. Docker 가 꺼져
> 있으면 Step 2 에서 멈추고 사용자에게 Docker 실행을 요청한다.
> 각 Step 끝의 `verify` 를 만족해야 다음으로 넘어간다.

## Step 1. Expo 프로젝트 초기화 + 디렉토리 골격

1. Expo Router 템플릿으로 앱 생성 (TypeScript):
   ```
   npx create-expo-app@latest invi --template
   ```
   (TypeScript / Expo Router 기반 템플릿 선택)
2. `CLAUDE.md`의 "B. 디렉토리 구조"에 맞춰 빈 폴더/인덱스 파일 생성:
   `src/components/ui`, `src/components/domain`,
   `src/features/{auth,profile,courses,matching,invitations}`,
   `src/lib`, `src/hooks`, `src/theme`, `src/types`, `src/utils`.

**verify:** `npx expo start` → Expo Go 로 접속 시 기본 화면이 뜬다.

## Step 2. 로컬 Supabase 기동 + 스키마 마이그레이션 적용

1. 프로젝트 루트(invi)에서 Supabase 초기화:
   ```
   supabase init
   ```
   → `supabase/config.toml` 과 `supabase/migrations/` 가 생긴다.
2. 받은 `schema.sql` 을 **첫 마이그레이션 파일**로 배치:
   - 파일명: `supabase/migrations/20260101000000_init_schema.sql`
     (앞 14자리는 타임스탬프 형식이면 됨. 가장 빠른 시각이어야 첫 적용)
   - `schema.sql` 내용을 이 파일에 그대로 넣는다.
3. 로컬 스택 기동 (Docker 필요, 첫 실행은 이미지 다운로드로 수 분 소요):
   ```
   supabase start
   ```
   → 출력에서 다음을 확보한다(콘솔에 표시됨):
     - `API URL` (예: `http://127.0.0.1:54321`)
     - `anon key` (로컬용 JWT)
     - `service_role key` (※ 앱에는 절대 안 쓴다. Phase 2 Edge Function 용)
     - `Studio URL` (예: `http://127.0.0.1:54323` — 브라우저로 DB 확인용)
4. 마이그레이션이 깨끗이 적용되도록 리셋:
   ```
   supabase db reset
   ```
   (start 시 자동 적용되지만, reset 으로 마이그레이션 기준 재구축을 확정한다)

**verify:** Studio URL 을 브라우저로 열어 `public` 스키마에 테이블 17개와,
`private` 스키마에 `verifications` 가 보인다. RLS 가 켜져 있다.
(초기 설계는 `vault` 였으나 로컬 Supabase 충돌로 `private` 로 rename됨)

## Step 3. 의존성 설치

- 필수: `@supabase/supabase-js`,
  `@react-native-async-storage/async-storage`,
  `react-native-url-polyfill` (세션 저장 + URL 폴리필).
- 폰트는 시스템 폰트로 시작(추후 Pretendard/Inter 추가 가능).

**verify:** `package.json` 에 위 패키지가 추가되고 설치 에러가 없다.

## Step 4. 환경변수 + Supabase 클라이언트

1. 루트에 `.env.local` 생성 (`.gitignore` 에 `.env.local` 포함 확인):
   ```
   # ⚠️ 실기기 접속을 위해 127.0.0.1 이 아니라 LAN IP 를 쓴다 (PART 1-4단계 값)
   EXPO_PUBLIC_SUPABASE_URL=http://<사용자_LAN_IP>:54321
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<supabase start 출력의 anon key>
   ```
   > LAN IP 값이 없으면 빈 채로 두고 사용자에게 요청한다.
   > service_role key 는 여기 절대 넣지 않는다.
2. `src/lib/supabase.ts`:
   - `import 'react-native-url-polyfill/auto'`
   - `AsyncStorage` 를 auth storage 로 사용, `autoRefreshToken: true`,
     `persistSession: true`, `detectSessionInUrl: false`.
   - 환경변수에서 URL/anon key 를 읽어 단일 클라이언트 export.

**verify:** 앱 실행 시 Supabase 초기화 에러가 없고, 실기기에서 로컬 서버에
네트워크 요청이 도달한다(콘솔/네트워크 확인).

## Step 5. 디자인 시스템 (theme 토큰)

`CLAUDE.md` "F. 디자인 시스템" 값으로 토큰 작성. **다크 기본, 본문 흰색.**
1. `src/theme/colors.ts` — light/dark 컬러(다크 기본).
2. `src/theme/typography.ts` — 폰트/사이즈/웨이트.
3. `src/theme/spacing.ts` — 4 배수 스페이싱.
4. `src/theme/index.ts` — `theme` 통합 export.

**verify:** 임시 화면이 어두운 배경 + 밝은 흰 글씨로 보인다.

## Step 6. 기본 UI 컴포넌트 (최소만)

`src/components/ui/`:
- `AppText.tsx` (기본 흰색 텍스트), `Button.tsx`(primary/secondary, 로딩),
  `TextField.tsx`(라벨+입력+에러).
> 과한 추상화 금지. 지금 쓰는 props 만.

**verify:** 세 컴포넌트가 다크 테마로 정상 렌더된다.

## Step 7. 세션 훅 + 루트 게이트

1. `src/hooks/useSession.ts` — `onAuthStateChange` 구독, 세션/로딩 반환.
2. `app/_layout.tsx` — 세션 로딩 중 스플래시, 이후 `app/index.tsx`.
3. `app/index.tsx` 분기:
   - 세션 없음 → `(auth)/sign-in`
   - 세션 있음 + 온보딩 미완료 → `(onboarding)/basic-info`
   - 세션 있음 + 온보딩 완료 → `(tabs)`
   > "온보딩 완료" = `profiles` 에 본인 행이 있고 `gender`,`birth_year` 가 채워짐.

**verify:** 세션 상태에 따라 진입 화면이 갈린다(로그아웃 시 sign-in).

## Step 8. 인증 화면 (이메일 가입/로그인)

`features/auth/` 에 api/hooks, 화면은 `app/(auth)/`:
1. `sign-up.tsx` — 이메일/비밀번호 가입. 성공 시 `(onboarding)/basic-info`.
2. `sign-in.tsx` — 로그인. 성공 시 `app/index` 재평가로 분기.
3. 로그아웃 버튼은 임시로 메인(빈 홈)에.
4. 에러 처리: 잘못된 자격/중복 이메일 등 사용자 메시지(식별정보 로깅 금지).
> 로컬 개발 중 이메일 확인 절차가 막히면, `supabase/config.toml` 의
> `[auth.email] enable_confirmations = false` 로 두고 `supabase stop && start`.
> (출시 전 반드시 true 로 되돌린다)

**verify:** 새 이메일 가입 → 자동 로그인 → 온보딩 도달. 로그아웃 → sign-in.

## Step 9. 온보딩 첫 화면 (성별/생년 + 연령 차단 + 토큰 차등)

`app/(onboarding)/basic-info.tsx` + `features/profile/api.ts`:
1. 입력: **성별**(남/여), **생년**(연도). INVI 톤의 정중한 카피.
2. **연령 차단(클라이언트 1차)**: `현재연도 - birth_year < 19` 이면 진행 불가 + 안내.
   (UX 용 즉시 차단. 실제 보장은 서버 RPC 가 한 번 더 한다.)
3. **저장은 서버 RPC 로 한다.** 클라이언트에서 테이블을 직접 insert/update 하지 않는다.
   - 호출: `supabase.rpc('complete_onboarding', { p_gender, p_birth_year })`
   - 이 함수(schema.sql 의 `complete_onboarding`, security definer)가 한 트랜잭션에서:
     · `profiles` 본문 upsert (status='active')
     · `org_match_settings` 기본 행(둘 다 제외 ON), `ideal_types` 빈 행 생성
     · **토큰 보너스 차등**: 여성이면 +300(→ 500), 남성 200 유지.
       'bonus' 트랜잭션 유무로 **1회만(멱등)** 지급.
     · 연령(만 19세)·성별을 **서버에서 재검증**(클라이언트 우회 방지).
   - 에러 매핑: 함수가 던지는 `under_age` / `invalid_gender` / `not_authenticated`
     를 사용자 메시지로 변환(식별정보 로깅 금지).
4. 완료 시 `(tabs)` 빈 홈으로.

> 왜 RPC 인가: `token_balances`/`token_transactions` 는 RLS 로 클라이언트 직접
> 변경을 막아두고(조회만 허용), 잔액 변경은 오직 이 security definer 함수로만
> 일어나게 한다. 클라이언트가 잔액을 임의로 못 바꾸는 구조 = 서버 사이드 신뢰 경계.

**verify:**
- 만 19세 미만 생년이면 클라이언트에서 막히고, 우회로 RPC 를 직접 호출해도
  서버가 `under_age` 로 거부한다.
- RPC 호출 후 `profiles` 행이 채워지고, 여성 잔액 500 / 남성 200 이다.
- 같은 사용자가 온보딩 RPC 를 두 번 호출해도 보너스가 **중복 적립되지 않는다.**
- 완료 후 메인 이동, 재실행 시 온보딩을 다시 묻지 않는다.

## Step 10. 빈 메인(탭) 자리

`app/(tabs)/index.tsx` — "오늘의 인비는 곧 도착해요" 플레이스홀더 + 로그아웃 버튼.
> 실제 매칭 홈은 Phase 2. 여기선 진입 분기 검증용.

**verify:** 온보딩 완료 사용자가 도달하고 로그아웃이 동작한다.

---

## 작업 순서 요약 (한눈에)

```
[사람]   1 Node 확인 → 2 Docker Desktop 설치·실행 → 3 Supabase CLI 설치
        → 4 LAN IP 확인 → 5 Expo Go + 같은 Wi-Fi → Claude 에게 LAN IP 전달

[Claude] 1 Expo 초기화+폴더 → 2 supabase init + schema 마이그레이션 + start + reset
        → 3 의존성 → 4 env(LAN IP!)+클라이언트 → 5 theme → 6 기본 UI
        → 7 세션/게이트 → 8 인증 → 9 온보딩 → 10 빈 메인
```

## 매일 개발 시작할 때 루틴

```
1. Docker Desktop 실행 확인
2. (프로젝트 루트) supabase start      # 로컬 DB 기동
3. npx expo start                      # 앱 기동, Expo Go 로 접속
... 작업 ...
4. supabase stop                       # 끝나면 로컬 DB 정지(선택)
```

## 스키마를 바꿀 때 (중요 규칙)

로컬 Studio GUI 로 테이블을 직접 고치지 말 것. 항상 마이그레이션 파일로:
```
supabase migration new <변경이름>      # 새 마이그레이션 파일 생성
# 그 파일에 ALTER/CREATE 등 SQL 작성
supabase db reset                       # 로컬에 재적용 (마이그레이션 기준 재구축)
```
이러면 로컬↔클라우드가 어긋나지 않는다. (Pine Script v1~v8 처럼 스키마도 버전 관리)

---

## 나중에: 클라우드로 올리기 (베타/라이브 데모 시점)

라이브 데모가 필요해지면 그때만 클라우드로. 데이터(개발 더미)는 안 옮긴다.
```
# 1) Supabase 클라우드에서 프로젝트 1개 생성 (Region: Seoul)
supabase login
supabase link --project-ref <클라우드_프로젝트_ref>
supabase db push                        # 로컬 마이그레이션을 클라우드에 그대로 적용
# 2) .env.local 의 URL/anon key 를 클라우드 값으로 교체
# 3) (Edge Function 이 있으면) supabase functions deploy <name>
# 4) 클라우드 대시보드에서 Auth(이메일 확인 등) 설정 재확인
```
스키마는 `db push` 한 방. 가장 귀찮은 데이터 이전이 없어서 간단하다.

## Phase 0 종료 후

완료 기준이 전부 통과하면 다음은 **Phase 1 (프로필 + 코스)**:
프로필 본문(얼굴상/MBTI/자기소개/태그), 학교·직장 이메일 인증, 코스 등록 +
네이버 지도 연동, 가용 시간, 이상형 조건. → `phase1.md`.

> 막히거나 명세가 모호하면 추측하지 말고 멈춰서 질문할 것. (CLAUDE.md 가이드라인 1번)
