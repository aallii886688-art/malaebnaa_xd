'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Profile = {
  id: string
  full_name: string
  phone: string
  city: string | null
  is_active: boolean
  created_at: string
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.from('profiles').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setProfiles(data ?? []); setLoading(false) })
  }, [])

  const filtered = profiles.filter((p) =>
    p.full_name.includes(search) || p.phone.includes(search)
  )

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <header style={{ background: 'linear-gradient(135deg,#1a1a2e,#16213e)', padding: '52px 16px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ fontSize: 20, background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff' }}>←</button>
        <div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: 0 }}>لوحة التحكم</p>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>المستخدمون</h1>
        </div>
      </header>

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--text2)' }}>🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الجوال..."
            style={{ flex: 1, fontSize: 13, outline: 'none', background: 'transparent', color: 'var(--text)', border: 'none' }} />
        </div>

        <p style={{ fontSize: 11, color: 'var(--text2)' }}>{filtered.length} مستخدم</p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)' }}>جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)' }}>لا يوجد مستخدمون</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map((p) => (
              <div key={p.id} style={{ background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)', padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13, margin: '0 0 2px' }}>{p.full_name}</p>
                    <p style={{ fontSize: 12, color: 'var(--text2)', margin: '0 0 2px' }} dir="ltr">{p.phone}</p>
                    {p.city && <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>📍 {p.city}</p>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: p.is_active ? 'var(--primary-dim)' : 'var(--danger-dim)', color: p.is_active ? 'var(--primary)' : 'var(--danger)' }}>
                      {p.is_active ? 'نشط' : 'موقوف'}
                    </span>
                    <p style={{ fontSize: 10, color: 'var(--text3)', margin: 0 }}>{new Date(p.created_at).toLocaleDateString('ar-SA')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
