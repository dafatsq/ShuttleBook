import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/security'

export async function GET(req: NextRequest) {
  // Rate limiting by IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
             req.headers.get('x-real-ip') || 
             'unknown'
  const rateLimit = checkRateLimit(`time:${ip}`, 120, 60000) // 120 requests per minute
  
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { 
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(rateLimit.resetIn / 1000)) }
      }
    )
  }

  // Returns server-side current time in milliseconds
  return NextResponse.json({ now: Date.now() })
}
