import Link from 'next/link'
import { COURTS, formatIDR } from '@/lib/courts'

export default function SuccessPage({ searchParams }: { searchParams: { date: string; courtId: string; count: string; name?: string; email?: string; phone?: string } }) {
  const court = COURTS.find(c => c.id === searchParams.courtId)
  const hours = Number(searchParams.count || '0')
  const total = court ? court.pricePerHour * hours : 0
  return (
    <main className="min-h-screen p-6 md:p-10">
      <section className="card max-w-xl mx-auto p-6 md:p-8 text-center">
        <h1 className="text-2xl font-semibold mb-2">Booking Confirmed 🎉</h1>
        <p className="opacity-80">Date: {searchParams.date}</p>
        <p className="opacity-80">Court: {court?.name || searchParams.courtId}</p>
        <p className="opacity-80">Slots: {hours} x 1h</p>
        {searchParams.name && <p className="opacity-80">Name: {searchParams.name}</p>}
        {searchParams.email && <p className="opacity-80">Email: {searchParams.email}</p>}
        {searchParams.phone && <p className="opacity-80">Phone: {searchParams.phone}</p>}
        <p className="opacity-80">Total: {formatIDR(total)}</p>
        <Link href="/" className="btn-primary mt-6 inline-block">Back to home</Link>
      </section>
    </main>
  )
}
