export const FACE_TYPES = [
  { value: 'dog',      label: '강아지' },
  { value: 'cat',      label: '고양이' },
  { value: 'fox',      label: '여우' },
  { value: 'rabbit',   label: '토끼' },
  { value: 'deer',     label: '사슴' },
  { value: 'bear',     label: '곰' },
  { value: 'wolf',     label: '늑대' },
  { value: 'squirrel', label: '다람쥐' },
] as const;

export const FREQUENCY_LEVELS = [
  { value: 'none',      label: '안 함' },
  { value: 'sometimes', label: '가끔' },
  { value: 'social',    label: '분위기상' },
  { value: 'often',     label: '즐겨 함' },
] as const;

export const RELIGION_OPTIONS = [
  { value: 'no_religion', label: '무교' },
  { value: 'christian',   label: '기독교' },
  { value: 'catholic',    label: '천주교' },
  { value: 'buddhist',    label: '불교' },
  { value: 'other',       label: '기타' },
] as const;

export const MBTI_EI = [{ value: 'E', label: 'E' }, { value: 'I', label: 'I' }] as const;
export const MBTI_NS = [{ value: 'N', label: 'N' }, { value: 'S', label: 'S' }] as const;
export const MBTI_TF = [{ value: 'T', label: 'T' }, { value: 'F', label: 'F' }] as const;
export const MBTI_JP = [{ value: 'J', label: 'J' }, { value: 'P', label: 'P' }] as const;

export const INTRO_PROMPTS = [
  '최근 가장 행복했던 순간은…',
  '주말엔 보통…',
  '데이트 상대에게 양보 못 하는 한 가지는…',
  '친구들이 말하는 나는…',
  '요즘 빠진 콘텐츠는…',
  '함께 가보고 싶은 곳은…',
] as const;

export const TAG_CATEGORIES = [
  {
    label: '음악',
    tags: [
      { id: 'music_pop',       label: '팝/인디' },
      { id: 'music_hiphop',    label: '힙합/R&B' },
      { id: 'music_classical', label: '클래식/재즈' },
      { id: 'music_concert',   label: '공연 관람' },
    ],
  },
  {
    label: '영화/콘텐츠',
    tags: [
      { id: 'content_movie',   label: '영화 마니아' },
      { id: 'content_series',  label: 'OTT 시리즈' },
      { id: 'content_webtoon', label: '웹툰/만화' },
      { id: 'content_book',    label: '독서' },
      { id: 'content_game',    label: '게임' },
    ],
  },
  {
    label: '운동/아웃도어',
    tags: [
      { id: 'sports_running',  label: '러닝' },
      { id: 'sports_gym',      label: '헬스/크로스핏' },
      { id: 'sports_yoga',     label: '요가/필라테스' },
      { id: 'sports_tennis',   label: '테니스/배드민턴' },
      { id: 'sports_hiking',   label: '등산/클라이밍' },
    ],
  },
  {
    label: '여행',
    tags: [
      { id: 'travel_abroad',   label: '해외여행' },
      { id: 'travel_domestic', label: '국내여행' },
      { id: 'travel_camping',  label: '캠핑/글램핑' },
      { id: 'travel_cafe',     label: '카페 투어' },
    ],
  },
  {
    label: '음식/음료',
    tags: [
      { id: 'food_cooking',    label: '요리' },
      { id: 'food_wine',       label: '와인/위스키' },
      { id: 'food_coffee',     label: '커피' },
      { id: 'food_dessert',    label: '디저트' },
      { id: 'food_brunch',     label: '브런치' },
    ],
  },
  {
    label: '문화/예술',
    tags: [
      { id: 'art_exhibit',     label: '전시/갤러리' },
      { id: 'art_youtube',     label: '유튜브/팟캐스트' },
      { id: 'art_photo',       label: '사진/필름' },
    ],
  },
] as const;

export const ALL_TAGS: ReadonlyArray<{ readonly id: string; readonly label: string }> =
  TAG_CATEGORIES.flatMap(c => c.tags as ReadonlyArray<{ readonly id: string; readonly label: string }>);

export const TAG_LABEL_MAP: Record<string, string> = Object.fromEntries(
  ALL_TAGS.map(t => [t.id, t.label])
);

export const SEOUL_DISTRICTS = [
  '강남구', '서초구', '송파구', '강동구',
  '강서구', '양천구', '구로구', '영등포구',
  '동작구', '관악구', '마포구', '서대문구',
  '은평구', '종로구', '중구', '성동구',
  '광진구', '동대문구', '중랑구', '성북구',
  '강북구', '도봉구', '노원구', '용산구',
] as const;
