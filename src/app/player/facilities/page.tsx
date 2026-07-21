'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'

type Facility = {
  id: string; name: string; sport_type: string; city: string; district: string | null
  description: string | null; rating: number; reviews_count: number
}

const sportOptions = [
  { value: '', label: 'الكل', icon: '🏟️' },
  { value: 'football', label: 'قدم', icon: '⚽' },
  { value: 'futsal', label: 'فوتسال', icon: '🥅' },
  { value: 'padel', label: 'بادل', icon: '🎾' },
  { value: 'basketball', label: 'سلة', icon: '🏀' },
  { value: 'volleyball', label: 'طائرة', icon: '🏐' },
  { value: 'tennis', label: 'تنس', icon: '🎾' },
]

const sportGradient: Record<string, string> = {
  football: 'linear-gradient(135deg,#1a4d2e,#2d7a4f)',
  futsal:   'linear-gradient(135deg,#1a3a5c,#2d6a9f)',
  padel:    'linear-gradient(135deg,#4d1a1a,#9f2d2d)',
  basketball:'linear-gradient(135deg,#4d2e1a,#9f5a2d)',
  volleyball:'linear-gradient(135deg,#2e1a4d,#5a2d9f)',
  default:  'linear-gradient(135deg,#1a2d4d,#2d4d7a)',
}
const sportEmoji: Record<string, string> = {
  football:'⚽', futsal:'🥅', padel:'🎾', basketball:'🏀', volleyball:'🏐', tennis:'🎾', squash:'🏸', swimming:'🏊', other:'🏅',
}

export default function PlayerFacilitiesPage() {
  const router = useRouter()
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sport, setSport] = useState('')

  useEffect(() => {
    setLoading(true)
    const supabase = createClient()
    let q = supabase.from('facilities').select('*').eq('is_active', true).order('rating', { ascending: false })
    if (sport) q = q.eq('sport_type', sport)
    q.then(({ data }) => { setFacilities(data ?? []); setLoading(false) })
  }, [sport])

  const filtered = facilities.filter((f) =>
    !search || f.name.includes(search) || f.city.includes(search) || (f.district ?? '').includes(search)
  )

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: 'var(--bg2)', padding: '20px 16px 0', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <button onClick={() => router.back()} style={{ color: 'var(--text3)', fontSize: 20, background: 'none', border: 'none', cursor: 'pointer' }}>←</button>
          <h1 style={{ color: 'var(--text)', fontSize: 18, fontWeight: 700 }}>الملاعب</h1>
        </div>
        {/* Search */}
        <div style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 14, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ color: 'var(--text3)', fontSize: 16 }}>🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم الملعب أو المدينة..."
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 14 }} />
          {search && <button onClick={() => setSearch('')} style={{ color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>✕</button>}
        </div>
        {/* Sport filter */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 14 }} className="no-scrollbar">
          {sportOptions.map((s) => (
            <button key={s.value} onClick={() => setSport(s.value)} className="press"
              style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 20, border: `1px solid ${sport === s.value ? 'var(--primary)' : 'var(--border)'}`, background: sport === s.value ? 'var(--primary-dim)' : 'var(--card)', color: sport === s.value ? 'var(--primary)' : 'var(--text3)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              {s.icon} {s.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          [1,2,3,4].map((i) => (
            <div key={i} style={{ display: 'flex', gap: 12, background: 'var(--card)', borderRadius: 18, overflow: 'hidden', border: '1px solid var(--border)' }}>
              <div className="skeleton" style={{ width: 100, height: 100, borderRadius: 0, flexShrink: 0 }} />
              <div style={{ flex: 1, padding: '14px 12px 14px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="skeleton" style={{ height: 14, width: '70%' }} />
                <div className="skeleton" style={{ height: 11, width: '40%' }} />
                <div className="skeleton" style={{ height: 11, width: '55%' }} />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🏟️</div>
            <p style={{ color: 'var(--text)', fontWeight: 600, fontSize: 16 }}>لا توجد ملاعب</p>
            <p style={{ color: 'var(--text3)', fontSize: 14, marginTop: 4 }}>
              {search ? `لا نتائج لـ "${search}"` : 'لا توجد ملاعب متاحة الآن'}
            </p>
          </div>
        ) : (
          filtered.map((f, i) => (
            <button key={f.id} onClick={() => router.push(`/player/facilities/${f.id}`)} className="press fade-up"
              style={{ animationDelay: `${i * 40}ms`, display: 'flex', gap: 0, background: 'var(--card)', borderRadius: 18, overflow: 'hidden', border: '1px solid var(--border)', textAlign: 'right', cursor: 'pointer', boxShadow: 'var(--shadow)', width: '100%' }}>
              {/* image / gradient */}
              <div style={{ width: 100, flexShrink: 0, background: sportGradient[f.sport_type] ?? sportGradient.default, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
                {sportEmoji[f.sport_type] ?? '🏅'}
              </div>
              <div style={{ flex: 1, padding: '14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: 15 }}>{f.name}</p>
                  {f.reviews_count > 0 && (
                    <span style={{ color: 'var(--gold)', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>⭐ {f.rating}</span>
                  )}
                </div>
                <p style={{ color: 'var(--text3)', fontSize: 12 }}>📍 {f.city}{f.district ? ` · ${f.district}` : ''}</p>
                {f.description && (
                  <p style={{ color: 'var(--text3)', fontSize: 12, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' as const }}>{f.description}</p>
                )}
                <div style={{ marginTop: 4 }}>
                  <span style={{ background: 'var(--primary-dim)', color: 'var(--primary)', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20 }}>
                    احجز الآن
                  </span>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  )
}
