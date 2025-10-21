import { NextRequest, NextResponse } from 'next/server'
import { db, isFirebaseEnabled } from '@/lib/firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const courtId = searchParams.get('courtId')
  if (!date || !courtId) return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  if (!isFirebaseEnabled || !db) {
    // If Firebase is not configured, return no taken slots so the app remains demo-able.
    return NextResponse.json({ taken: [] })
  }

  const qy = query(collection(db!, 'bookings'), where('date', '==', date), where('courtId', '==', courtId))
  const snap = await getDocs(qy)
  const taken: string[] = []
  snap.forEach((doc) => {
    const data = doc.data() as { slots?: string[] }
    taken.push(...(data.slots ?? []))
  })

  return NextResponse.json({ taken })
}
