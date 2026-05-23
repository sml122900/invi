-- ============================================================================
-- ⚠️  REFERENCE ONLY — NO LONGER AUTHORITATIVE
-- ============================================================================
-- 이 파일은 초기 설계 단계의 스키마 스냅샷이며, 더 이상 권위(authoritative)가
-- 없다. 실제 적용되는 스키마는 `supabase/migrations/` 디렉토리의 SQL 파일들이
-- 기준이며, `supabase db reset` 도 그 디렉토리만 실행한다.
--
-- 이 파일을 데이터베이스에 직접 적용하지 말 것 (`psql -f schema.sql` 금지).
-- 다음과 같은 점에서 마이그레이션과 불일치한다:
--   - 스키마 이름: 여기는 `vault`, 마이그레이션은 `private` (로컬 Supabase 충돌로 rename)
--   - `profiles.gender` / `birth_year`: 여기는 NOT NULL, 마이그레이션은 nullable
--     (Phase 0 에서 가입 → 온보딩 분리 구조로 바뀜)
--   - `handle_new_user()`: 마이그레이션 버전은 `profiles` 빈 행도 함께 INSERT
--   - 그 외 후속 마이그레이션(profile RPC, app_config, ideal_type RPC) 이 포함 안 됨
--
-- 설계 의도/배경 참고용으로만 보존. 변경은 새 마이그레이션 파일에 작성.
-- ============================================================================
-- INVI — 소개팅 앱 DB 스키마 (Supabase / PostgreSQL)
-- ============================================================================
-- 설계 원칙
--   1. 인증 정보(vault 스키마)와 활동 정보(public 스키마)를 물리적으로 분리한다.
--   2. vault 스키마는 service_role 만 접근 가능하다. (RLS 완전 잠금)
--   3. 학교/회사 "같은 조직 제외" 비교는 org_name 평문이 아니라 해시로만 한다.
--   4. 다른 사용자의 프로필 노출은 매칭 Edge Function(service_role)이
--      가공(블러 등)해서 내려준다. 클라이언트가 타인 프로필을 직접 읽지 못한다.
--
-- ⚠️ 중요: vault.* 테이블은 public.* 테이블과 절대 직접 JOIN 하지 않는다.
--          연결은 오직 user_id(UUID) 로만, 그리고 service_role 컨텍스트에서만.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================================================
-- 0. 공통 유틸: updated_at 자동 갱신 트리거 함수
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- 1. 격리 스키마 (인증 정보) — service_role 전용
-- ============================================================================
create schema if not exists vault;

-- 학교/직장 인증. 활동 데이터와 절대 직접 조인 금지.
create table vault.verifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  type          text not null check (type in ('school', 'company')),
  org_name      text not null,                 -- 평문 보관 시 컬럼 암호화 권장(pgsodium)
  org_name_hash text not null,                 -- 같은 조직 비교용 sha256 해시
  email_hash    text,                          -- 인증 이메일 해시
  method        text not null check (method in ('email', 'document')),
  status        text not null default 'verified'
                  check (status in ('pending', 'verified', 'rejected', 'expired')),
  verified_at   timestamptz,
  reverify_due  timestamptz,                   -- 재인증 기한(가입 6개월 후)
  created_at    timestamptz not null default now()
);

create index idx_verifications_user     on vault.verifications(user_id);
create index idx_verifications_org_hash on vault.verifications(org_name_hash);

-- vault 완전 잠금: 정책을 만들지 않음 = 일반 사용자 전면 거부.
-- service_role 은 RLS 를 우회하므로 Edge Function 에서만 접근 가능.
alter table vault.verifications enable row level security;

