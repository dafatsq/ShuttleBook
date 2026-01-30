"use client"
import { useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { db, isFirebaseEnabled } from '@/lib/firebase'
import { COURTS, formatIDR } from '@/lib/courts'
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore'

// Client-side validation functions (mirroring server-side)
const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254
const isValidPhone = (v: string) => /^\d{6,15}$/.test(v.replace(/[\s\-\(\)\+]/g, ''))
const isValidName = (v: string) => v.trim().length >= 2 && v.trim().length <= 100
const isValidDateFormat = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d)
const isValidCourtId = (c: string) => ['court-a', 'court-b', 'court-c', 'court-d'].includes(c)
const isValidTimeSlot = (s: string) => /^(0[7-9]|1[0-9]|2[01]):00$/.test(s)

export default function PaymentClient() {
  const params = useSearchParams()
  const router = useRouter()
  const date = params.get('date') || ''
  const courtId = params.get('courtId') || ''
  const slots = (params.get('slots') || '').split(',').filter(Boolean)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const pricePerHour = useMemo(() => COURTS.find(c => c.id === courtId)?.pricePerHour ?? 0, [courtId])
  const total = useMemo(() => slots.length * 1.0 * pricePerHour, [slots, pricePerHour])

  // Validate URL parameters
  const paramsValid = useMemo(() => {
    return isValidDateFormat(date) && 
           isValidCourtId(courtId) && 
           slots.length > 0 && 
           slots.length <= 15 &&
           slots.every(isValidTimeSlot)
  }, [date, courtId, slots])

  const canSubmit = paramsValid && 
                   isValidName(name) && 
                   isValidEmail(email) && 
                   isValidPhone(phone) && 
                   !isSubmitting

  const pay = async () => {
    if (!isFirebaseEnabled || !db) {
      alert('Firebase not configured. This is a mock flow only.')
      return
    }
    if (!canSubmit) {
      alert('Please complete name, email, and phone correctly.')
      return
    }
    
    setIsSubmitting(true)
    
    try {
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
        setIsSubmitting(false)
        return
      }

      // Sanitize and limit input data before storing
      const sanitizedName = name.trim().slice(0, 100)
      const sanitizedEmail = email.trim().toLowerCase().slice(0, 254)
      const sanitizedPhone = phone.trim().slice(0, 20)

      await addDoc(collection(db, 'bookings'), {
        date,
        courtId,
        slots,
        name: sanitizedName,
        email: sanitizedEmail,
        phone: sanitizedPhone,
        createdAt: Date.now(),
      })
      
      const qs = new URLSearchParams({ 
        date, 
        courtId, 
        count: String(slots.length), 
        name: sanitizedName, 
        email: sanitizedEmail, 
        phone: sanitizedPhone 
      })
      router.push(`/success?${qs.toString()}`)
    } catch {
      alert('An error occurred. Please try again.')
      setIsSubmitting(false)
    }
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
            maxLength={20}
          />
        </div>
        {!paramsValid && (
          <p className="text-red-500 text-sm mt-2">Invalid booking parameters. Please go back and try again.</p>
        )}
        <button 
          onClick={pay} 
          disabled={!canSubmit} 
          className={`btn-primary mt-6 w-full ${!canSubmit ? 'opacity-60 pointer-events-none' : ''}`}
        >
          {isSubmitting ? 'Processing...' : 'Pay now'}
        </button>
        <Link className="block text-center mt-3 opacity-70" href="/">Back</Link>
      </section>
    </main>
  )
}
