'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'

type Field = { name: string; facilities: { name: string; city: string } | null }
type Booking = {
  id: number
  booking_date: string
  start_time: string
  end_time: string
  total_price: number
  status: string
  checkin_code: string | null
  deposit_amount: number
  deposit_status: string
  fields: Field | null
}

type RefundModal = { bookingId: number; facilityName: string; amount: number } | null

const statusInfo: Record<string, { label: string; bg: string; color: string }> = {
  pending_payment: { label: 'انتظار الدفع', bg: 'var(--gold-dim)', color: 'var(--gold)' },
  confirmed:       { label: 'مؤكد ✓',       bg: 'var(--primary-dim)', color: 'var(--primary)' },
  cancelled:       { label: 'ملغي',          bg: 'var(--danger-dim)', color: 'var(--danger)' },
  completed:       { label: 'مكتمل',         bg: 'var(--card2)', color: 'var(--text3)' },
  no_show:         { label: 'لم يحضر',       bg: 'var(--card2)', color: 'var(--text3)' },
}

const fmtTime = (t: string) => {
  const [h] = t.split(':').map(Number)
  return `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? 'ص' : 'م'}`
}

const depositStatusLabel: Record<string, string> = {
  pending:   '⏳ عربون معلق',
  paid:      '✅ عربون مدفوع',
  captured:  '✅ عربون مؤكد',
  refunded:  '↩️ عربون مُسترد',
  forfeited: '❌ عربون مُصادر',
}

