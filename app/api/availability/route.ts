import { NextRequest, NextResponse } from 'next/server'
import { db, isFirebaseEnabled } from '@/lib/firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { isValidDateFormat, isValidCourtId, checkRateLimit } from '@/lib/security'

export async function GET(req: NextRequest) {
  // Rate limiting by IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
             req.headers.get('x-real-ip') || 
             'unknown'
  const rateLimit = checkRateLimit(`availability:${ip}`, 100, 60000) // 100 requests per minute
  
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { 
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(rateLimit.resetIn / 1000)),
          'X-RateLimit-Remaining': '0'
        }
      }
    )
  }

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const courtId = searchParams.get('courtId')
  
  // Input validation
  if (!date || !courtId) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }
  
  if (!isValidDateFormat(date)) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
  }
  
  if (!isValidCourtId(courtId)) {
    return NextResponse.json({ error: 'Invalid court ID' }, { status: 400 })
  }

  if (!isFirebaseEnabled || !db) {
    // If Firebase is not configured, return no taken slots so the app remains demo-able.
    return NextResponse.json({ taken: [] })
  }

  try {
    const qy = query(collection(db!, 'bookings'), where('date', '==', date), where('courtId', '==', courtId))
    const snap = await getDocs(qy)
    const taken: string[] = []
    snap.forEach((doc) => {
      const data = doc.data() as { slots?: string[] }
      taken.push(...(data.slots ?? []))
    })

    return NextResponse.json({ taken })
  } catch {
    // Don't expose internal error details
    return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 })
  }
}
