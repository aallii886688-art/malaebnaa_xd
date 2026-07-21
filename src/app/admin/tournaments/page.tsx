'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Tournament = {
  id: string
  name: string
  sport_type: string
  city: string
  status: string
  max_teams: number
  registration_fee_sar: number
  start_date: string
  is_active: boolean
  profiles: { full_name: string } | null
}

const statusStyle: Record<string, { label: string; bg: string; color: string }> = {
  upcoming:     { label: 'قريباً',        bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  registration: { label: 'تسجيل مفتوح',  bg: 'var(--primary-dim)',    color: 'var(--primary)' },
  ongoing:      { label: 'جارية',         bg: 'rgba(249,115,22,0.12)', color: '#f97316' },
  completed:    { label: 'منتهية',        bg: 'var(--bg)',             color: 'var(--text3)' },
  cancelled:    { label: 'ملغية',         bg: 'var(--danger-dim)',     color: 'var(--danger)' },
}

export default function AdminTournamentsPage() {
  const router = useRouter()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.from('tournaments').select('*, profiles:owner_id(full_name)').order('created_at', { ascending: false })
      .then(({ data }) => { setTournaments((data as Tournament[]) ?? []); setLoading(false) })
  }, [])

  const toggleActive = async (id: string, current: boolean) => {
    const supabase = createClient()
    await supabase.from('tournaments').update({ is_active: !current }).eq('id', id)
    setTournaments((prev) => prev.map((t) => t.id === id ? { ...t, is_active: !current } : t))
  }

  const filtered = tournaments.filter((t) => t.name.includes(search) || t.city.includes(search))

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <header style={{ background: 'linear-gradient(135deg,#1a1a2e,#16213e)', padding: '52px 16px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ fontSize: 20, background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff' }}>←</button>
        <div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: 0 }}>لوحة التحكم</p>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>البطولات</h1>
        </div>
      </header>

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--text2)' }}>🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم أو المدينة..."
            style={{ flex: 1, fontSize: 13, outline: 'none', background: 'transparent', color: 'var(--text)', border: 'none' }} />
        </div>
        <p style={{ fontSize: 11, color: 'var(--text2)' }}>{filtered.length} بطولة</p>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)' }}>جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)' }}>لا توجد بطولات مضافة بعد</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map((t) => {
              const st = statusStyle[t.status] ?? { label: t.status, bg: 'var(--bg)', color: 'var(--text3)' }
              return (
                <div key={t.id} style={{ background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)', padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div>
                      <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13, margin: '0 0 2px' }}>{t.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--text2)', margin: '0 0 2px' }}>📍 {t.city} · {t.start_date}</p>
                      {t.profiles && <p style={{ fontSize: 11, color: 'var(--text3)', margin: '0 0 2px' }}>المسؤول: {t.profiles.full_name}</p>}
                      {t.registration_fee_sar > 0 && <p style={{ fontSize: 11, color: 'var(--text2)', margin: 0 }}>رسوم التسجيل: {t.registration_fee_sar} ر.س</p>}
                    </div>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: st.bg, color: st.color }}>{st.label}</span>
                  </div>
                  <button onClick={() => toggleActive(t.id, t.is_active)}
                    style={{ width: '100%', fontSize: 12, padding: '7px', borderRadius: 10, border: `1px solid ${t.is_active ? 'var(--danger)' : 'var(--primary)'}`, color: t.is_active ? 'var(--danger)' : 'var(--primary)', background: 'transparent', cursor: 'pointer', fontWeight: 500 }}>
                    {t.is_active ? 'إيقاف البطولة' : 'تفعيل البطولة'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
