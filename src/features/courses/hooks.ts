import { useState, useCallback, useEffect } from 'react'
import { getMyCourses, getCourseWithPlaces, getMyAvailableTimes } from './api'
import type { Course, CourseWithPlaces, AvailableTime } from './types'

export function useMyCourses() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const reload = useCallback(async () => {
    try {
      setLoading(true)
      setCourses(await getMyCourses())
      setError(null)
    } catch (e) {
      setError(e as Error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])
  return { courses, loading, error, reload }
}

export function useCourse(id: string | null) {
  const [course, setCourse] = useState<CourseWithPlaces | null>(null)
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      setCourse(await getCourseWithPlaces(id))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { reload() }, [reload])
  return { course, loading, reload, setCourse }
}

export function useMyAvailableTimes() {
  const [times, setTimes] = useState<AvailableTime[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setTimes(await getMyAvailableTimes())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])
  return { times, loading, reload }
}
