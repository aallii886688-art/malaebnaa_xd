'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Academy = { id: string; name: string; city: string; sport_types: string[]; rating: number; reviews_count: number; description: string | null }

const sportLabel: Record<string, string> = {
  football: '⚽', futsal: '🥅', padel: '🎾', basketball: '🏀',
  volleyball: '🏐', tennis: '🎾', squash: '🏸', swimming: '🏊', other: '🏅',
}

export default function PlayerAcademiesPage() {
  const router = useRouter()
  const [academies, setAcademies] = useState<Academy[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.from('academies').select('*').eq('is_active', true).order('rating', { ascending: false })
      .then(({ data }) => { setAcademies(data ?? []); setLoading(false) })
  }, [])

  const filtered = academies.filter((a) => !search || a.name.includes(search) || a.city.includes(search))

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <header style={{ background: 'var(--bg2)', padding: '52px 16px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ fontSize: 20, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text)' }}>←</button>
        <div>
          <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>استكشاف</p>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>الأكاديميات</h1>
        </div>
      </header>

      <div style={{ padding: '12px 16px 0' }}>
        <div style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--text2)' }}>🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن أكاديمية..."
            style={{ flex: 1, fontSize: 13, outline: 'none', background: 'transparent', border: 'none', color: 'var(--text)' }} />
        </div>
      </div>

      <div style={{ padding: '16px 16px 80px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)' }}>جاري التحميل...</div>
          : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 0' }}>
              <p style={{ fontSize: 48, marginBottom: 8 }}>🏅</p>
              <p style={{ fontSize: 13, color: 'var(--text2)' }}>لا توجد أكاديميات متاحة</p>
            </div>
          ) : filtered.map((a) => (
            <button key={a.id} onClick={() => router.push(`/player/academies/${a.id}`)}
              className="press"
              style={{ width: '100%', background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16, textAlign: 'right', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, color: 'var(--text)', margin: '0 0 2px' }}>{a.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--text2)', margin: '0 0 2px' }}>{a.sport_types.map((s) => sportLabel[s]).join(' ')}</p>
                  <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0 }}>📍 {a.city}</p>
                  {a.description && <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>{a.description}</p>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, marginRight: 8 }}>
                  {a.reviews_count > 0 && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)' }}>⭐ {a.rating}</span>}
                  <span style={{ color: 'var(--text3)', fontSize: 14 }}>←</span>
                </div>
              </div>
            </button>
          ))}
      </div>
    </div>
  )
}
