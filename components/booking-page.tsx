"use client"
import { useEffect, useMemo, useState } from 'react'
import { addDays, format, isBefore, isToday, isSameDay, startOfDay } from 'date-fns'
import { CalendarDays, Clock, Sun, Moon } from 'lucide-react'
import Link from 'next/link'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db, isFirebaseEnabled } from '@/lib/firebase'
import { COURTS, formatIDR } from '@/lib/courts'
import { useTheme } from '@/components/theme-provider'

export type TimeSlot = string // e.g., '08:00'

const START_HOUR = 7
const END_HOUR = 22

function buildSlots(): TimeSlot[] {
  const slots: TimeSlot[] = []
  for (let h = START_HOUR; h < END_HOUR; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`)
  }
  return slots
}

const ALL_SLOTS = buildSlots()

export default function BookingPage() {
  const [date, setDate] = useState<Date>(new Date())
  const [courtId, setCourtId] = useState(COURTS[0].id)
  const [selected, setSelected] = useState<TimeSlot[]>([])
  const [bookedSlots, setBookedSlots] = useState<TimeSlot[]>([])
  const [now, setNow] = useState<Date>(new Date())
  const [drift, setDrift] = useState<number>(0) // serverNow - clientNow

  // Initial sync with server time and periodic resync
  useEffect(() => {
    const sync = async () => {
      try {
        const res = await fetch('/api/time', { cache: 'no-store' })
        const data = await res.json()
        const serverNow = Number(data.now)
        const clientNow = Date.now()
        setDrift(serverNow - clientNow)
        setNow(new Date(clientNow + (serverNow - clientNow)))
      } catch {
        // Fallback: use client time
        setDrift(0)
        setNow(new Date())
      }
    }
    sync()
    const syncId = setInterval(sync, 5 * 60_000) // resync every 5 minutes
    return () => clearInterval(syncId)
  }, [])

  // Tick every minute so past slots disable automatically and date list updates at midnight
  useEffect(() => {
    const id = setInterval(() => {
      const clientNow = Date.now()
      setNow(new Date(clientNow + drift))
    }, 60_000)
    return () => clearInterval(id)
  }, [drift])

  // When the day rolls over, if the selected date is in the past (yesterday), move to today
  useEffect(() => {
    const todayStart = startOfDay(now)
    if (isBefore(date, todayStart)) {
      setDate(new Date(now))
    }
  }, [now])

  useEffect(() => {
    // Fetch booked slots for selected date and court
    const fetchBooked = async () => {
      if (!isFirebaseEnabled || !db) { setBookedSlots([]); return }
      try {
        const dayKey = format(date, 'yyyy-MM-dd')
        const qy = query(
          collection(db, 'bookings'),
          where('date', '==', dayKey),
          where('courtId', '==', courtId)
        )
        const snap = await getDocs(qy)
        const taken: string[] = []
        snap.forEach((doc) => {
          const data = doc.data() as { slots?: string[] }
          const s = data.slots ?? []
          taken.push(...s)
        })
        setBookedSlots(taken)
        // Deselect any selected that are no longer available
        setSelected((prev: TimeSlot[]) => prev.filter((s: TimeSlot) => !taken.includes(s)))
      } catch (e) {
        console.error(e)
      }
    }
    fetchBooked()
  }, [date, courtId])

  const isPast = (slot: TimeSlot) => {
    if (!isToday(date)) return false
    const [h, m] = slot.split(':').map(Number)
    const slotDate = new Date(now)
    slotDate.setHours(h, m, 0, 0)
    return isBefore(slotDate, now)
  }

  const disabled = (slot: TimeSlot) => bookedSlots.includes(slot) || isPast(slot)

  const toggleSlot = (slot: TimeSlot) => {
    if (disabled(slot)) return
    setSelected((prev: TimeSlot[]) => prev.includes(slot) ? prev.filter((s: TimeSlot) => s !== slot) : [...prev, slot])
  }

  const totalHours = useMemo(() => selected.length * 1.0, [selected])
  const pricePerHour = useMemo(() => COURTS.find(c => c.id === courtId)?.pricePerHour ?? 0, [courtId])
  const totalPrice = useMemo(() => totalHours * pricePerHour, [totalHours, pricePerHour])

  const dayOptions = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i))

  const { theme, toggle, mounted } = useTheme()

  return (
    <main className="min-h-screen p-5 md:p-10">
      {/* Header Card */}
      <section className="card p-6 md:p-8 max-w-6xl mx-auto mb-6">
        <div className="flex items-start md:items-center gap-4 md:gap-6 justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Shuttle<span className="text-primary">Book</span></h1>
          </div>
          <button
            aria-label={mounted ? (theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode') : 'Toggle theme'}
            onClick={toggle}
            className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center shadow-soft dark:shadow-softDark hover:brightness-110 active:brightness-95 transition"
            title="Toggle theme"
          >
            {mounted ? (
              theme === 'dark' ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )
            ) : (
              <Sun className="h-5 w-5" />
            )}
          </button>
        </div>
      </section>

      {/* Filters Card (Date) */}
      <section className="card p-6 md:p-8 max-w-6xl mx-auto mb-6">
        <div className="grid grid-cols-1 gap-6">
          {/* Date chips */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="w-5 h-5 opacity-60" />
              <h2 className="text-xl font-semibold">Select date</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory pr-1">
              {dayOptions.map((d) => {
                const active = isSameDay(d, date)
                return (
                  <button
                    key={d.toISOString()}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setDate(d)}
                    className={`snap-start shrink-0 px-5 py-3 rounded-full border text-base md:text-sm transition shadow-sm
                      ${active ? 'bg-primary text-white border-primary' : 'bg-white/70 dark:bg-white/5 border-slate-200/60 dark:border-white/10 hover:bg-primary/10 dark:hover:bg-white/10'}
                    `}
                    title={format(d, 'EEE, MMM d')}
                  >
                    {format(d, 'EEE, MMM d')}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Courts Card with pricing */}
      <section className="card p-6 md:p-8 max-w-6xl mx-auto mb-6">
        <h2 className="text-xl font-semibold mb-4">Select court</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {COURTS.map((c) => {
            const active = c.id === courtId
            return (
              <button
                key={c.id}
                onClick={() => setCourtId(c.id)}
                className={`text-left rounded-2xl border p-4 transition shadow-sm
                  ${active ? 'bg-primary text-white border-primary' : 'bg-white/70 dark:bg-white/5 border-slate-200/60 dark:border-white/10 hover:bg-primary/10 dark:hover:bg-white/10'}
                `}
              >
                <div className="text-base font-medium">{c.name}</div>
                <div className={`mt-1 text-sm ${active ? 'text-white/90' : 'opacity-80'}`}>Per hour</div>
                <div className="mt-2 text-xl font-semibold">{formatIDR(c.pricePerHour)}</div>
              </button>
            )
          })}
        </div>
      </section>

      {/* Main content */}
      <div className="max-w-6xl mx-auto grid md:grid-cols-[1.4fr_.6fr] gap-6">
        <section className="card p-6 md:p-8">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5" />
            <h2 className="text-xl font-semibold">Select start time</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {ALL_SLOTS.map(slot => {
              const isDisabled = disabled(slot)
              const isActive = selected.includes(slot)
              return (
                <button
                  key={slot}
                  onClick={() => toggleSlot(slot)}
                  className={`px-3 py-2 rounded-lg border text-sm transition
                    ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-primary/10 dark:hover:bg-white/10'}
                    ${isActive ? 'bg-primary text-white border-primary' : 'bg-white/70 dark:bg-white/5 border-slate-200/60 dark:border-white/10'}
                  `}
                  disabled={isDisabled}
                >
                  {slot}
                </button>
              )
            })}
          </div>
        </section>

        <aside className="card p-6 md:p-8 h-fit">
          <h3 className="text-lg font-semibold mb-4">Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between opacity-80"><span>Date</span><span>{format(date,'EEE, MMM d yyyy')}</span></div>
            <div className="flex justify-between opacity-80"><span>Court</span><span>{COURTS.find(c=>c.id===courtId)?.name}</span></div>
            <div className="flex justify-between opacity-80"><span>Slots</span><span>{selected.length} x 1h</span></div>
            <div className="flex justify-between opacity-80"><span>Rate</span><span>{formatIDR(pricePerHour)}/h</span></div>
            <div className="flex justify-between font-medium pt-2 border-t border-white/10"><span>Total</span><span>{formatIDR(totalPrice)}</span></div>
          </div>

          <Link
            href={{ pathname: '/payment', query: { date: format(date,'yyyy-MM-dd'), courtId, slots: selected.join(',') } }}
            className={`btn-primary mt-6 block text-center ${selected.length===0 ? 'pointer-events-none opacity-60' : ''}`}
          >
            Continue to payment
          </Link>
          <p className="text-xs opacity-60 mt-2">Past or already-booked times are disabled.</p>
        </aside>
      </div>
    </main>
  )
}
