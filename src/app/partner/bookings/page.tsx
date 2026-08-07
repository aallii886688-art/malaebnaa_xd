'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type FieldMap = Record<number, { name: string; facility_id: number; facility_name: string }>
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
  field_id: number
  profiles: { name: string; phone: string } | null
}

const statusInfo: Record<string, { label: string; bg: string; color: string }> = {
  pending_payment: { label: 'انتظار الدفع', bg: 'rgba(234,179,8,0.12)', color: '#ca8a04' },
  confirmed:       { label: 'مؤكد',          bg: 'var(--primary-dim)',   color: 'var(--primary)' },
  cancelled:       { label: 'ملغي',           bg: 'var(--danger-dim)',    color: 'var(--danger)' },
  completed:       { label: 'مكتمل',          bg: 'var(--bg)',            color: 'var(--text3)' },
  no_show:         { label: 'لم يحضر',        bg: 'var(--bg)',            color: 'var(--text3)' },
}

const fmtTime = (t: string) => {
  const [h] = t.split(':').map(Number)
  return `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? 'ص' : 'م'}`
}

export default function PartnerBookingsPage() {
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [fieldMap, setFieldMap] = useState<FieldMap>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'today' | 'upcoming' | 'all'>('today')
  const [updating, setUpdating] = useState<number | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [noShowModal, setNoShowModal] = useState<{ id: number; name: string } | null>(null)
  const [noShowResult, setNoShowResult] = useState<{ no_show_count: number; reliability_score: number; suspended: boolean } | null>(null)

  const load = async (uid: string) => {
    const supabase = createClient()
    const { data: facilities } = await supabase.from('facilities').select('id').eq('owner_id', uid)
    const facIds = facilities?.map(f => f.id) ?? []
    if (facIds.length === 0) { setBookings([]); setLoading(false); return }

    const { data: fields } = await supabase.from('fields').select('id, name, facility_id, facilities!facility_id(name)').in('facility_id', facIds)
    const fm: FieldMap = {}
    ;(fields ?? []).forEach((f: { id: number; name: string; facility_id: number; facilities: { name: string }[] | null }) => {
      const facName = Array.isArray(f.facilities) ? (f.facilities[0]?.name ?? '') : (f.facilities as { name: string } | null)?.name ?? ''
      fm[f.id] = { name: f.name, facility_id: f.facility_id, facility_name: facName }
    })
    setFieldMap(fm)
    const fieldIds = Object.keys(fm).map(Number)
    if (fieldIds.length === 0) { setBookings([]); setLoading(false); return }

    const today = new Date().toISOString().split('T')[0]
    let q = supabase
      .from('bookings')
      .select('id, booking_date, start_time, end_time, total_price, status, checkin_code, deposit_amount, deposit_status, field_id, profiles:user_id(name, phone)')
      .in('field_id', fieldIds)
      .order('booking_date', { ascending: true })
      .order('start_time', { ascending: true })

    if (filter === 'today')    q = q.eq('booking_date', today)
    else if (filter === 'upcoming') q = q.gte('booking_date', today).not('status', 'eq', 'cancelled')

    const { data } = await q
    setBookings((data as unknown as Booking[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      load(user.id)
    })
  }, [])

  useEffect(() => {
    if (!userId) return
    setLoading(true); load(userId)
  }, [filter])

  const updateStatus = async (id: number, status: string) => {
    setUpdating(id)
    await fetch('/api/booking-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: id, status }),
    })
    setBookings(b => b.map(x => x.id === id ? { ...x, status } : x))
    setUpdating(null)
  }

  const recordNoShow = async (bookingId: number) => {
    if (!userId) return
    setUpdating(bookingId)
    const supabase = createClient()
    const { data } = await supabase.rpc('record_no_show', {
      p_booking_id: bookingId,
      p_staff_id: userId,
    })
    setUpdating(null)
    setNoShowModal(null)
    if (data?.success) {
      setNoShowResult(data)
      setBookings(b => b.map(x => x.id === bookingId ? { ...x, status: 'no_show' } : x))
    }
  }

  const totalRevenue = bookings
    .filter(b => b.status !== 'cancelled')
    .reduce((s, b) => s + Number(b.total_price), 0)

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <header style={{ background: 'var(--bg2)', padding: '52px 16px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ fontSize: 20, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text)' }}>←</button>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>الشريك</p>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>الحجوزات</h1>
        </div>
        <button onClick={() => router.push('/partner/checkin')}
          style={{ background: 'var(--primary)', color: 'var(--primary-fg)', fontSize: 12, fontWeight: 700, padding: '8px 14px', borderRadius: 12, border: 'none', cursor: 'pointer' }}>
          🎫 تسجيل دخول
        </button>
      </header>

      <div style={{ display: 'flex', background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
        {(['today', 'upcoming', 'all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ flex: 1, padding: '12px', fontSize: 12, fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer', color: filter === f ? 'var(--primary)' : 'var(--text2)', borderBottom: filter === f ? '2px solid var(--primary)' : '2px solid transparent' }}>
            {f === 'today' ? 'اليوم' : f === 'upcoming' ? 'القادمة' : 'الكل'}
          </button>
        ))}
      </div>

      {bookings.length > 0 && (
        <div style={{ margin: '12px 16px 0', background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: 'var(--text2)' }}>{bookings.length} حجز</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>إجمالي: {totalRevenue.toFixed(0)} ريال</span>
        </div>
      )}

      <div style={{ padding: '12px 16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)' }}>جاري التحميل...</div>
        ) : bookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <p style={{ fontSize: 48, marginBottom: 12 }}>📅</p>
            <p style={{ fontSize: 13, color: 'var(--text2)' }}>
              {filter === 'today' ? 'لا توجد حجوزات اليوم' : 'لا توجد حجوزات'}
            </p>
          </div>
        ) : bookings.map(b => {
          const status = statusInfo[b.status] ?? { label: b.status, bg: 'var(--bg)', color: 'var(--text3)' }
          const field = fieldMap[b.field_id]
          return (
            <div key={b.id} style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <p style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13, margin: '0 0 2px' }}>{b.profiles?.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--text2)', margin: '0 0 2px' }} dir="ltr">{b.profiles?.phone}</p>
                  <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>{field?.facility_name}{field?.name ? ` · ${field.name}` : ''}</p>
                </div>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: status.bg, color: status.color }}>{status.label}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>
                <span>📆 {new Date(b.booking_date + 'T12:00:00').toLocaleDateString('ar-SA', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                <span dir="ltr">🕐 {fmtTime(b.start_time)} – {fmtTime(b.end_time)}</span>
              </div>

              {/* السعر والعربون */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, background: 'var(--bg)', borderRadius: 12, padding: '8px 12px', marginBottom: 10 }}>
                <span style={{ color: 'var(--text2)' }}>إجمالي: <strong style={{ color: 'var(--text)' }}>{b.total_price} ر</strong></span>
                {b.deposit_status && b.deposit_status !== 'none' && (
                  <span style={{ color: b.deposit_status === 'paid' ? 'var(--primary)' : b.deposit_status === 'forfeited' ? 'var(--danger)' : 'var(--text3)', fontSize: 11 }}>
                    عربون: {b.deposit_amount} ر ({b.deposit_status === 'paid' ? 'مدفوع' : b.deposit_status === 'forfeited' ? 'مصادر' : b.deposit_status === 'refunded' ? 'مُسترد' : 'معلق'})
                  </span>
                )}
              </div>

              {/* كود الدخول */}
              {b.checkin_code && b.status === 'confirmed' && (
                <div style={{ background: 'var(--primary-dim)', borderRadius: 10, padding: '6px 12px', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: 'var(--primary)' }}>🎫 كود الدخول</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)', letterSpacing: 4, fontFamily: 'monospace' }} dir="ltr">{b.checkin_code}</span>
                </div>
              )}

              {/* أزرار */}
              {b.status === 'confirmed' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => updateStatus(b.id, 'completed')} disabled={updating === b.id}
                    style={{ flex: 1, background: 'var(--primary)', color: 'var(--primary-fg)', fontSize: 12, padding: '8px', borderRadius: 12, border: 'none', cursor: 'pointer', opacity: updating === b.id ? 0.5 : 1 }}>
                    ✓ مكتمل
                  </button>
                  <button onClick={() => setNoShowModal({ id: b.id, name: b.profiles?.name ?? 'اللاعب' })} disabled={updating === b.id}
                    style={{ flex: 1, border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: 12, padding: '8px', borderRadius: 12, background: 'transparent', cursor: 'pointer', opacity: updating === b.id ? 0.5 : 1 }}>
                    ⛔ غياب
                  </button>
                </div>
              )}
              {b.status === 'pending_payment' && (
                <button onClick={() => updateStatus(b.id, 'confirmed')} disabled={updating === b.id}
                  style={{ width: '100%', background: 'var(--primary)', color: 'var(--primary-fg)', fontSize: 12, padding: '8px', borderRadius: 12, border: 'none', cursor: 'pointer', opacity: updating === b.id ? 0.5 : 1 }}>
                  ✓ تأكيد الحجز
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* modal تأكيد الغياب */}
      {noShowModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setNoShowModal(null)}>
          <div style={{ background: 'var(--card)', borderRadius: 20, padding: 24, width: '100%', maxWidth: 340 }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 32, textAlign: 'center', margin: '0 0 8px' }}>⛔</p>
            <p style={{ fontWeight: 700, color: 'var(--text)', fontSize: 16, textAlign: 'center', margin: '0 0 8px' }}>تسجيل غياب</p>
            <p style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', margin: '0 0 16px', lineHeight: 1.5 }}>
              سيتم تسجيل غياب <strong>{noShowModal.name}</strong> ومصادرة العربون إن وجد وخصم 10 نقاط من الموثوقية.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => recordNoShow(noShowModal.id)} disabled={updating === noShowModal.id}
                style={{ flex: 1, background: 'var(--danger)', color: '#fff', padding: '11px', borderRadius: 14, border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: updating === noShowModal.id ? 0.5 : 1 }}>
                {updating === noShowModal.id ? '...' : 'نعم، سجّل غياب'}
              </button>
              <button onClick={() => setNoShowModal(null)}
                style={{ flex: 1, border: '1.5px solid var(--border)', padding: '11px', borderRadius: 14, background: 'transparent', color: 'var(--text)', fontSize: 14, cursor: 'pointer' }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نتيجة الغياب */}
      {noShowResult && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setNoShowResult(null)}>
          <div style={{ background: 'var(--card)', borderRadius: 20, padding: 24, width: '100%', maxWidth: 320, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 40, margin: '0 0 8px' }}>{noShowResult.suspended ? '🚫' : '⚠️'}</p>
            <p style={{ fontWeight: 700, color: 'var(--text)', fontSize: 16, margin: '0 0 8px' }}>
              {noShowResult.suspended ? 'تم تعليق اللاعب' : 'تم تسجيل الغياب'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text2)', margin: '0 0 4px' }}>نقاط الموثوقية: {noShowResult.reliability_score}</p>
            <p style={{ fontSize: 13, color: 'var(--text2)', margin: '0 0 16px' }}>عدد مرات الغياب: {noShowResult.no_show_count}</p>
            <button onClick={() => setNoShowResult(null)}
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)', padding: '10px 28px', borderRadius: 14, border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              حسناً
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
