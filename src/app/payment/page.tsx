'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'

// صفحة الدفع — مؤقتة حتى يتم تحديد بوابة الدفع
function PaymentContent() {
  const params = useSearchParams()
  const router = useRouter()
  const bookingId = params.get('booking_id')
  const amount = params.get('amount')
  const facilityName = params.get('facility')

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center px-4 text-center">
      <div className="text-6xl mb-4">💳</div>
      <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">صفحة الدفع</h2>

      {facilityName && <p className="text-sm text-[#6B7280] mb-1">{facilityName}</p>}
      {amount && (
        <p className="text-2xl font-bold text-[#0F6E56] mb-6">{amount} ريال</p>
      )}

      <div className="bg-[#FFF8E8] border border-[#C17B1A] rounded-2xl p-4 max-w-xs w-full mb-6">
        <p className="text-sm font-bold text-[#C17B1A] mb-1">⚙️ قيد الإعداد</p>
        <p className="text-xs text-[#6B7280]">بوابة الدفع ستُفعَّل قريباً. الحجز محفوظ بحالة &ldquo;انتظار الدفع&rdquo;.</p>
      </div>

      <button onClick={() => router.push('/player/bookings')}
        className="bg-[#0F6E56] text-white px-6 py-3 rounded-2xl font-bold text-sm">
        متابعة ← حجوزاتي
      </button>
    </div>
  )
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-[#6B7280]">جاري التحميل...</div>}>
      <PaymentContent />
    </Suspense>
  )
}
