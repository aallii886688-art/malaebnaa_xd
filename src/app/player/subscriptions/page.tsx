'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'

type Subscription = {
  id: string; status: string; start_date: string | null; end_date: string | null
  amount_sar: number; created_at: string
  academy_programs: { name: string; sport_type: string; academies: { name: string; city: string } | null } | null
}

type TeamReg = {
  id: string; team_name: string; status: string; created_at: string
  tournaments: { name: string; sport_type: string; city: string; start_date: string | null } | null
}

const statusStyle: Record<string, { label: string; color: string; bg: string }> = {
  active:          { label: 'نشط',          color: 'var(--primary)',  bg: 'var(--primary-dim)' },
  pending_payment: { label: 'انتظار الدفع', color: 'var(--gold)',     bg: 'var(--gold-dim)' },
  expired:         { label: 'منتهي',        color: 'var(--text3)',    bg: 'var(--card2)' },
  cancelled:       { label: 'ملغي',         color: 'var(--danger)',   bg: 'var(--danger-dim)' },
  pending:         { label: 'قيد المراجعة', color: 'var(--gold)',     bg: 'var(--gold-dim)' },
  approved:        { label: 'مقبول',        color: 'var(--primary)',  bg: 'var(--primary-dim)' },
  rejected:        { label: 'مرفوض',        color: 'var(--danger)',   bg: 'var(--danger-dim)' },
  withdrawn:       { label: 'منسحب',        color: 'var(--text3)',    bg: 'var(--card2)' },
}

const sportEmoji: Record<string, string> = {
  football:'⚽', futsal:'🥅', padel:'🎾', basketball:'🏀',
  volleyball:'🏐', tennis:'🎾', squash:'🏸', swimming:'🏊', other:'🏅',
}

export default function SubscriptionsPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'academies' | 'tournaments'>('academies')
  const [subs, setSubs] = useState<Subscription[]>([])
  const [teams, setTeams] = useState<TeamReg[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }

      const [{ data: subData }, { data: teamData }] = await Promise.all([
        supabase.from('academy_subscriptions')
          .select('*, academy_programs(name, sport_type, academies(name, city))')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase.from('tournament_teams')
          .select('*, tournaments(name, sport_type, city, start_date)')
          .eq('captain_user_id', user.id)
          .order('created_at', { ascending: false }),
      ])

      setSubs((subData as Subscription[]) ?? [])
      setTeams((teamData as TeamReg[]) ?? [])
      setLoading(false)
    })
  }, [router])

  const renderStatus = (status: string) => {
    const s = statusStyle[status] ?? { label: status, color: 'var(--text3)', bg: 'var(--card2)' }
    return (
      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: s.bg, color: s.color }}>
        {s.label}
      </span>
    )
  }

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)', paddingBottom: 80 }}>
      <header style={{ background: 'var(--bg2)', padding: '52px 16px 0', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => router.back()} style={{ fontSize: 20, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text)', marginBottom: 8 }}>←</button>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>اشتراكاتي وتسجيلاتي</h1>
        <div style={{ display: 'flex', gap: 0 }}>
          {(['academies', 'tournaments'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
                background: 'transparent', color: tab === t ? 'var(--primary)' : 'var(--text3)',
                borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent',
              }}>
              {t === 'academies' ? `🏅 الأكاديميات (${subs.length})` : `🏆 البطولات (${teams.length})`}
            </button>
          ))}
        </div>
      </header>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          [1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16 }} />)
        ) : tab === 'academies' ? (
          subs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🏅</div>
              <p style={{ fontWeight: 600, color: 'var(--text2)', fontSize: 15 }}>لا توجد اشتراكات</p>
              <Link href="/player/academies" style={{ display: 'inline-block', marginTop: 16, background: 'var(--primary)', color: 'var(--primary-fg)', padding: '10px 24px', borderRadius: 14, fontSize: 13, fontWeight: 700 }}>
                استكشف الأكاديميات
              </Link>
            </div>
          ) : subs.map((s) => {
            const prog = s.academy_programs
            const academy = prog?.academies
            return (
              <div key={s.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 2px' }}>
                      {sportEmoji[prog?.sport_type ?? 'other']} {prog?.name ?? '—'}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text3)', margin: 0 }}>{academy?.name} · {academy?.city}</p>
                  </div>
                  {renderStatus(s.status)}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 10, fontSize: 12, color: 'var(--text3)' }}>
                  <span>{s.amount_sar} ريال</span>
                  {s.end_date && <span>ينتهي: {new Date(s.end_date).toLocaleDateString('ar-SA')}</span>}
                </div>
              </div>
            )
          })
        ) : (
          teams.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
              <p style={{ fontWeight: 600, color: 'var(--text2)', fontSize: 15 }}>لا توجد تسجيلات</p>
              <Link href="/player/tournaments" style={{ display: 'inline-block', marginTop: 16, background: 'var(--primary)', color: 'var(--primary-fg)', padding: '10px 24px', borderRadius: 14, fontSize: 13, fontWeight: 700 }}>
                استكشف البطولات
              </Link>
            </div>
          ) : teams.map((t) => {
            const tour = t.tournaments
            return (
              <div key={t.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 2px' }}>
                      {sportEmoji[tour?.sport_type ?? 'other']} {t.team_name}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text3)', margin: 0 }}>{tour?.name} · {tour?.city}</p>
                  </div>
                  {renderStatus(t.status)}
                </div>
                {tour?.start_date && (
                  <p style={{ fontSize: 12, color: 'var(--text3)', borderTop: '1px solid var(--border)', paddingTop: 10, margin: 0 }}>
                    تاريخ البطولة: {new Date(tour.start_date).toLocaleDateString('ar-SA')}
                  </p>
                )}
              </div>
            )
          })
        )}
      </div>
      <BottomNav />
    </div>
  )
}
