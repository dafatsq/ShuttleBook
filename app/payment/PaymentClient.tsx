"use client"
import { useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { db, isFirebaseEnabled } from '@/lib/firebase'
import { COURTS, formatIDR } from '@/lib/courts'
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore'

export default function PaymentClient() {
  const params = useSearchParams()
  const router = useRouter()
  const date = params.get('date') || ''
  const courtId = params.get('courtId') || ''
  const slots = (params.get('slots') || '').split(',').filter(Boolean)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  const pricePerHour = useMemo(() => COURTS.find(c => c.id === courtId)?.pricePerHour ?? 0, [courtId])
  const total = useMemo(() => slots.length * 1.0 * pricePerHour, [slots, pricePerHour])

  const validEmail = (v: string) => /.+@.+\..+/.test(v)
  const validPhone = (v: string) => v.trim().length >= 6
  const canSubmit = name.trim().length > 1 && validEmail(email) && validPhone(phone) && slots.length > 0

  const pay = async () => {
    if (!isFirebaseEnabled || !db) {
      alert('Firebase not configured. This is a mock flow only.')
      return
    }
    if (!canSubmit) {
      alert('Please complete name, email, and phone correctly.')
      return
    }
    // Re-check availability to avoid double booking
    const qy = query(
      collection(db, 'bookings'),
      where('date', '==', date),
      where('courtId', '==', courtId)
    )
    const snap = await getDocs(qy)
    const taken: string[] = []
    snap.forEach(d => {
      const s = d.data().slots as string[]
      taken.push(...s)
    })
    const conflict = slots.some(s => taken.includes(s))
    if (conflict) {
      alert('One or more selected time slots were just booked by someone else. Please go back and reselect.')
      return
    }

    await addDoc(collection(db, 'bookings'), {
      date,
      courtId,
      slots,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      createdAt: Date.now(),
    })
    const qs = new URLSearchParams({ date, courtId, count: String(slots.length), name, email, phone })
    router.push(`/success?${qs.toString()}`)
  }

  return (
    <main className="min-h-screen p-6 md:p-10">
      <section className="card max-w-xl mx-auto p-6 md:p-8">
        <h1 className="text-2xl font-semibold mb-4">Mock Payment</h1>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between opacity-80"><span>Date</span><span>{date}</span></div>
          <div className="flex justify-between opacity-80"><span>Court</span><span>{courtId}</span></div>
          <div className="flex justify-between opacity-80"><span>Rate</span><span>{formatIDR(pricePerHour)}/h</span></div>
          <div className="flex justify-between opacity-80"><span>Slots</span><span>{slots.join(', ') || '-'}</span></div>
          <div className="flex justify-between font-medium pt-2 border-t border-white/10"><span>Total</span><span>{formatIDR(total)}</span></div>
        </div>
        <div className="mt-6 grid gap-3">
          <input
            className="input"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="input"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="input"
            placeholder="Phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <button onClick={pay} disabled={!canSubmit} className={`btn-primary mt-6 w-full ${!canSubmit ? 'opacity-60 pointer-events-none' : ''}`}>Pay now</button>
        <Link className="block text-center mt-3 opacity-70" href="/">Back</Link>
      </section>
    </main>
  )
}
