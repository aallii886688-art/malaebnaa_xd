'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'

type Booking = {
  id: string; booking_date: string; start_hour: number; end_hour: number
  total_amount_sar: number; status: string
  facilities: { name: string; city: string; sport_type: string } | null
}

const statusInfo: Record<string, { label: string; bg: string; color: string }> = {
  pending_payment: { label: 'انتظار الدفع', bg: 'var(--gold-dim)', color: 'var(--gold)' },
  confirmed:       { label: 'مؤكد ✓',       bg: 'var(--primary-dim)', color: 'var(--primary)' },
  cancelled:       { label: 'ملغي',          bg: 'var(--danger-dim)', color: 'var(--danger)' },
  completed:       { label: 'مكتمل',         bg: 'var(--card2)', color: 'var(--text3)' },
  no_show:         { label: 'لم يحضر',       bg: 'var(--card2)', color: 'var(--text3)' },
}
const fmt = (h: number) => `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? 'ص' : 'م'}`
const sportEmoji: Record<string, string> = { football:'⚽', futsal:'🥅', padel:'🎾', basketball:'🏀', volleyball:'🏐', tennis:'🎾', other:'🏅' }

export default function PlayerBookingsPage() {
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming')
  const [cancelling, setCancelling] = useState<string | null>(null)

  const load = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const today = new Date().toISOString().split('T')[0]
    let q = supabase.from('bookings')
      .select('*, facilities(name,city,sport_type)')
      .eq('user_id', user.id)
      .order('booking_date', { ascending: filter === 'upcoming' })
    if (filter === 'upcoming') q = q.gte('booking_date', today).not('status', 'eq', 'cancelled')
    else q = q.lt('booking_date', today)
    const { data } = await q
    setBookings((data as Booking[]) ?? []); setLoading(false)
  }

  useEffect(() => { setLoading(true); load() }, [filter])

  const cancel = async (id: string) => {
    setCancelling(id)
    const supabase = createClient()
    await supabase.from('bookings').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('id', id)
    setBookings((b) => b.filter((x) => x.id !== id)); setCancelling(null)
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: 80 }}>
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
            <div key={i} style={{ background: 'var(--card)', borderRadius: 18, overflow: 'hidden', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: 12, padding: 14 }}>
                <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 12 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="skeleton" style={{ height: 14, width: '60%' }} />
                  <div className="skeleton" style={{ height: 11, width: '40%' }} />
                </div>
              </div>
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
          const fac = b.facilities as unknown as { name: string; city: string; sport_type: string } | null
          const st  = statusInfo[b.status] ?? { label: b.status, bg: 'var(--card2)', color: 'var(--text3)' }
          return (
            <div key={b.id} className="fade-up" style={{ animationDelay: `${i * 40}ms`, background: 'var(--card)', borderRadius: 18, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                  {sportEmoji[fac?.sport_type ?? ''] ?? '🏅'}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: 15 }}>{fac?.name}</p>
                  <p style={{ color: 'var(--text3)', fontSize: 12, marginTop: 2 }}>📍 {fac?.city}</p>
                </div>
                <span style={{ background: st.bg, color: st.color, fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20, flexShrink: 0 }}>{st.label}</span>
              </div>
              <div style={{ display: 'flex', gap: 0, padding: '10px 14px 14px', borderTop: '1px solid var(--border)' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ color: 'var(--text3)', fontSize: 11 }}>التاريخ</p>
                  <p style={{ color: 'var(--text2)', fontSize: 13, fontWeight: 600, marginTop: 2 }}>
                    {new Date(b.booking_date + 'T12:00:00').toLocaleDateString('ar-SA', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: 'var(--text3)', fontSize: 11 }}>الوقت</p>
                  <p style={{ color: 'var(--text2)', fontSize: 13, fontWeight: 600, marginTop: 2 }} dir="ltr">{fmt(b.start_hour)} – {fmt(b.end_hour)}</p>
                </div>
                <div>
                  <p style={{ color: 'var(--text3)', fontSize: 11 }}>المبلغ</p>
                  <p style={{ color: 'var(--primary)', fontSize: 15, fontWeight: 700, marginTop: 2 }}>{b.total_amount_sar} ر</p>
                </div>
              </div>
              {(b.status === 'pending_payment' || b.status === 'confirmed') && filter === 'upcoming' && (
                <div style={{ padding: '0 14px 14px' }}>
                  <button onClick={() => cancel(b.id)} disabled={cancelling === b.id} className="press"
                    style={{ width: '100%', padding: '10px', borderRadius: 12, background: 'none', border: '1.5px solid var(--danger)', color: 'var(--danger)', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: cancelling === b.id ? 0.5 : 1 }}>
                    {cancelling === b.id ? 'جاري الإلغاء...' : 'إلغاء الحجز'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <BottomNav />
    </div>
  )
}
