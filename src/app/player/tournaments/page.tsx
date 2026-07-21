'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Tournament = { id: string; name: string; sport_type: string; city: string; status: string; max_teams: number; registration_fee_sar: number; start_date: string | null; registration_deadline: string | null; age_group: string | null }

const sportLabel: Record<string, string> = {
  football:'⚽ كرة قدم', futsal:'🥅 فوتسال', padel:'🎾 بادل',
  basketball:'🏀 كرة سلة', volleyball:'🏐 كرة طائرة', other:'🏅 أخرى',
}

const statusInfo: Record<string, { label: string; bg: string; color: string }> = {
  upcoming:     { label: 'قادمة',        bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  registration: { label: 'تسجيل مفتوح', bg: 'var(--primary-dim)',    color: 'var(--primary)' },
  ongoing:      { label: 'جارية',        bg: 'rgba(234,179,8,0.12)',  color: '#ca8a04' },
  completed:    { label: 'منتهية',       bg: 'var(--bg)',             color: 'var(--text3)' },
}

export default function PlayerTournamentsPage() {
  const router = useRouter()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'registration' | 'ongoing'>('all')

  useEffect(() => {
    const supabase = createClient()
    let q = supabase.from('tournaments').select('*').eq('is_active', true).order('start_date', { ascending: true })
    if (filter !== 'all') q = q.eq('status', filter)
    q.then(({ data }) => { setTournaments(data ?? []); setLoading(false) })
  }, [filter])

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <header style={{ background: 'var(--bg2)', padding: '52px 16px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ fontSize: 20, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text)' }}>←</button>
        <div>
          <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>استكشاف</p>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>البطولات</h1>
        </div>
      </header>

      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', overflowX: 'auto' }} className="no-scrollbar">
        {([['all','الكل'],['registration','تسجيل مفتوح'],['ongoing','جارية']] as [string,string][]).map(([v,l]) => (
          <button key={v} onClick={() => { setFilter(v as typeof filter); setLoading(true) }}
            style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', background: filter === v ? 'var(--primary)' : 'var(--card)', border: `1px solid ${filter === v ? 'var(--primary)' : 'var(--border)'}`, color: filter === v ? 'var(--primary-fg)' : 'var(--text2)', cursor: 'pointer' }}>
            {l}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 16px 80px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)' }}>جاري التحميل...</div>
          : tournaments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 0' }}>
              <p style={{ fontSize: 48, marginBottom: 8 }}>🏆</p><p style={{ fontSize: 13, color: 'var(--text2)' }}>لا توجد بطولات متاحة</p>
            </div>
          ) : tournaments.map((t) => {
            const s = statusInfo[t.status] ?? { label: t.status, bg: 'var(--bg)', color: 'var(--text3)' }
            return (
              <button key={t.id} onClick={() => router.push(`/player/tournaments/${t.id}`)}
                className="press"
                style={{ width: '100%', background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16, textAlign: 'right', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, color: 'var(--text)', margin: '0 0 2px' }}>{t.name}</p>
                    <p style={{ fontSize: 12, color: 'var(--text2)', margin: '0 0 2px' }}>{sportLabel[t.sport_type]}</p>
                    <p style={{ fontSize: 12, color: 'var(--text2)', margin: '0 0 2px' }}>📍 {t.city} · {t.max_teams} فريق</p>
                    {t.age_group && <p style={{ fontSize: 11, color: 'var(--text3)', margin: '0 0 2px' }}>🎯 {t.age_group}</p>}
                    {t.registration_deadline && <p style={{ fontSize: 11, color: 'var(--gold)', margin: '0 0 2px' }}>⏰ آخر تسجيل: {new Date(t.registration_deadline).toLocaleDateString('ar-SA')}</p>}
                    <p style={{ fontSize: 12, marginTop: 2, fontWeight: 700, color: +t.registration_fee_sar === 0 ? 'var(--primary)' : 'var(--text)', margin: 0 }}>
                      {+t.registration_fee_sar === 0 ? '🆓 مجاني' : `${t.registration_fee_sar} ريال / فريق`}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, marginRight: 8 }}>
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
