# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

# INVI — Project Specification

> 소개팅 앱. 컨셉 "초대장으로 시작하는 소개팅". 매칭부터 첫 데이트 약속까지
> 카톡 없이 앱 안에서 끝낸다. 작업은 `phaseN.md` 파일 단위로 진행한다.
> 현재 작업 파일이 가리키는 Phase 범위 밖의 기능을 미리 구현하지 않는다.

## A. 기술 스택 (고정)

- **앱**: React Native + Expo (Expo Router, 파일 기반 라우팅)
- **언어**: TypeScript (strict). `any` 지양, DB 타입은 생성된 타입 사용.
- **백엔드/DB**: Supabase (PostgreSQL + Auth + Realtime + Edge Functions)
- **지도**: 네이버 지도/검색 API (장소 검색·정보). 표시는 자체 UI.
- **상태**: React 내장 + Supabase 클라이언트 우선. 전역 상태 라이브러리는
  실제 필요가 증명되기 전엔 도입 금지.
- **스타일**: 자체 theme 토큰 기반 StyleSheet. (CSS-in-JS 라이브러리 미도입)

새 라이브러리 추가는 꼭 필요할 때만, 추가 이유를 커밋/PR 설명에 남긴다.

## B. 디렉토리 구조 (이 구조를 따른다)

```
invi/
├── app/                       # Expo Router 화면 (라우팅 = 폴더 구조)
│   ├── _layout.tsx            # 루트 레이아웃 (세션 게이트)
│   ├── index.tsx              # 진입점 (세션 분기)
│   ├── (auth)/                # 비로그인 그룹
│   │   ├── sign-in.tsx
│   │   └── sign-up.tsx
│   ├── (onboarding)/          # 온보딩 그룹 (가입 직후)
│   │   └── basic-info.tsx     # 성별/생년 입력
│   └── (tabs)/                # 로그인 후 메인 (Phase 1+에서 채움)
│       └── index.tsx          # 홈 (오늘의 매칭) — Phase 2
├── src/
│   ├── components/
│   │   ├── ui/                # 기본 UI: Button, Card, Input, Text ...
│   │   └── domain/            # 도메인 UI: MatchCard, CourseCard, InviCard ...
│   ├── features/              # 기능 단위 모듈 (응집)
│   │   ├── auth/              #   - api.ts / hooks.ts / types.ts
│   │   ├── profile/
│   │   ├── courses/
│   │   ├── matching/
│   │   └── invitations/
│   ├── lib/                   # 외부 연동 래퍼
│   │   ├── supabase.ts        #   Supabase 클라이언트 (단일 인스턴스)
│   │   └── naver-maps.ts      #   네이버 API 래퍼 (Phase 1)
│   ├── hooks/                 # 공용 훅 (useSession 등)
│   ├── theme/                 # 디자인 시스템 토큰
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   └── index.ts           # theme 통합 export
│   ├── types/
│   │   └── database.ts        # Supabase 생성 타입 (supabase gen types)
│   └── utils/                 # 순수 함수 (날짜/포맷/검증 등)
├── supabase/
│   ├── schema.sql             # DB 스키마 (이미 작성됨)
│   └── functions/             # Edge Functions (Phase 2+)
├── assets/                    # 폰트/이미지
├── .env.local                 # 환경변수 (절대 커밋 금지, .gitignore 등록)
├── app.json                   # Expo 설정
├── CLAUDE.md
├── phase0.md ... phaseN.md    # Phase별 작업 명세
└── package.json
```

원칙:
- **화면(app/)은 얇게.** UI 조립과 네비게이션만. 데이터/로직은 `features/`로.
- **features/ 안에서 응집.** 한 기능의 api 호출·훅·타입을 같은 폴더에 둔다.
- **lib/ 는 외부 의존성 격리.** Supabase·네이버 API 호출은 lib 또는 features/api를
  거치고, 컴포넌트가 직접 fetch 하지 않는다.
- **theme 토큰만 사용.** 화면에서 색/폰트/간격을 하드코딩하지 않고 `theme`에서 가져온다.

## C. 네이밍 컨벤션

- 컴포넌트 파일: `PascalCase.tsx` (예: `MatchCard.tsx`)
- 화면 파일(app/): Expo Router 규칙대로 `kebab-case.tsx` (라우트 경로가 됨)
- 그 외 모듈: `kebab-case.ts` 또는 `camelCase.ts` (일관되게)
- 함수/변수: `camelCase` · 타입/인터페이스: `PascalCase` · 상수: `UPPER_SNAKE_CASE`
- DB 컬럼: `snake_case` (PostgreSQL 관례, 스키마와 일치)
- 앱 코드에서 DB 데이터를 다룰 땐 일관성 우선. 처음엔 snake_case 그대로 써도 무방.

