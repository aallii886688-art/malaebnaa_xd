'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import DynamicFields, { type DynamicFieldsHandle, saveDynamicFieldValues } from '@/components/DynamicFields'

type Facility = { id: string; name: string; city: string; district: string | null; sport_type: string; owner_id: string }
type TimeSlot  = { id: string; start_hour: number; end_hour: number; price_sar: number }

const fmt = (h: number) => `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? 'ص' : 'م'}`
const sportEmoji: Record<string, string> = { football:'⚽', futsal:'🥅', padel:'🎾', basketball:'🏀', volleyball:'🏐', tennis:'🎾', other:'🏅' }

function ConfirmContent() {
  const router = useRouter()
  const params = useSearchParams()
  const facilityId = params.get('facility_id')
  const slotId     = params.get('slot_id')
  const date       = params.get('date')

  const [facility, setFacility] = useState<Facility | null>(null)
  const [slot,     setSlot]     = useState<TimeSlot | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [error,    setError]    = useState('')
  const [facilityOwnerId, setFacilityOwnerId] = useState<string | null>(null)
  const dynamicRef = useRef<DynamicFieldsHandle>(null)

  useEffect(() => {
    if (!facilityId || !slotId || !date) { router.push('/player/facilities'); return }
    const supabase = createClient()
    Promise.all([
      supabase.from('facilities').select('id,name,city,district,sport_type,owner_id').eq('id', facilityId).single(),
      supabase.from('facility_time_slots').select('id,start_hour,end_hour,price_sar').eq('id', slotId).single(),
    ]).then(([{ data: f }, { data: s }]) => {
      if (!f || !s) { router.push('/player/facilities'); return }
      setFacility(f as Facility)
      setFacilityOwnerId((f as Facility)?.owner_id ?? null)
      setSlot(s as TimeSlot); setLoading(false)
    })
  }, [facilityId, slotId, date, router])

  const confirmBooking = async () => {
    if (!facility || !slot || !date) return
    if (dynamicRef.current && !dynamicRef.current.validate()) return
    setConfirming(true); setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const commission = Math.round(slot.price_sar * 0.05 * 100) / 100
    const { data, error: err } = await supabase.from('bookings').insert({
      facility_id: facility.id, user_id: user.id, booking_date: date,
      start_hour: slot.start_hour, end_hour: slot.end_hour,
      total_amount_sar: slot.price_sar, commission_sar: commission, net_amount_sar: slot.price_sar - commission,
      status: 'pending_payment',
    }).select('id').single()
    if (err) { setError('فشل إنشاء الحجز، حاول مجدداً'); setConfirming(false); return }
    if (dynamicRef.current && data?.id) {
      await saveDynamicFieldValues(dynamicRef.current.getValues(), data.id, 'bookings', user.id)
    }
    router.push(`/payment?booking_id=${data?.id}&amount=${slot.price_sar}&facility=${encodeURIComponent(facility.name)}`)
  }

  if (loading) return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text3)' }}>جاري التحميل...</p>
    </div>
  )

  const dateObj   = date ? new Date(date + 'T12:00:00') : null
  const dateLabel = dateObj?.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: 140 }}>
      {/* Header */}
      <div style={{ background: 'var(--bg2)', padding: '52px 16px 16px', borderBottom: '1px solid var(--border)', position: 'relative' }}>
        <button onClick={() => router.back()}
          style={{ position: 'absolute', top: 48, right: 16, background: 'none', border: 'none', color: 'var(--text3)', fontSize: 20, cursor: 'pointer' }}>←</button>
        <p style={{ color: 'var(--text3)', fontSize: 12, textAlign: 'center' }}>الخطوة الأخيرة</p>
        <h1 style={{ color: 'var(--text)', fontSize: 18, fontWeight: 700, textAlign: 'center', marginTop: 2 }}>تأكيد الحجز</h1>
      </div>

      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Step bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {[{ n: 1, l: 'الملعب' }, { n: 2, l: 'الوقت' }, { n: 3, l: 'التأكيد' }].map((s, i) => (
            <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: 5, flex: i < 2 ? 1 : 'unset' }}>
              <div style={{ width: 22, height: 22, borderRadius: 11, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', fontWeight: 700 }}>✓</div>
              <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600 }}>{s.l}</span>
              {i < 2 && <div style={{ flex: 1, height: 1.5, background: 'var(--primary)' }} />}
            </div>
          ))}
        </div>

        {/* Booking summary card */}
        <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
          <div style={{ background: 'linear-gradient(135deg,#0F6E56,#1A9870)', padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 28 }}>{sportEmoji[facility?.sport_type ?? ''] ?? '🏅'}</span>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>ملخص حجزك</p>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: 17 }}>{facility?.name}</p>
              </div>
            </div>
          </div>
          <div style={{ padding: '16px' }}>
            {[
              { l: 'الموقع', v: `${facility?.city}${facility?.district ? ` · ${facility.district}` : ''}` },
              { l: 'التاريخ', v: dateLabel ?? '' },
              { l: 'الوقت',   v: slot ? `${fmt(slot.start_hour)} – ${fmt(slot.end_hour)}` : '' },
            ].map((row) => (
              <div key={row.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text3)', fontSize: 13 }}>{row.l}</span>
                <span style={{ color: 'var(--text)', fontSize: 13, fontWeight: 600 }} dir="ltr">{row.v}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12 }}>
              <span style={{ color: 'var(--text)', fontWeight: 700, fontSize: 15 }}>الإجمالي</span>
              <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 22 }}>{slot?.price_sar} ريال</span>
            </div>
          </div>
        </div>

        {/* الحقول الديناميكية للحجز */}
        {facilityOwnerId && (
          <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16 }}>
            <DynamicFields ref={dynamicRef} ownerId={facilityOwnerId} activity="facility_manager" useIn="booking" />
          </div>
        )}

        {/* Notice */}
        <div style={{ background: 'var(--gold-dim)', border: '1px solid var(--gold)', borderRadius: 16, padding: '14px', display: 'flex', gap: 10 }}>
          <span style={{ fontSize: 20 }}>⚡</span>
          <div>
            <p style={{ color: 'var(--gold)', fontSize: 13, fontWeight: 700 }}>الدفع قيد الإعداد</p>
            <p style={{ color: 'var(--text3)', fontSize: 12, marginTop: 2 }}>سيُفعَّل الدفع الإلكتروني قريباً. يمكن الدفع عند الوصول.</p>
          </div>
        </div>

        {/* Policy */}
        <div style={{ background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)', padding: '14px' }}>
          <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: 13, marginBottom: 8 }}>سياسة الإلغاء</p>
          <p style={{ color: 'var(--text3)', fontSize: 12, lineHeight: 1.7 }}>• الإلغاء مجاناً قبل 24 ساعة من الموعد{'\n'}• يصلك إشعار تأكيد عبر واتساب فور الحجز</p>
        </div>

        {error && <p style={{ color: 'var(--danger)', fontSize: 13, textAlign: 'center' }}>{error}</p>}
      </div>

      {/* Fixed buttons */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--bg2)', borderTop: '1px solid var(--border)', padding: '14px 16px 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button onClick={confirmBooking} disabled={confirming} className="press"
          style={{ width: '100%', padding: '15px', borderRadius: 16, background: 'var(--primary)', color: 'var(--primary-fg)', border: 'none', fontWeight: 700, fontSize: 16, cursor: 'pointer', opacity: confirming ? 0.6 : 1 }}>
          {confirming ? 'جاري التأكيد...' : `✓ تأكيد الحجز — ${slot?.price_sar} ريال`}
        </button>
        <button onClick={() => router.back()} style={{ width: '100%', padding: '13px', borderRadius: 16, background: 'none', border: '1.5px solid var(--border)', color: 'var(--text2)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
          تعديل الوقت
        </button>
      </div>
    </div>
  )
}

export default function ConfirmBookingPage() {
  return (
    <Suspense fallback={<div style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'var(--text3)' }}>جاري التحميل...</p></div>}>
      <ConfirmContent />
    </Suspense>
  )
}
