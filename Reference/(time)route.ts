import { NextResponse } from 'next/server'

export async function GET() {
  // Returns server-side current time in milliseconds
  return NextResponse.json({ now: Date.now() })
}
