export type Court = {
  id: string
  name: string
  pricePerHour: number // in IDR
}

export const COURTS: Court[] = [
  { id: 'court-a', name: 'Court A', pricePerHour: 50000 },
  { id: 'court-b', name: 'Court B', pricePerHour: 75000 },
  { id: 'court-c', name: 'Court C', pricePerHour: 100000 },
  { id: 'court-d', name: 'Court D', pricePerHour: 125000 },
]

export function formatIDR(value: number) {
  try {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
  } catch {
    return `Rp ${value.toLocaleString('id-ID')}`
  }
}
