import { supabase } from '@/lib/supabase'
import { DEFAULT_STAY_MINUTES } from './constants'
import type { Course, CourseWithPlaces, Place, SearchResult, AvailableTime } from './types'

export async function searchPlaces(query: string): Promise<SearchResult[]> {
  const { data, error } = await supabase.functions.invoke('naver-search', {
    body: { query, display: 5 },
  })
  if (error) throw error
  return ((data as { items?: SearchResult[] })?.items ?? [])
}

export async function getMyCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Course[]
}

export async function getCourseWithPlaces(id: string): Promise<CourseWithPlaces | null> {
  const { data, error } = await supabase
    .from('courses')
    .select('*, places(*)')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const raw = data as Record<string, unknown>
  const places = ((raw.places ?? []) as Place[]).sort((a, b) => a.order_index - b.order_index)
  return { ...(raw as unknown as Course), places }
}

export async function createCourse(name: string, scenario: Course['scenario']): Promise<Course> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('not_authenticated')
  const { data, error } = await supabase
    .from('courses')
    .insert({ name, scenario, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data as Course
}

export async function updateCourse(
  id: string,
  fields: Partial<Pick<Course, 'name' | 'is_public' | 'budget_range' | 'duration_min'>>
): Promise<void> {
  const { error } = await supabase.from('courses').update(fields).eq('id', id)
  if (error) throw error
}

export async function deleteCourse(id: string): Promise<void> {
  const { error } = await supabase.from('courses').delete().eq('id', id)
  if (error) throw error
}

export async function addPlace(
  courseId: string,
  result: SearchResult,
  orderIndex: number
): Promise<Place> {
  const districtMatch = (result.roadAddress || result.address).match(/([가-힣]+구)/)
  const district = districtMatch?.[1] ?? null

  const { data, error } = await supabase
    .from('places')
    .insert({
      course_id:    courseId,
      name:         result.name,
      category:     result.category,
      sub_category: result.naverCategory || null,
      lat:          result.lat,
      lng:          result.lng,
      district,
      stay_minutes: DEFAULT_STAY_MINUTES[result.category] ?? 90,
      order_index:  orderIndex,
    })
    .select()
    .single()
  if (error) throw error
  return data as Place
}

export async function deletePlace(id: string): Promise<void> {
  const { error } = await supabase.from('places').delete().eq('id', id)
  if (error) throw error
}

export async function reorderPlaces(updates: { id: string; order_index: number }[]): Promise<void> {
  await Promise.all(
    updates.map(({ id, order_index }) =>
      supabase.from('places').update({ order_index }).eq('id', id)
    )
  )
}

export async function getMyAvailableTimes(): Promise<AvailableTime[]> {
  const { data, error } = await supabase
    .from('available_times')
    .select('*')
    .order('day_of_week')
  if (error) throw error
  return (data ?? []) as AvailableTime[]
}

export async function setAvailableTimes(
  times: { day_of_week: number; slot: string }[]
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('not_authenticated')
  const { error: delErr } = await supabase
    .from('available_times')
    .delete()
    .eq('user_id', user.id)
  if (delErr) throw delErr
  if (times.length === 0) return
  const { error: insErr } = await supabase
    .from('available_times')
    .insert(times.map(t => ({ ...t, user_id: user.id })))
  if (insErr) throw insErr
}
