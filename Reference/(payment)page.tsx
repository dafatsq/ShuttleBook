import { Suspense } from 'react'
import PaymentClient from './PaymentClient'

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading payment...</div>}>
      <PaymentClient />
    </Suspense>
  )
}
