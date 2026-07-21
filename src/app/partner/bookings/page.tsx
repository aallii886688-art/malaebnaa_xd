'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Booking = {
  id: string
  booking_date: string
  start_hour: number
  end_hour: number
  total_amount_sar: number
  net_amount_sar: number
  commission_sar: number
  status: string
  facilities: { name: string } | null
  profiles: { full_name: string; phone: string } | null
}

const statusInfo: Record<string, { label: string; bg: string; color: string }> = {
  pending_payment: { label: 'انتظار الدفع', bg: 'rgba(234,179,8,0.12)', color: '#ca8a04' },
  confirmed:       { label: 'مؤكد',          bg: 'var(--primary-dim)',   color: 'var(--primary)' },
  cancelled:       { label: 'ملغي',           bg: 'var(--danger-dim)',    color: 'var(--danger)' },
  completed:       { label: 'مكتمل',          bg: 'var(--bg)',            color: 'var(--text3)' },
  no_show:         { label: 'لم يحضر',        bg: 'var(--bg)',            color: 'var(--text3)' },
}

const fmt = (h: number) => `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? 'ص' : 'م'}`

export default function PartnerBookingsPage() {
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'today' | 'upcoming' | 'all'>('today')
  const [updating, setUpdating] = useState<string | null>(null)

  const load = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: facilities } = await supabase.from('facilities').select('id').eq('owner_id', user.id)
    const facilityIds = facilities?.map((f) => f.id) ?? []
    if (facilityIds.length === 0) { setBookings([]); setLoading(false); return }

    const today = new Date().toISOString().split('T')[0]
    let q = supabase
      .from('bookings')
      .select('*, facilities(name), profiles:user_id(full_name, phone)')
      .in('facility_id', facilityIds)
      .order('booking_date', { ascending: true })
      .order('start_hour', { ascending: true })

    if (filter === 'today') q = q.eq('booking_date', today)
    else if (filter === 'upcoming') q = q.gte('booking_date', today).not('status', 'eq', 'cancelled')

    const { data } = await q
    setBookings((data as Booking[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { setLoading(true); load() }, [filter])

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id)
    const supabase = createClient()
    await supabase.from('bookings').update({ status }).eq('id', id)
    setBookings((b) => b.map((x) => x.id === id ? { ...x, status } : x))
    setUpdating(null)
  }

  const totalNet = bookings.filter((b) => b.status !== 'cancelled').reduce((s, b) => s + +b.net_amount_sar, 0)

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <header style={{ background: 'var(--bg2)', padding: '52px 16px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ fontSize: 20, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text)' }}>←</button>
        <div>
          <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>الشريك</p>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>الحجوزات</h1>
        </div>
      </header>

      <div style={{ display: 'flex', background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
        {(['today', 'upcoming', 'all'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ flex: 1, padding: '12px', fontSize: 12, fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer', color: filter === f ? 'var(--primary)' : 'var(--text2)', borderBottom: filter === f ? '2px solid var(--primary)' : '2px solid transparent' }}>
            {f === 'today' ? 'اليوم' : f === 'upcoming' ? 'القادمة' : 'الكل'}
          </button>
        ))}
      </div>

      {bookings.length > 0 && (
        <div style={{ margin: '12px 16px 0', background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: 'var(--text2)' }}>{bookings.length} حجز</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>صافي: {totalNet.toFixed(0)} ريال</span>
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
        ) : (
          bookings.map((b) => {
            const status = statusInfo[b.status] ?? { label: b.status, bg: 'var(--bg)', color: 'var(--text3)' }
            return (
              <div key={b.id} style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <p style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13, margin: '0 0 2px' }}>{b.profiles?.full_name}</p>
                    <p style={{ fontSize: 12, color: 'var(--text2)', margin: '0 0 2px' }} dir="ltr">{b.profiles?.phone}</p>
                    <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>{b.facilities?.name}</p>
                  </div>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: status.bg, color: status.color }}>{status.label}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>
                  <span>📆 {new Date(b.booking_date + 'T12:00:00').toLocaleDateString('ar-SA', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  <span dir="ltr">🕐 {fmt(b.start_hour)} – {fmt(b.end_hour)}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, background: 'var(--bg)', borderRadius: 12, padding: '8px 12px', marginBottom: 12 }}>
                  <span style={{ color: 'var(--text2)' }}>إجمالي: <strong style={{ color: 'var(--text)' }}>{b.total_amount_sar} ر</strong></span>
                  <span style={{ color: 'var(--text2)' }}>عمولة: <strong style={{ color: 'var(--danger)' }}>{b.commission_sar} ر</strong></span>
                  <span style={{ color: 'var(--text2)' }}>صافي: <strong style={{ color: 'var(--primary)' }}>{b.net_amount_sar} ر</strong></span>
                </div>

                {b.status === 'confirmed' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => updateStatus(b.id, 'completed')} disabled={updating === b.id}
                      style={{ flex: 1, background: 'var(--primary)', color: 'var(--primary-fg)', fontSize: 12, padding: '8px', borderRadius: 12, border: 'none', cursor: 'pointer', opacity: updating === b.id ? 0.5 : 1 }}>
                      ✓ مكتمل
                    </button>
                    <button onClick={() => updateStatus(b.id, 'no_show')} disabled={updating === b.id}
                      style={{ flex: 1, border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 12, padding: '8px', borderRadius: 12, background: 'transparent', cursor: 'pointer', opacity: updating === b.id ? 0.5 : 1 }}>
                      لم يحضر
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
          })
        )}
      </div>
    </div>
  )
}
