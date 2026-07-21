'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

function PaymentContent() {
  const params = useSearchParams()
  const router = useRouter()
  const bookingId = params.get('booking_id')
  const amountStr = params.get('amount')
  const facilityName = params.get('facility')
  const amount = amountStr ? parseFloat(amountStr) : 0
  const commission = Math.round(amount * 0.05 * 100) / 100
  const net = Math.round((amount - commission) * 100) / 100

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [paymentFailed, setPaymentFailed] = useState(params.get('payment') === 'failed')
  const paymentSuccess = params.get('payment') === 'success'

  // فحص إشعار نجاح/فشل من callback
  useEffect(() => {
    if (paymentSuccess) {
      router.replace('/player/bookings?payment=success')
    }
  }, [paymentSuccess, router])

  const pay = async () => {
    if (!bookingId || !amount) return
    setLoading(true); setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    try {
      const res = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentType: 'booking',
          entityId: bookingId,
          amountSar: amount,
          description: `حجز ${facilityName ?? 'ملعب'}`,
        }),
      })

      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'فشل بدء الدفع'); setLoading(false); return }

      // توجيه لرابط البوابة
      window.location.href = data.checkoutUrl
    } catch {
      setError('خطأ في الاتصال. حاول مجدداً.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-10">
      <header className="bg-[#0F6E56] text-white px-4 py-4">
        <p className="text-xs opacity-80">إتمام الحجز</p>
        <h1 className="text-lg font-bold">الدفع</h1>
      </header>

      <div className="px-4 py-5 space-y-4">
        {/* ملخص الطلب */}
        <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4 space-y-3">
          <h2 className="text-sm font-bold text-[#1A1A1A]">ملخص الطلب</h2>
          {facilityName && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#6B7280]">المنشأة</span>
              <span className="font-medium text-[#1A1A1A]">{facilityName}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#6B7280]">السعر</span>
            <span className="font-medium">{amount} ريال</span>
          </div>
          <div className="border-t border-[#F8F9FA] pt-3 flex items-center justify-between">
            <span className="text-sm font-bold text-[#1A1A1A]">الإجمالي</span>
            <span className="text-lg font-bold text-[#0F6E56]">{amount} ريال</span>
          </div>
        </div>

        {/* تحذير البوابة */}
        <div className="bg-[#FFF8E8] border border-[#C17B1A] rounded-2xl p-4">
          <p className="text-sm font-bold text-[#C17B1A] mb-1">⚙️ بوابة الدفع قيد الإعداد</p>
          <p className="text-xs text-[#6B7280]">سيتم تفعيل الدفع الإلكتروني قريباً. حجزك محفوظ بحالة &ldquo;انتظار الدفع&rdquo;.</p>
        </div>

        {paymentFailed && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-sm font-bold text-red-500 mb-1">❌ فشلت عملية الدفع</p>
            <p className="text-xs text-[#6B7280]">لم يتم خصم أي مبلغ. يمكنك المحاولة مجدداً.</p>
          </div>
        )}

        {error && <p className="text-red-500 text-xs text-center">{error}</p>}

        {/* زر الدفع */}
        <button onClick={pay} disabled={loading || !bookingId}
          className="w-full bg-[#0F6E56] text-white py-4 rounded-2xl font-bold text-base disabled:opacity-50">
          {loading ? 'جاري التوجيه للدفع...' : `ادفع ${amount} ريال`}
        </button>

        <button onClick={() => router.push('/player/bookings')}
          className="w-full border border-[#E8ECEF] text-[#6B7280] py-3 rounded-2xl text-sm">
          تخطي — سأدفع لاحقاً
        </button>

        <p className="text-xs text-center text-[#9CA3AF]">
          الحجز محجوز لمدة محدودة. أكمل الدفع للتأكيد.
        </p>
      </div>
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
