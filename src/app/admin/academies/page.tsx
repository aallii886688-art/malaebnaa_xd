'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Academy = {
  id: string
  name: string
  city: string
  sport_types: string[]
  is_active: boolean
  rating: number
  reviews_count: number
  profiles: { full_name: string } | null
}

export default function AdminAcademiesPage() {
  const router = useRouter()
  const [academies, setAcademies] = useState<Academy[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.from('academies').select('*, profiles:owner_id(full_name)').order('created_at', { ascending: false })
      .then(({ data }) => { setAcademies((data as Academy[]) ?? []); setLoading(false) })
  }, [])

  const toggleActive = async (id: string, current: boolean) => {
    const supabase = createClient()
    await supabase.from('academies').update({ is_active: !current }).eq('id', id)
    setAcademies((prev) => prev.map((a) => a.id === id ? { ...a, is_active: !current } : a))
  }

  const filtered = academies.filter((a) => a.name.includes(search) || a.city.includes(search))

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <header style={{ background: 'linear-gradient(135deg,#1a1a2e,#16213e)', padding: '52px 16px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ fontSize: 20, background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff' }}>←</button>
        <div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: 0 }}>لوحة التحكم</p>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>الأكاديميات</h1>
        </div>
      </header>

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--text2)' }}>🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم أو المدينة..."
            style={{ flex: 1, fontSize: 13, outline: 'none', background: 'transparent', color: 'var(--text)', border: 'none' }} />
        </div>
        <p style={{ fontSize: 11, color: 'var(--text2)' }}>{filtered.length} أكاديمية</p>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)' }}>جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)' }}>لا توجد أكاديميات مضافة بعد</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map((a) => (
              <div key={a.id} style={{ background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)', padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13, margin: '0 0 2px' }}>{a.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--text2)', margin: '0 0 2px' }}>📍 {a.city}</p>
                    {a.profiles && <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>المالك: {a.profiles.full_name}</p>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: a.is_active ? 'var(--primary-dim)' : 'var(--danger-dim)', color: a.is_active ? 'var(--primary)' : 'var(--danger)' }}>
                      {a.is_active ? 'نشطة' : 'موقوفة'}
                    </span>
                    {a.reviews_count > 0 && <span style={{ fontSize: 11, color: 'var(--text3)' }}>⭐ {a.rating} ({a.reviews_count})</span>}
                  </div>
                </div>
                <button onClick={() => toggleActive(a.id, a.is_active)}
                  style={{ width: '100%', fontSize: 12, padding: '7px', borderRadius: 10, border: `1px solid ${a.is_active ? 'var(--danger)' : 'var(--primary)'}`, color: a.is_active ? 'var(--danger)' : 'var(--primary)', background: 'transparent', cursor: 'pointer', fontWeight: 500 }}>
                  {a.is_active ? 'إيقاف الأكاديمية' : 'تفعيل الأكاديمية'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
