export type Scenario = 'cafe' | 'lunch' | 'early_dinner' | 'dinner' | 'activity'
export type PlaceCategory = 'restaurant' | 'cafe' | 'bar' | 'walk' | 'activity'
export type TimeSlot = 'weekday_evening' | 'lunch' | 'dinner'

export interface SearchResult {
  name: string
  category: PlaceCategory
  naverCategory: string
  address: string
  roadAddress: string
  lat: number | null
  lng: number | null
  naverLink: string
}

export interface Course {
  id: string
  user_id: string
  name: string
  scenario: Scenario
  budget_range: string | null
  duration_min: number | null
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface Place {
  id: string
  course_id: string
  naver_place_id: string | null
  name: string
  category: PlaceCategory
  sub_category: string | null
  lat: number | null
  lng: number | null
  district: string | null
  stay_minutes: number
  user_note: string | null
  order_index: number
  created_at: string
}

export interface CourseWithPlaces extends Course {
  places: Place[]
}

export interface AvailableTime {
  id: string
  user_id: string
  day_of_week: number
  slot: TimeSlot
}
