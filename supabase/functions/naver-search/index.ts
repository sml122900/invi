import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, '')
}

function mapCategory(
  naverCat: string
): 'restaurant' | 'cafe' | 'bar' | 'walk' | 'activity' {
  const c = naverCat.toLowerCase()
  if (
    c.includes('카페') || c.includes('커피') ||
    c.includes('디저트') || c.includes('베이커리')
  ) return 'cafe'
  if (
    c.includes('술') || c.includes('주점') ||
    c.includes('맥주') || c.includes('와인') || c.includes('bar')
  ) return 'bar'
  if (
    c.includes('음식') || c.includes('식당') || c.includes('한식') ||
    c.includes('중식') || c.includes('일식') || c.includes('양식') ||
    c.includes('분식') || c.includes('치킨') || c.includes('피자') ||
    c.includes('고기') || c.includes('해산물')
  ) return 'restaurant'
  if (
    c.includes('공원') || c.includes('산책') || c.includes('자연') || c.includes('둘레길')
  ) return 'walk'
  return 'activity'
}

type NaverItem = {
  title?: string
  category?: string
  address?: string
  roadAddress?: string
  mapx?: string
  mapy?: string
  link?: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  // JWT 검증: 로그인 사용자만 허용
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  )
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

  // 요청 파싱
  let query: string
  let display = 5
  try {
    const body = await req.json() as { query?: unknown; display?: unknown }
    query = String(body.query ?? '').trim()
    if (typeof body.display === 'number') display = Math.min(Math.max(1, body.display), 5)
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }
  if (!query) return json({ error: 'query is required' }, 400)

  // 네이버 키 확인 (없으면 서버 측에서 차단)
  const clientId = Deno.env.get('NAVER_CLIENT_ID')
  const clientSecret = Deno.env.get('NAVER_CLIENT_SECRET')
  if (!clientId || !clientSecret) {
    console.error('Naver API keys not configured')
    return json({ error: 'Search service unavailable' }, 503)
  }

  // 네이버 지역 검색 API 호출
  const url = new URL('https://openapi.naver.com/v1/search/local.json')
  url.searchParams.set('query', query)
  url.searchParams.set('display', String(display))
  url.searchParams.set('sort', 'random')

  let naverRes: Response
  try {
    naverRes = await fetch(url.toString(), {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    })
  } catch {
    return json({ error: 'Search service unavailable' }, 503)
  }

  if (!naverRes.ok) {
    console.error('Naver API status:', naverRes.status)
    return json({ error: 'Search service unavailable' }, 503)
  }

  const naverData = await naverRes.json() as { items?: NaverItem[] }

  const items = (naverData.items ?? []).map((item) => ({
    name: stripHtml(item.title ?? ''),
    category: mapCategory(item.category ?? ''),
    naverCategory: item.category ?? '',
    address: item.address ?? '',
    roadAddress: item.roadAddress ?? '',
    // mapx=경도×1e7, mapy=위도×1e7 (Naver 좌표 형식)
    lat: item.mapy ? Number(item.mapy) / 1e7 : null,
    lng: item.mapx ? Number(item.mapx) / 1e7 : null,
    naverLink: item.link ?? '',
  }))

  return json({ items })
})
