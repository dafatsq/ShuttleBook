import Link from 'next/link'
import { COURTS, formatIDR } from '@/lib/courts'

// Sanitize string for safe display (prevents XSS)
function sanitize(input: string | undefined): string {
  if (!input || typeof input !== 'string') return ''
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .slice(0, 200)
}

// Validate date format
function isValidDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date)
}

// Validate courtId
function isValidCourtId(courtId: string): boolean {
  return ['court-a', 'court-b', 'court-c', 'court-d'].includes(courtId)
}

type SearchParams = Promise<{ 
  date?: string
  courtId?: string
  count?: string
  name?: string
  email?: string
  phone?: string 
}>

export default async function SuccessPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  
  // Validate required params
  const date = params.date || ''
  const courtId = params.courtId || ''
  
  if (!isValidDate(date) || !isValidCourtId(courtId)) {
    return (
      <main className="min-h-screen p-6 md:p-10">
        <section className="card max-w-xl mx-auto p-6 md:p-8 text-center">
          <h1 className="text-2xl font-semibold mb-2">Invalid Request</h1>
          <p className="opacity-80 mb-4">The booking information is invalid.</p>
          <Link href="/" className="btn-primary inline-block">Back to home</Link>
        </section>
      </main>
    )
  }

  const court = COURTS.find(c => c.id === courtId)
  const hours = Math.min(Math.max(0, parseInt(params.count || '0', 10) || 0), 15)
  const total = court ? court.pricePerHour * hours : 0
  
  // Sanitize user-provided data
  const safeName = sanitize(params.name)
  const safeEmail = sanitize(params.email)
  const safePhone = sanitize(params.phone)

  return (
    <main className="min-h-screen p-6 md:p-10">
      <section className="card max-w-xl mx-auto p-6 md:p-8 text-center">
        <h1 className="text-2xl font-semibold mb-2">Booking Confirmed 🎉</h1>
        <p className="opacity-80">Date: {date}</p>
        <p className="opacity-80">Court: {court?.name || courtId}</p>
        <p className="opacity-80">Slots: {hours} x 1h</p>
        {safeName && <p className="opacity-80">Name: {safeName}</p>}
        {safeEmail && <p className="opacity-80">Email: {safeEmail}</p>}
        {safePhone && <p className="opacity-80">Phone: {safePhone}</p>}
        <p className="opacity-80">Total: {formatIDR(total)}</p>
        <Link href="/" className="btn-primary mt-6 inline-block">Back to home</Link>
      </section>
    </main>
  )
}