export default function PlayerBookingsPage() {
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming')
  const [cancelling, setCancelling] = useState<number | null>(null)
  const [cancelConfirm, setCancelConfirm] = useState<number | null>(null)
  const [paymentBanner, setPaymentBanner] = useState<'success' | 'failed' | null>(null)
  const [refundModal, setRefundModal] = useState<RefundModal>(null)
  const [refundReason, setRefundReason] = useState('')
  const [refundSubmitting, setRefundSubmitting] = useState(false)
  const [refundMsg, setRefundMsg] = useState('')

  const load = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const today = new Date().toISOString().split('T')[0]
    let q = supabase
      .from('bookings')
      .select('id, booking_date, start_time, end_time, total_price, status, checkin_code, deposit_amount, deposit_status, fields!field_id(name, facilities!facility_id(name, city))')
      .eq('user_id', user.id)
      .order('booking_date', { ascending: filter === 'upcoming' })
    if (filter === 'upcoming') q = q.gte('booking_date', today).not('status', 'eq', 'cancelled')
    else q = q.lt('booking_date', today)
    const { data } = await q
    setBookings((data as unknown as Booking[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { setLoading(true); load() }, [filter])

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('payment')
    if (p === 'success') { setPaymentBanner('success'); window.history.replaceState({}, '', '/player/bookings') }
    else if (p === 'failed') { setPaymentBanner('failed'); window.history.replaceState({}, '', '/player/bookings') }
  }, [])

  const cancel = async (id: number) => {
    setCancelConfirm(null); setCancelling(id)
    const supabase = createClient()
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id)
    setBookings((b) => b.filter((x) => x.id !== id)); setCancelling(null)
  }

  const submitRefund = async () => {
    if (!refundModal || !refundReason.trim()) return
    setRefundSubmitting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('refunds').insert({
      user_id: user.id, payment_type: 'booking',
      entity_id: refundModal.bookingId,
      amount_sar: refundModal.amount, reason: refundReason.trim(),
    })
    if (error) { setRefundMsg('حدث خطأ، حاول مرة أخرى'); setRefundSubmitting(false); return }
    setRefundMsg('تم إرسال طلب الاسترداد بنجاح ✓')
    setTimeout(() => { setRefundModal(null); setRefundReason(''); setRefundMsg(''); setRefundSubmitting(false) }, 2000)
  }

  const getFacilityName = (b: Booking) => (b.fields?.facilities as { name: string } | null)?.name ?? 'الملعب'
  const getCity = (b: Booking) => (b.fields?.facilities as { city: string } | null)?.city ?? ''

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: 80 }}>
      {/* banner */}
      {paymentBanner && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, padding: '14px 16px', background: paymentBanner === 'success' ? 'var(--primary)' : 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>
            {paymentBanner === 'success' ? '✅ تم الدفع وتأكيد الحجز بنجاح!' : '❌ فشل الدفع — يرجى المحاولة مجدداً'}
          </span>
          <button onClick={() => setPaymentBanner(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* modal إلغاء */}
      {cancelConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setCancelConfirm(null)}>
          <div style={{ background: 'var(--card)', borderRadius: 20, padding: 24, width: '100%', maxWidth: 340 }} onClick={(e) => e.stopPropagation()}>
            <p style={{ fontWeight: 700, color: 'var(--text)', fontSize: 16, marginBottom: 8 }}>تأكيد الإلغاء</p>
            <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>هل أنت متأكد من إلغاء هذا الحجز؟</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => cancel(cancelConfirm)} disabled={cancelling === cancelConfirm}
                style={{ flex: 1, background: 'var(--danger)', color: '#fff', padding: '11px', borderRadius: 14, border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: cancelling === cancelConfirm ? 0.5 : 1 }}>
                {cancelling === cancelConfirm ? '...' : 'نعم، إلغاء'}
              </button>
              <button onClick={() => setCancelConfirm(null)}
                style={{ flex: 1, border: '1.5px solid var(--border)', padding: '11px', borderRadius: 14, background: 'transparent', color: 'var(--text)', fontSize: 14, cursor: 'pointer' }}>
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* modal استرداد */}
      {refundModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }} onClick={(e) => e.target === e.currentTarget && setRefundModal(null)}>
          <div style={{ background: 'var(--card)', borderRadius: '24px 24px 0 0', padding: '24px 20px', width: '100%', boxSizing: 'border-box' }}>
            <p style={{ color: 'var(--text)', fontSize: 17, fontWeight: 700, marginBottom: 6 }}>طلب استرداد المبلغ</p>
            <p style={{ color: 'var(--text3)', fontSize: 12, marginBottom: 16 }}>{refundModal.facilityName} · {refundModal.amount} ريال</p>
            <textarea value={refundReason} onChange={(e) => setRefundReason(e.target.value)}
              placeholder="سبب طلب الاسترداد..." rows={3}
              style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 14, padding: '12px', fontSize: 14, background: 'var(--bg)', color: 'var(--text)', outline: 'none', resize: 'none', boxSizing: 'border-box', marginBottom: 12 }} />
            {refundMsg && <p style={{ color: refundMsg.includes('✓') ? 'var(--primary)' : 'var(--danger)', fontSize: 13, marginBottom: 8 }}>{refundMsg}</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={submitRefund} disabled={refundSubmitting || !refundReason.trim()}
                style={{ flex: 1, background: 'var(--primary)', color: '#fff', padding: '12px', borderRadius: 14, border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: (refundSubmitting || !refundReason.trim()) ? 0.5 : 1 }}>
                {refundSubmitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
              </button>
              <button onClick={() => { setRefundModal(null); setRefundReason(''); setRefundMsg('') }}
                style={{ padding: '12px 20px', borderRadius: 14, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 14, cursor: 'pointer' }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background: 'var(--bg2)', padding: '52px 16px 0', borderBottom: '1px solid var(--border)' }}>
        <h1 style={{ color: 'var(--text)', fontSize: 22, fontWeight: 700, marginBottom: 14 }}>حجوزاتي</h1>
        <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--border)' }}>
          {(['upcoming', 'past'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ flex: 1, padding: '12px 0', fontSize: 14, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', color: filter === f ? 'var(--primary)' : 'var(--text3)', borderBottom: filter === f ? '2px solid var(--primary)' : '2px solid transparent', marginBottom: -2 }}>
              {f === 'upcoming' ? '📅 القادمة' : '🕐 السابقة'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          [1,2,3].map((i) => (
            <div key={i} style={{ background: 'var(--card)', borderRadius: 18, overflow: 'hidden', border: '1px solid var(--border)', padding: 14 }}>
              <div className="skeleton" style={{ height: 14, width: '60%', marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 11, width: '40%' }} />
            </div>
          ))
        ) : bookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>📅</div>
            <p style={{ color: 'var(--text)', fontWeight: 600, fontSize: 16 }}>
              {filter === 'upcoming' ? 'لا توجد حجوزات قادمة' : 'لا توجد حجوزات سابقة'}
            </p>
            {filter === 'upcoming' && (
              <button onClick={() => router.push('/player/facilities')} className="press"
                style={{ marginTop: 16, background: 'var(--primary)', color: '#fff', padding: '11px 28px', borderRadius: 14, border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                احجز ملعب الآن
              </button>
            )}
          </div>
        ) : bookings.map((b, i) => {
          const st = statusInfo[b.status] ?? { label: b.status, bg: 'var(--card2)', color: 'var(--text3)' }
          return (
            <div key={b.id} className="fade-up" style={{ animationDelay: `${i * 40}ms`, background: 'var(--card)', borderRadius: 18, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🏟️</div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: 15 }}>{getFacilityName(b)}</p>
                  <p style={{ color: 'var(--text3)', fontSize: 12, marginTop: 2 }}>📍 {getCity(b)}</p>
                  {b.fields?.name && <p style={{ color: 'var(--text3)', fontSize: 11, marginTop: 1 }}>🏅 {b.fields.name}</p>}
                </div>
                <span style={{ background: st.bg, color: st.color, fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20, flexShrink: 0 }}>{st.label}</span>
              </div>

              <div style={{ display: 'flex', gap: 0, padding: '10px 14px 0', borderTop: '1px solid var(--border)' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ color: 'var(--text3)', fontSize: 11 }}>التاريخ</p>
                  <p style={{ color: 'var(--text2)', fontSize: 13, fontWeight: 600, marginTop: 2 }}>
                    {new Date(b.booking_date + 'T12:00:00').toLocaleDateString('ar-SA', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: 'var(--text3)', fontSize: 11 }}>الوقت</p>
                  <p style={{ color: 'var(--text2)', fontSize: 13, fontWeight: 600, marginTop: 2 }} dir="ltr">{fmtTime(b.start_time)} – {fmtTime(b.end_time)}</p>
                </div>
                <div>
                  <p style={{ color: 'var(--text3)', fontSize: 11 }}>المبلغ</p>
                  <p style={{ color: 'var(--primary)', fontSize: 15, fontWeight: 700, marginTop: 2 }}>{b.total_price} ر</p>
                </div>
              </div>

              {/* كود الدخول */}
              {b.checkin_code && b.status === 'confirmed' && (
                <div style={{ margin: '10px 14px 0', background: 'var(--primary-dim)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 700, margin: '0 0 2px' }}>🎫 كود الدخول</p>
                    <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)', letterSpacing: 6, fontFamily: 'monospace', margin: 0 }} dir="ltr">{b.checkin_code}</p>
                  </div>
                  <p style={{ fontSize: 10, color: 'var(--primary)', opacity: 0.7, margin: 0, textAlign: 'right', maxWidth: 80, lineHeight: 1.4 }}>أرِه للموظف عند الدخول</p>
                </div>
              )}

              {/* حالة العربون */}
              {b.deposit_status && b.deposit_status !== 'none' && (
                <div style={{ margin: '8px 14px 0', background: 'var(--bg)', borderRadius: 10, padding: '6px 12px' }}>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                    {depositStatusLabel[b.deposit_status] ?? b.deposit_status}
                    {b.deposit_amount > 0 && ` · ${b.deposit_amount} ريال`}
                  </span>
                </div>
              )}

              {/* أزرار */}
              <div style={{ padding: '10px 14px 14px' }}>
                {(b.status === 'pending_payment' || b.status === 'confirmed') && filter === 'upcoming' && (
                  <button onClick={() => setCancelConfirm(b.id)} disabled={cancelling === b.id} className="press"
                    style={{ width: '100%', padding: '10px', borderRadius: 12, background: 'none', border: '1.5px solid var(--danger)', color: 'var(--danger)', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: cancelling === b.id ? 0.5 : 1 }}>
                    {cancelling === b.id ? 'جاري الإلغاء...' : 'إلغاء الحجز'}
                  </button>
                )}
                {b.status === 'completed' && filter === 'past' && (
                  <button onClick={() => setRefundModal({ bookingId: b.id, facilityName: getFacilityName(b), amount: b.total_price })} className="press"
                    style={{ width: '100%', padding: '10px', borderRadius: 12, background: 'none', border: '1.5px solid var(--border)', color: 'var(--text3)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    طلب استرداد
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <BottomNav />
    </div>
  )
}
