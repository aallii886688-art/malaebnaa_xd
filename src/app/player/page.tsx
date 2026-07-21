import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'

const fmt = (h: number) => `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? 'ص' : 'م'}`

const sportGradient: Record<string, string> = {
  football: 'linear-gradient(135deg,#1a4d2e,#2d7a4f)',
  futsal:   'linear-gradient(135deg,#1a3a5c,#2d6a9f)',
  padel:    'linear-gradient(135deg,#4d1a1a,#9f2d2d)',
  basketball:'linear-gradient(135deg,#4d2e1a,#9f5a2d)',
  volleyball:'linear-gradient(135deg,#2e1a4d,#5a2d9f)',
  default:  'linear-gradient(135deg,#1a2d4d,#2d4d7a)',
}

export default async function PlayerHome() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  const today = new Date().toISOString().split('T')[0]

  const [
    { data: nextBookings },
    { count: totalBookings },
    { data: topFacilities },
  ] = await Promise.all([
    supabase.from('bookings')
      .select('id, booking_date, start_hour, end_hour, status, facilities(name, city, sport_type)')
      .eq('user_id', user.id)
      .in('status', ['confirmed', 'pending_payment'])
      .gte('booking_date', today)
      .order('booking_date', { ascending: true })
      .limit(1),
    supabase.from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .not('status', 'eq', 'cancelled'),
    supabase.from('facilities')
      .select('id, name, city, sport_type, rating, reviews_count')
      .eq('is_active', true)
      .order('rating', { ascending: false })
      .limit(6),
  ])

  const next = nextBookings?.[0]
  const fac = (next?.facilities as unknown as { name: string; city: string; sport_type: string } | null)

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '16px 20px' }}
        className="flex items-center justify-between">
        <div>
          <p style={{ color: 'var(--text3)', fontSize: 12 }}>أهلاً 👋</p>
          <h1 style={{ color: 'var(--text)', fontSize: 18, fontWeight: 700, marginTop: 2 }}>
            {profile?.full_name ?? 'لاعب'}
          </h1>
        </div>
        <Link href="/player/profile"
          style={{ width: 40, height: 40, borderRadius: 20, background: 'var(--primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
          👤
        </Link>
      </div>

      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* بطاقة الحجز القادم */}
        {next ? (
          <div className="fade-up"
            style={{ background: sportGradient[fac?.sport_type ?? 'default'], borderRadius: 20, padding: 20, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -20, left: -20, width: 100, height: 100, borderRadius: 50, background: 'rgba(255,255,255,0.06)' }} />
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>حجزك القادم</p>
            <p style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginTop: 6 }}>{fac?.name}</p>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 2 }}>📍 {fac?.city}</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10 }}>التاريخ</p>
                <p style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>
                  {new Date(next.booking_date + 'T12:00:00').toLocaleDateString('ar-SA', { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
              </div>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10 }}>الوقت</p>
                <p style={{ color: '#fff', fontWeight: 600, fontSize: 13 }} dir="ltr">{fmt(next.start_hour)} – {fmt(next.end_hour)}</p>
              </div>
              <span style={{ background: next.status === 'confirmed' ? 'rgba(255,255,255,0.2)' : 'rgba(255,184,0,0.3)', color: '#fff', fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20 }}>
                {next.status === 'confirmed' ? 'مؤكد ✓' : 'انتظار الدفع'}
              </span>
            </div>
          </div>
        ) : (
          <div className="fade-up press"
            style={{ background: 'var(--card)', border: '2px dashed var(--border)', borderRadius: 20, padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🏟️</div>
            <p style={{ color: 'var(--text)', fontWeight: 600, fontSize: 15 }}>لا توجد حجوزات قادمة</p>
            <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 4 }}>احجز ملعبك الآن في 3 خطوات</p>
            <Link href="/player/facilities"
              style={{ display: 'inline-block', marginTop: 14, background: 'var(--primary)', color: 'var(--primary-fg)', padding: '10px 24px', borderRadius: 14, fontWeight: 700, fontSize: 14 }}>
              احجز الآن
            </Link>
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'حجوزاتي', value: totalBookings ?? 0, icon: '📅', href: '/player/bookings' },
            { label: 'استكشف', value: '←', icon: '⚽', href: '/player/facilities' },
          ].map((s) => (
            <Link key={s.href} href={s.href} className="press"
              style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: '16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: 'var(--shadow)' }}>
              <span style={{ fontSize: 24 }}>{s.icon}</span>
              <div>
                <p style={{ color: 'var(--text)', fontSize: 20, fontWeight: 700 }}>{s.value}</p>
                <p style={{ color: 'var(--text3)', fontSize: 12, marginTop: 1 }}>{s.label}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick actions */}
        <div>
          <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: 15, marginBottom: 12 }}>استكشف</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {[
              { href: '/player/facilities', icon: '⚽', label: 'الملاعب' },
              { href: '/player/academies', icon: '🏅', label: 'الأكاديميات' },
              { href: '/player/tournaments', icon: '🏆', label: 'البطولات' },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="press"
                style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
                <span style={{ fontSize: 26 }}>{item.icon}</span>
                <span style={{ color: 'var(--text2)', fontSize: 12, fontWeight: 600 }}>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* أبرز الملاعب */}
        {(topFacilities ?? []).length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: 15 }}>أبرز الملاعب</p>
              <Link href="/player/facilities" style={{ color: 'var(--primary)', fontSize: 13 }}>عرض الكل</Link>
            </div>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }} className="no-scrollbar">
              {(topFacilities ?? []).map((f) => (
                <Link key={f.id} href={`/player/facilities/${f.id}`} className="press"
                  style={{ flexShrink: 0, width: 160, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ height: 90, background: sportGradient[f.sport_type] ?? sportGradient.default, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
                    {f.sport_type === 'football' ? '⚽' : f.sport_type === 'padel' ? '🎾' : f.sport_type === 'basketball' ? '🏀' : '🏅'}
                  </div>
                  <div style={{ padding: '10px 12px' }}>
                    <p style={{ color: 'var(--text)', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</p>
                    <p style={{ color: 'var(--text3)', fontSize: 11, marginTop: 2 }}>📍 {f.city}</p>
                    {f.reviews_count > 0 && (
                      <p style={{ color: 'var(--gold)', fontSize: 11, marginTop: 4 }}>⭐ {f.rating}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
