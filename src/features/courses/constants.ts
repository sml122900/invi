import type { Scenario, PlaceCategory, TimeSlot } from './types'

export const SCENARIO_OPTIONS: { value: Scenario; label: string; hint: string }[] = [
  { value: 'cafe',         label: '카페 데이트',  hint: '카페 위주 가벼운 만남' },
  { value: 'lunch',        label: '점심 데이트',  hint: '식사 + 카페' },
  { value: 'early_dinner', label: '이른 저녁',    hint: '식사 + 술 또는 카페' },
  { value: 'dinner',       label: '저녁 데이트',  hint: '식사 + 바 / 카페' },
  { value: 'activity',     label: '액티비티',     hint: '활동 + 식사' },
]

export const CATEGORY_OPTIONS: { value: PlaceCategory; label: string }[] = [
  { value: 'restaurant', label: '식당' },
  { value: 'cafe',       label: '카페' },
  { value: 'bar',        label: '바/술집' },
  { value: 'walk',       label: '산책' },
  { value: 'activity',   label: '액티비티' },
]

export const CATEGORY_LABEL: Record<PlaceCategory, string> = {
  restaurant: '식당',
  cafe:       '카페',
  bar:        '바/술집',
  walk:       '산책',
  activity:   '액티비티',
}

export const DEFAULT_STAY_MINUTES: Record<PlaceCategory, number> = {
  restaurant: 90,
  cafe:       60,
  bar:        120,
  walk:       60,
  activity:   90,
}

export const SLOT_INFO: { slot: TimeSlot; label: string; desc: string }[] = [
  { slot: 'lunch',           label: '점심',     desc: '11:00 – 16:00' },
  { slot: 'weekday_evening', label: '평일 저녁', desc: '18:00 이후' },
  { slot: 'dinner',          label: '저녁',     desc: '17:00 – 22:00' },
]

export const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const
