'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Facility = {
  id: string
  name: string
  sport_type: string
  city: string
  is_active: boolean
  rating: number
  reviews_count: number
}

const sportLabel: Record<string, string> = {
  football: '⚽ كرة قدم', futsal: '🥅 فوتسال', padel: '🎾 بادل',
  basketball: '🏀 كرة سلة', volleyball: '🏐 كرة طائرة', tennis: '🎾 تنس',
  squash: '🏸 سكواش', badminton: '🏸 ريشة طائرة', swimming: '🏊 سباحة', other: '🏅 أخرى',
}

export default function PartnerFacilitiesPage() {
  const router = useRouter()
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      supabase.from('facilities').select('*').eq('owner_id', user.id).order('created_at', { ascending: false })
        .then(({ data }) => { setFacilities(data ?? []); setLoading(false) })
    })
  }, [router])

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <header style={{ background: 'var(--bg2)', padding: '52px 16px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()} style={{ fontSize: 20, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text)' }}>←</button>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>الشريك</p>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>ملاعبي</h1>
          </div>
        </div>
        <button onClick={() => router.push('/partner/facilities/new')}
          style={{ background: 'var(--primary)', color: 'var(--primary-fg)', fontSize: 13, fontWeight: 700, padding: '6px 14px', borderRadius: 12, border: 'none', cursor: 'pointer' }}>
          + إضافة
        </button>
      </header>

      <div style={{ padding: '16px 16px 40px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)' }}>جاري التحميل...</div>
        ) : facilities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <p style={{ fontSize: 48, marginBottom: 12 }}>🏟️</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>لا توجد ملاعب بعد</p>
            <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 16 }}>أضف ملعبك الأول وابدأ باستقبال الحجوزات</p>
            <button onClick={() => router.push('/partner/facilities/new')}
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)', padding: '10px 20px', borderRadius: 14, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
              إضافة ملعب
            </button>
          </div>
        ) : (
          facilities.map((f) => (
            <button key={f.id} onClick={() => router.push(`/partner/facilities/${f.id}`)}
              className="press"
              style={{ width: '100%', background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16, textAlign: 'right', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontWeight: 700, color: 'var(--text)', margin: '0 0 2px' }}>{f.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--text2)', margin: '0 0 2px' }}>{sportLabel[f.sport_type]}</p>
                  <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0 }}>📍 {f.city}</p>
                  {f.reviews_count > 0 && (
                    <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>⭐ {f.rating} ({f.reviews_count} تقييم)</p>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: f.is_active ? 'var(--primary-dim)' : 'var(--danger-dim)', color: f.is_active ? 'var(--primary)' : 'var(--danger)' }}>
                    {f.is_active ? 'نشط' : 'موقوف'}
                  </span>
                  <span style={{ color: 'var(--text3)', fontSize: 14 }}>←</span>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
