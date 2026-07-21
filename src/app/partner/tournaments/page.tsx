'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Tournament = { id: string; name: string; sport_type: string; city: string; status: string; max_teams: number; start_date: string | null; registration_deadline: string | null }

const statusInfo: Record<string, { label: string; bg: string; color: string }> = {
  upcoming:    { label: 'قادمة',        bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  registration:{ label: 'تسجيل مفتوح', bg: 'var(--primary-dim)',    color: 'var(--primary)' },
  ongoing:     { label: 'جارية',        bg: 'rgba(234,179,8,0.12)', color: '#ca8a04' },
  completed:   { label: 'منتهية',       bg: 'var(--bg)',             color: 'var(--text3)' },
  cancelled:   { label: 'ملغاة',        bg: 'var(--danger-dim)',     color: 'var(--danger)' },
}

const sportLabel: Record<string, string> = {
  football:'⚽ كرة قدم', futsal:'🥅 فوتسال', padel:'🎾 بادل',
  basketball:'🏀 كرة سلة', volleyball:'🏐 كرة طائرة', other:'🏅 أخرى',
}

export default function PartnerTournamentsPage() {
  const router = useRouter()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      supabase.from('tournaments').select('*').eq('owner_id', user.id).order('created_at', { ascending: false })
        .then(({ data }) => { setTournaments(data ?? []); setLoading(false) })
    })
  }, [router])

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <header style={{ background: 'var(--bg2)', padding: '52px 16px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()} style={{ fontSize: 20, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text)' }}>←</button>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>الشريك</p>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>بطولاتي</h1>
          </div>
        </div>
        <button onClick={() => router.push('/partner/tournaments/new')}
          style={{ background: 'var(--primary)', color: 'var(--primary-fg)', fontSize: 13, fontWeight: 700, padding: '6px 14px', borderRadius: 12, border: 'none', cursor: 'pointer' }}>
          + إنشاء
        </button>
      </header>

      <div style={{ padding: '16px 16px 40px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)' }}>جاري التحميل...</div>
          : tournaments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 0' }}>
              <p style={{ fontSize: 48, marginBottom: 12 }}>🏆</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>لا توجد بطولات بعد</p>
              <button onClick={() => router.push('/partner/tournaments/new')}
                style={{ marginTop: 12, background: 'var(--primary)', color: 'var(--primary-fg)', padding: '10px 20px', borderRadius: 14, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer' }}>إنشاء بطولة</button>
            </div>
          ) : tournaments.map((t) => {
            const s = statusInfo[t.status] ?? { label: t.status, bg: 'var(--bg)', color: 'var(--text3)' }
            return (
              <button key={t.id} onClick={() => router.push(`/partner/tournaments/${t.id}`)}
                className="press"
                style={{ width: '100%', background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16, textAlign: 'right', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontWeight: 700, color: 'var(--text)', margin: '0 0 2px' }}>{t.name}</p>
                    <p style={{ fontSize: 12, color: 'var(--text2)', margin: '0 0 2px' }}>{sportLabel[t.sport_type] ?? t.sport_type}</p>
                    <p style={{ fontSize: 12, color: 'var(--text2)', margin: '0 0 2px' }}>📍 {t.city} · {t.max_teams} فريق</p>
                    {t.start_date && <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>📅 {new Date(t.start_date).toLocaleDateString('ar-SA')}</p>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: s.bg, color: s.color }}>{s.label}</span>
                    <span style={{ color: 'var(--text3)', fontSize: 14 }}>←</span>
                  </div>
                </div>
              </button>
            )
          })}
      </div>
    </div>
  )
}
