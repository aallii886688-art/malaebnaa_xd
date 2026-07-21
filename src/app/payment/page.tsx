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

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [paymentFailed] = useState(params.get('payment') === 'failed')
  const paymentSuccess = params.get('payment') === 'success'

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
      window.location.href = data.checkoutUrl
    } catch {
      setError('خطأ في الاتصال. حاول مجدداً.')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)', paddingBottom: 40 }}>
      <header style={{ background: 'var(--bg2)', padding: '52px 16px 16px', borderBottom: '1px solid var(--border)' }}>
        <p style={{ fontSize: 11, color: 'var(--text3)', margin: '0 0 2px' }}>إتمام الحجز</p>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>الدفع</h1>
      </header>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>ملخص الطلب</h2>
          {facilityName && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--text2)' }}>المنشأة</span>
              <span style={{ fontWeight: 500, color: 'var(--text)' }}>{facilityName}</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: 'var(--text2)' }}>السعر</span>
            <span style={{ fontWeight: 500, color: 'var(--text)' }}>{amount} ريال</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>الإجمالي</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)' }}>{amount} ريال</span>
          </div>
        </div>

        <div style={{ background: 'var(--gold-dim)', border: '1px solid var(--gold)', borderRadius: 20, padding: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)', margin: '0 0 4px' }}>⚙️ بوابة الدفع قيد الإعداد</p>
          <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0 }}>سيتم تفعيل الدفع الإلكتروني قريباً. حجزك محفوظ بحالة &ldquo;انتظار الدفع&rdquo;.</p>
        </div>

        {paymentFailed && (
          <div style={{ background: 'var(--danger-dim)', border: '1px solid var(--danger)', borderRadius: 20, padding: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--danger)', margin: '0 0 4px' }}>❌ فشلت عملية الدفع</p>
            <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0 }}>لم يتم خصم أي مبلغ. يمكنك المحاولة مجدداً.</p>
          </div>
        )}

        {error && <p style={{ color: 'var(--danger)', fontSize: 12, textAlign: 'center' }}>{error}</p>}

        <button onClick={pay} disabled={loading || !bookingId}
          style={{ width: '100%', background: 'var(--primary)', color: 'var(--primary-fg)', padding: '16px', borderRadius: 20, fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', opacity: (loading || !bookingId) ? 0.5 : 1 }}>
          {loading ? 'جاري التوجيه للدفع...' : `ادفع ${amount} ريال`}
        </button>

        <button onClick={() => router.push('/player/bookings')}
          style={{ width: '100%', border: '1px solid var(--border)', color: 'var(--text2)', padding: '12px', borderRadius: 20, fontSize: 13, background: 'transparent', cursor: 'pointer' }}>
          تخطي — سأدفع لاحقاً
        </button>

        <p style={{ fontSize: 12, textAlign: 'center', color: 'var(--text3)' }}>الحجز محجوز لمدة محدودة. أكمل الدفع للتأكيد.</p>
      </div>
    </div>
  )
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>جاري التحميل...</div>}>
      <PaymentContent />
    </Suspense>
  )
}