## D. 보안 규칙 (절대 위반 금지)

이 프로젝트의 신뢰는 보안에서 나온다. 아래는 타협 불가.

- **인증 DB(`vault.*`)와 활동 DB(`public.*`)를 절대 직접 JOIN 하지 않는다.**
  연결은 `user_id`(UUID)로만, service_role 컨텍스트(Edge Function)에서만.
- **같은 학교/회사 제외는 평문이 아니라 `org_name_hash`(sha256)로만 비교.**
  조직명 평문을 매칭 로직에 끌어오지 않는다.
- **타인 프로필을 클라이언트가 직접 읽지 않는다.** 매칭 카드의 상대 정보는
  Edge Function(service_role)이 블러/가공 후 내려준다. `profiles` RLS는 본인 행만 허용.
- **학력/직장 공개는 반드시 양방향.** 단방향 공개 경로를 만들지 않는다.
- **토큰·잔액 등 민감 재화는 클라이언트가 직접 변경하지 않는다.** 조회만 RLS로
  허용하고, 변경은 security definer RPC(또는 Edge Function)로만 한다.
  (예: `complete_onboarding` 이 토큰 보너스를 원자적·멱등하게 처리)
- **service_role 키·API 시크릿은 클라이언트 번들에 절대 포함 금지.**
  Edge Function 환경변수로만 사용. 클라이언트에는 anon key만.
- 로그/에러 메시지에 식별정보(이메일·전화·실명·조직명)를 남기지 않는다.

## E. 제품 핵심 (구현이 이와 충돌하면 멈추고 질문)

- 얼굴/학력/직장은 처음엔 전부 비공개. 외모·스펙으로 거르지 않는 것이 정체성.
  "얼굴 공개" 류 기능을 임의로 추가하지 않는다.
- 매일 2회(낮 13시 / 밤 23시) 1명 매칭. 양방향 관심 시 성립. 패스/거절은 비노출.
- 데이트 코스 시스템이 최대 차별점. 신청서(날짜·시간·코스)를 한 번에 제시.
- 결제는 토큰 기반 단건. 구독제 아님. 가격은 성별 동일(가입 보너스만 차등).

## F. 디자인 시스템 (theme 토큰)

브랜드 **INVI**. 톤: 정중함 + 약간의 따뜻함. 청첩장 클리셰(꽃·하트·분홍·큰 한자) 배제.

- **다크모드 기본.** 본문 텍스트는 흰색 계열(`#E8E6E0` 이상으로 밝게).
  **회색 본문 텍스트 금지** — 가독성 최우선.
- 컬러(잠정, 옵션 B "모던 인비". 확정되면 갱신):
  - `primary` 차콜 `#2D2D2D`
  - `accent` 선셋 코랄 `#FF6B47`
  - `background` 다크 `#15140F` / 라이트 `#FFFFFF`
  - `surface` 웜 그레이 `#1F1E18`(다크) / `#F7F5F1`(라이트)
  - `textPrimary` `#E8E6E0`(다크) / `#1C1C1C`(라이트)
  - `textSecondary` 다크모드에서도 충분히 밝게(`#B8B5AC` 이상). 회색 본문 금지 원칙 유지.
- 폰트: 한글 Pretendard, 영문 Inter. 헤더 강조 세리프(Playfair/EB Garamond).
- 마이크로카피: "관심 보내기"→"초대하고 싶어요", "신청서"→"인비",
  "거절"→"정중히 사양". 강제 표현("필수","반드시") 최소화.

## G. 환경변수 (`.env.local`, Expo는 `EXPO_PUBLIC_` 접두사 규칙)

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...        # 클라이언트 노출 OK (anon)
# service_role 키와 네이버 API 키는 여기 두지 않는다 (Edge Function 환경변수)
```

## H. 작업 진행 규칙

- 작업은 `phaseN.md` 명세를 읽고 그 범위 안에서만 진행한다.
- 각 단계는 명세의 "verify" 기준으로 검증한 뒤 다음으로 넘어간다.
- Phase 범위를 벗어난 기능은 구현하지 않고, 필요하면 먼저 묻는다.
- 막히거나 명세가 모호하면 추측하지 말고 멈춰서 질문한다. (위 가이드라인 1번)
