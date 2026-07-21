'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Academy = { id: string; name: string; city: string; is_active: boolean; rating: number; reviews_count: number; sport_types: string[] }

const sportLabel: Record<string, string> = {
  football: '⚽', futsal: '🥅', padel: '🎾', basketball: '🏀',
  volleyball: '🏐', tennis: '🎾', squash: '🏸', badminton: '🏸', swimming: '🏊', other: '🏅',
}

export default function PartnerAcademiesPage() {
  const router = useRouter()
  const [academies, setAcademies] = useState<Academy[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      supabase.from('academies').select('*').eq('owner_id', user.id).order('created_at', { ascending: false })
        .then(({ data }) => { setAcademies(data ?? []); setLoading(false) })
    })
  }, [router])

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <header style={{ background: 'var(--bg2)', padding: '52px 16px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()} style={{ fontSize: 20, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text)' }}>←</button>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>الشريك</p>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>أكاديمياتي</h1>
          </div>
        </div>
        <button onClick={() => router.push('/partner/academies/new')}
          style={{ background: 'var(--primary)', color: 'var(--primary-fg)', fontSize: 13, fontWeight: 700, padding: '6px 14px', borderRadius: 12, border: 'none', cursor: 'pointer' }}>
          + إضافة
        </button>
      </header>

      <div style={{ padding: '16px 16px 40px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)' }}>جاري التحميل...</div>
          : academies.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 0' }}>
              <p style={{ fontSize: 48, marginBottom: 12 }}>🏅</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>لا توجد أكاديميات بعد</p>
              <button onClick={() => router.push('/partner/academies/new')}
                style={{ marginTop: 12, background: 'var(--primary)', color: 'var(--primary-fg)', padding: '10px 20px', borderRadius: 14, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer' }}>إضافة أكاديمية</button>
            </div>
          ) : academies.map((a) => (
            <button key={a.id} onClick={() => router.push(`/partner/academies/${a.id}`)}
              className="press"
              style={{ width: '100%', background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16, textAlign: 'right', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontWeight: 700, color: 'var(--text)', margin: '0 0 2px' }}>{a.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--text2)', margin: '0 0 2px' }}>{a.sport_types.map((s) => sportLabel[s]).join(' ')}</p>
                  <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0 }}>📍 {a.city}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: a.is_active ? 'var(--primary-dim)' : 'var(--danger-dim)', color: a.is_active ? 'var(--primary)' : 'var(--danger)' }}>
                    {a.is_active ? 'نشط' : 'موقوف'}
                  </span>
                  <span style={{ color: 'var(--text3)', fontSize: 14 }}>←</span>
                </div>
              </div>
            </button>
          ))}
      </div>
    </div>
  )
}