-- ============================================================================
-- 2. 프로필 (활동 정보)
-- ============================================================================
-- auth.users(Supabase 관리) ←1:1← public.profiles
create table public.profiles (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  status         text not null default 'active'
                   check (status in ('active', 'suspended', 'deleted')),
  gender         text not null check (gender in ('male', 'female')),
  birth_year     int  not null check (birth_year between 1950 and 2010),
  height_cm      int  check (height_cm between 130 and 220),
  region         text,                          -- 거주 구 (예: '강남구')
  active_regions text[] default '{}',           -- 만남 가능 지역들
  mbti           text check (mbti is null or mbti ~ '^[EI][NS][TF][JP]$'),
  face_type      text,                          -- 동물상
  smoking        text check (smoking in ('none','sometimes','social','often')),
  drinking       text check (drinking in ('none','sometimes','social','often')),
  religion       text,
  intro_prompts  jsonb default '[]',            -- [{prompt, answer}] 3~6개
  tags           text[] default '{}',           -- 취향 태그
  manner_score   numeric(3,2) not null default 4.00 check (manner_score between 0 and 5),
  completeness   int not null default 0 check (completeness between 0 and 100),
  last_active_at timestamptz default now(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index idx_profiles_status   on public.profiles(status);
create index idx_profiles_gender    on public.profiles(gender);
create index idx_profiles_region    on public.profiles(region);
create index idx_profiles_active_at on public.profiles(last_active_at);

create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 같은 학교/회사 제외 설정 (둘 중 한 명이라도 ON 이면 매칭 제외)
create table public.org_match_settings (
  user_id              uuid primary key references public.profiles(user_id) on delete cascade,
  exclude_same_school  boolean not null default true,
  exclude_same_company boolean not null default true,
  updated_at           timestamptz not null default now()
);

create trigger trg_org_settings_updated
  before update on public.org_match_settings
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 3. 코스 & 장소
-- ============================================================================
create table public.courses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(user_id) on delete cascade,
  name         text not null,
  scenario     text not null
                 check (scenario in ('cafe','lunch','early_dinner','dinner','activity')),
  budget_range text check (budget_range in ('5','10','15','dutch')),  -- 만원 단위
  duration_min int,
  is_public    boolean not null default true,    -- 매칭 카드 노출 여부
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_courses_user on public.courses(user_id);

create trigger trg_courses_updated
  before update on public.courses
  for each row execute function public.set_updated_at();

create table public.places (
  id             uuid primary key default gen_random_uuid(),
  course_id      uuid not null references public.courses(id) on delete cascade,
  naver_place_id text,                            -- 네이버 장소 ID (OG 카드용)
  name           text not null,
  category       text not null
                   check (category in ('restaurant','cafe','bar','walk','activity')),
  sub_category   text,
  lat            double precision,
  lng            double precision,
  district       text,                            -- 동/구 (코스 겹침 점수용)
  stay_minutes   int default 90,
  user_note      text,                            -- 한 줄 메모 (100자)
  price_range    text,
  order_index    int not null default 0,          -- 코스 내 순서
  created_at     timestamptz not null default now()
);

create index idx_places_course   on public.places(course_id);
create index idx_places_naver     on public.places(naver_place_id);
create index idx_places_district  on public.places(district);

-- 가용 시간 (요일 × 슬롯)
create table public.available_times (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(user_id) on delete cascade,
  day_of_week  int  not null check (day_of_week between 0 and 6),  -- 0=일 ~ 6=토
  slot         text not null check (slot in ('weekday_evening','lunch','dinner')),
  unique (user_id, day_of_week, slot)
);

create index idx_available_user on public.available_times(user_id);

-- 특정 날짜 제외 (출장/시험 등)
create table public.time_exceptions (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  date    date not null,
  reason  text,
  unique (user_id, date)
);

-- ============================================================================
-- 4. 이상형 조건
-- ============================================================================
create table public.ideal_types (
  user_id        uuid primary key references public.profiles(user_id) on delete cascade,
  age_min        int,
  age_max        int,
  height_min     int,
  height_max     int,
  smoking_pref   text,
  drinking_pref  text,
  religion_pref  text,
  -- 아래는 토큰 결제 시에만 활성화되는 세분화 조건
  school_pref    text,
  company_pref   text,
  salary_pref    text,
  paid_until     timestamptz,                     -- 세분화 조건 활성 만료일
  updated_at     timestamptz not null default now()
);

create trigger trg_ideal_types_updated
  before update on public.ideal_types
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 5. 매칭 & 이력
-- ============================================================================
create table public.matches (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(user_id) on delete cascade,
  matched_user_id uuid not null references public.profiles(user_id) on delete cascade,
  match_date      date not null,
  match_slot      text not null check (match_slot in ('day','night')),  -- 13시/23시
  score           numeric(5,2),
  match_reasons   jsonb default '[]',              -- ["둘 다 마포구 와인바 선호", ...]
  status          text not null default 'pending'
                    check (status in ('pending','interested','passed','expired','matched')),
  expires_at      timestamptz not null,            -- 24시간 후
  created_at      timestamptz not null default now(),
  unique (user_id, matched_user_id, match_date, match_slot)
);

create index idx_matches_user    on public.matches(user_id);
create index idx_matches_status   on public.matches(status);
create index idx_matches_expires  on public.matches(expires_at);

-- 매칭 이력 (쿨다운 관리): 패스 30일 / 무산 60일 / 데이트 영구
create table public.match_history (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(user_id) on delete cascade,
  other_user_id   uuid not null references public.profiles(user_id) on delete cascade,
  last_matched_at timestamptz not null default now(),
  outcome         text not null check (outcome in ('passed','matched','dated','blocked')),
  cooldown_until  timestamptz,
  unique (user_id, other_user_id)
);

create index idx_match_history_user     on public.match_history(user_id);
create index idx_match_history_cooldown on public.match_history(cooldown_until);

-- ============================================================================
-- 6. 신청서(INVI) & 데이트
-- ============================================================================
create table public.invitations (
  id            uuid primary key default gen_random_uuid(),
  match_id      uuid not null references public.matches(id) on delete cascade,
  sender_id     uuid not null references public.profiles(user_id) on delete cascade,
  receiver_id   uuid not null references public.profiles(user_id) on delete cascade,
  proposed_date date not null,
  proposed_time time not null,
  meeting_point text,                              -- 만남 장소
  course_id     uuid references public.courses(id) on delete set null,
  custom_places jsonb,                             -- 역제안/코스합치기 시 장소 배열
  message       text check (char_length(message) <= 200),
  status        text not null default 'sent'
                  check (status in ('sent','accepted','time_adjust','counter','declined')),
  decline_reason text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_invitations_match    on public.invitations(match_id);
create index idx_invitations_sender    on public.invitations(sender_id);
create index idx_invitations_receiver  on public.invitations(receiver_id);
create index idx_invitations_status    on public.invitations(status);

create trigger trg_invitations_updated
  before update on public.invitations
  for each row execute function public.set_updated_at();

create table public.date_schedules (
  id               uuid primary key default gen_random_uuid(),
  invitation_id    uuid not null references public.invitations(id) on delete cascade,
  user_a_id        uuid not null references public.profiles(user_id) on delete cascade,
  user_b_id        uuid not null references public.profiles(user_id) on delete cascade,
  confirmed_date   date not null,
  confirmed_time   time not null,
  course_snapshot  jsonb not null,                 -- 신청 시점 코스 통째 복사 (불변)
  safety_checkin_at timestamptz,                    -- 안심 데이트 체크인 예정 시각
  status           text not null default 'confirmed'
                     check (status in ('confirmed','completed','no_show','cancelled')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_date_schedules_a on public.date_schedules(user_a_id);
create index idx_date_schedules_b on public.date_schedules(user_b_id);

create trigger trg_date_schedules_updated
  before update on public.date_schedules
  for each row execute function public.set_updated_at();

-- 학력/직장 공개 이력 (양방향 공개)
create table public.info_disclosures (
  id           uuid primary key default gen_random_uuid(),
  match_id     uuid not null references public.matches(id) on delete cascade,
  triggered_by uuid not null references public.profiles(user_id) on delete cascade,
  disclosed_at timestamptz not null default now(),
  unique (match_id)
);

-- ============================================================================
-- 7. 후기 / 매너 점수 / 토큰
-- ============================================================================
create table public.reviews (
  id               uuid primary key default gen_random_uuid(),
  date_schedule_id uuid not null references public.date_schedules(id) on delete cascade,
  reviewer_id      uuid not null references public.profiles(user_id) on delete cascade,
  reviewee_id      uuid not null references public.profiles(user_id) on delete cascade,
  showed_up        text not null check (showed_up in ('met','no_show_other','i_couldnt_go')),
  manner_rating    int  check (manner_rating between 1 and 5),
  created_at       timestamptz not null default now(),
  unique (date_schedule_id, reviewer_id)
);

create index idx_reviews_reviewee on public.reviews(reviewee_id);

create table public.token_balances (
  user_id    uuid primary key references public.profiles(user_id) on delete cascade,
  balance    int not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create trigger trg_token_balances_updated
  before update on public.token_balances
  for each row execute function public.set_updated_at();

create table public.token_transactions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(user_id) on delete cascade,
  amount     int  not null,                        -- +충전 / -사용
  type       text not null
               check (type in ('purchase','bonus','match_card','super_match',
                               'ideal_unlock','profile_boost','photo_request','refund')),
  ref_id     uuid,                                 -- 관련 매칭/신청서 ID
  created_at timestamptz not null default now()
);

create index idx_token_tx_user on public.token_transactions(user_id);

create table public.blocks (
  blocker_id uuid not null references public.profiles(user_id) on delete cascade,
  blocked_id uuid not null references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

-- ============================================================================
-- 8. 후기 작성 시 매너 점수 자동 재계산 트리거
-- ============================================================================
create or replace function public.recalc_manner_score()
returns trigger
language plpgsql
as $$
begin
  update public.profiles p
     set manner_score = coalesce((
           select round(avg(r.manner_rating)::numeric, 2)
             from public.reviews r
            where r.reviewee_id = new.reviewee_id
              and r.manner_rating is not null
         ), 4.00)
   where p.user_id = new.reviewee_id;
  return new;
end;
$$;

create trigger trg_reviews_recalc_manner
  after insert on public.reviews
  for each row execute function public.recalc_manner_score();

-- ============================================================================
-- 9. RLS 정책 — 기본은 "본인 데이터만". 타인 노출은 service_role 가 담당.
-- ============================================================================

-- profiles: 본인만 읽고 쓴다.
alter table public.profiles enable row level security;
create policy profiles_self_select on public.profiles
  for select using (auth.uid() = user_id);
create policy profiles_self_update on public.profiles
  for update using (auth.uid() = user_id);
create policy profiles_self_insert on public.profiles
  for insert with check (auth.uid() = user_id);

-- org_match_settings
alter table public.org_match_settings enable row level security;
create policy org_settings_self on public.org_match_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- courses / places (places 는 소유 코스 기준)
alter table public.courses enable row level security;
create policy courses_self on public.courses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.places enable row level security;
create policy places_self on public.places
  for all using (
    exists (select 1 from public.courses c
             where c.id = places.course_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.courses c
             where c.id = places.course_id and c.user_id = auth.uid())
  );

-- available_times / time_exceptions / ideal_types
alter table public.available_times enable row level security;
create policy available_self on public.available_times
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.time_exceptions enable row level security;
create policy time_exc_self on public.time_exceptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.ideal_types enable row level security;
create policy ideal_self on public.ideal_types
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- matches: 본인이 받은 매칭만 조회. 상태 변경(관심/패스)은 본인만.
alter table public.matches enable row level security;
create policy matches_self_select on public.matches
  for select using (auth.uid() = user_id);
create policy matches_self_update on public.matches
  for update using (auth.uid() = user_id);

-- match_history: 본인 것만 조회 (작성은 service_role)
alter table public.match_history enable row level security;
create policy match_history_self on public.match_history
  for select using (auth.uid() = user_id);

-- invitations: 보낸/받은 사람만 조회. 보내는 사람만 작성.
alter table public.invitations enable row level security;
create policy invitations_party_select on public.invitations
  for select using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy invitations_sender_insert on public.invitations
  for insert with check (auth.uid() = sender_id);
create policy invitations_party_update on public.invitations
  for update using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- date_schedules: 당사자만
alter table public.date_schedules enable row level security;
create policy date_party_select on public.date_schedules
  for select using (auth.uid() = user_a_id or auth.uid() = user_b_id);
create policy date_party_update on public.date_schedules
  for update using (auth.uid() = user_a_id or auth.uid() = user_b_id);

-- info_disclosures: 매칭 당사자만 (작성은 service_role 가 양방 공개 처리)
alter table public.info_disclosures enable row level security;
create policy disclosure_select on public.info_disclosures
  for select using (
    exists (select 1 from public.matches m
             where m.id = info_disclosures.match_id and m.user_id = auth.uid())
  );

-- reviews: 본인이 쓴/받은 것만 조회. 작성은 본인.
alter table public.reviews enable row level security;
create policy reviews_party_select on public.reviews
  for select using (auth.uid() = reviewer_id or auth.uid() = reviewee_id);
create policy reviews_self_insert on public.reviews
  for insert with check (auth.uid() = reviewer_id);

-- token_balances / token_transactions: 본인 조회 (변경은 service_role)
alter table public.token_balances enable row level security;
create policy token_balance_self on public.token_balances
  for select using (auth.uid() = user_id);

alter table public.token_transactions enable row level security;
create policy token_tx_self on public.token_transactions
  for select using (auth.uid() = user_id);

-- blocks: 본인이 건 차단만
alter table public.blocks enable row level security;
create policy blocks_self on public.blocks
  for all using (auth.uid() = blocker_id) with check (auth.uid() = blocker_id);

-- ============================================================================
-- 10. 신규 가입 시 빈 프로필/설정/토큰 잔액 자동 생성 트리거
-- ============================================================================
-- 주의: gender/birth_year 는 가입 직후 온보딩에서 채운다.
--       여기서는 토큰 잔액과 기본 설정 로우만 만들고, 프로필 본문은 앱에서 upsert.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.token_balances (user_id, balance)
  values (new.id, 200)                              -- 가입 보너스 200 (성별별 차등은 앱에서)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 11. 온보딩 완료 RPC (성별/생년 저장 + 기본행 생성 + 토큰 보너스 차등)
-- ============================================================================
-- 클라이언트는 이 함수만 호출한다: supabase.rpc('complete_onboarding', {...})
--   - security definer 로 실행되어 RLS 를 우회한다. 따라서 token_balances 등
--     민감 테이블은 클라이언트가 직접 못 바꾸고(아래 RLS), 오직 이 함수로만 변경된다.
--   - 연령(만 19세)·성별 검증을 서버에서 한 번 더 한다(클라이언트 우회 방지).
--   - 여성 가입 보너스(+300)는 'bonus' 트랜잭션 유무로 1회만(멱등) 지급한다.
--   - 모든 작업이 한 트랜잭션 안에서 원자적으로 처리된다.
create or replace function public.complete_onboarding(
  p_gender     text,
  p_birth_year int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid          uuid := auth.uid();
  v_current_year int  := extract(year from now())::int;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if p_gender not in ('male', 'female') then
    raise exception 'invalid_gender';
  end if;

  if p_birth_year is null or (v_current_year - p_birth_year) < 19 then
    raise exception 'under_age';        -- 만 19세 미만 차단(보수적: 연도 기준)
  end if;

  -- 프로필 본문 저장
  insert into public.profiles (user_id, gender, birth_year, status)
  values (v_uid, p_gender, p_birth_year, 'active')
  on conflict (user_id) do update
    set gender     = excluded.gender,
        birth_year = excluded.birth_year;

  -- 기본 설정/이상형 행 (없을 때만)
  insert into public.org_match_settings (user_id)
  values (v_uid) on conflict (user_id) do nothing;

  insert into public.ideal_types (user_id)
  values (v_uid) on conflict (user_id) do nothing;

  -- 토큰 잔액 행 보장 (가입 트리거가 이미 200 지급했어야 하나, 안전하게 보강)
  insert into public.token_balances (user_id, balance)
  values (v_uid, 200) on conflict (user_id) do nothing;

  -- 여성 가입 보너스 +300 (총 500). 'bonus' 트랜잭션이 없을 때만 1회.
  if p_gender = 'female' then
    if not exists (
      select 1 from public.token_transactions
       where user_id = v_uid and type = 'bonus'
    ) then
      insert into public.token_transactions (user_id, amount, type)
      values (v_uid, 300, 'bonus');

      update public.token_balances
         set balance = balance + 300
       where user_id = v_uid;
    end if;
  end if;
end;
$$;

-- 이 함수는 로그인 사용자가 본인 온보딩을 완료할 때만 호출한다.
revoke all     on function public.complete_onboarding(text, int) from public;
grant  execute on function public.complete_onboarding(text, int) to authenticated;

-- ============================================================================
-- 끝. 다음 단계
--   - Edge Function: 매칭 배치(Hard Filter → Scoring → Selection)
--   - Edge Function: 같은 조직 제외(vault.org_name_hash 비교, service_role)
--   - Edge Function: 매칭 카드 조립(타인 프로필 블러 처리 후 클라이언트로 전달)
-- ============================================================================
