'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'

type Tournament = {
  id: string; name: string; sport_type: string; system: string; city: string
  venue: string | null; max_teams: number; players_per_team: number
  registration_fee_sar: number; age_group: string | null; status: string
  start_date: string | null; registration_deadline: string | null
}
type Team = { id: string; team_name: string; status: string; registration_fee_paid: boolean; created_at: string; players: unknown[] }
type Match = {
  id: string; round: number; match_number: number; stage: string | null
  team1_id: string | null; team2_id: string | null
  team1_score: number | null; team2_score: number | null
  winner_id: string | null; is_played: boolean; match_date: string | null
}

const statusColors: Record<string, { bg: string; color: string }> = {
  pending:   { bg: 'rgba(234,179,8,0.12)', color: '#ca8a04' },
  approved:  { bg: 'var(--primary-dim)',   color: 'var(--primary)' },
  rejected:  { bg: 'var(--danger-dim)',    color: 'var(--danger)' },
  withdrawn: { bg: 'var(--bg)',            color: 'var(--text3)' },
}

const tournamentStatuses = ['upcoming','registration','ongoing','completed','cancelled']

export default function TournamentManagePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'info' | 'teams' | 'matches'>('info')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const [editMatch, setEditMatch] = useState<Match | null>(null)
  const [score1, setScore1] = useState('')
  const [score2, setScore2] = useState('')
  const [savingResult, setSavingResult] = useState(false)

  const load = async () => {
    const supabase = createClient()
    const [{ data: t }, { data: tm }, { data: m }] = await Promise.all([
      supabase.from('tournaments').select('*').eq('id', id).single(),
      supabase.from('tournament_teams').select('*').eq('tournament_id', id).order('created_at'),
      supabase.from('tournament_matches').select('*').eq('tournament_id', id).order('round').order('match_number'),
    ])
    setTournament(t as Tournament); setTeams((tm as Team[]) ?? []); setMatches((m as Match[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const approveTeam = async (teamId: string, approve: boolean) => {
    setActionLoading(teamId)
    const supabase = createClient()
    await supabase.from('tournament_teams').update({ status: approve ? 'approved' : 'rejected' }).eq('id', teamId)
    await load(); setActionLoading(null)
  }

  const changeStatus = async (status: string) => {
    const supabase = createClient()
    await supabase.from('tournaments').update({ status }).eq('id', id)
    setTournament((t) => t ? { ...t, status } : t)
  }

  const addMatch = async () => {
    const approvedTeams = teams.filter((t) => t.status === 'approved')
    if (approvedTeams.length < 2) { alert('يجب أن يكون هناك فريقان مقبولان على الأقل'); return }
    const supabase = createClient()
    const round = matches.length > 0 ? Math.max(...matches.map((m) => m.round)) : 1
    const matchNum = matches.filter((m) => m.round === round).length + 1
    await supabase.from('tournament_matches').insert({
      tournament_id: id, round, match_number: matchNum,
      team1_id: approvedTeams[0].id, team2_id: approvedTeams[1].id,
    })
    await load()
  }

  const saveResult = async () => {
    if (!editMatch || score1 === '' || score2 === '') return
    setSavingResult(true)
    const s1 = +score1; const s2 = +score2
    const winnerId = s1 > s2 ? editMatch.team1_id : s2 > s1 ? editMatch.team2_id : null
    const supabase = createClient()
    await supabase.from('tournament_matches').update({
      team1_score: s1, team2_score: s2, winner_id: winnerId, is_played: true,
    }).eq('id', editMatch.id)
    setEditMatch(null); setScore1(''); setScore2('')
    await load(); setSavingResult(false)
  }

  const teamName = (teamId: string | null) => teams.find((t) => t.id === teamId)?.team_name ?? '—'

  if (loading) return <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>جاري التحميل...</div>
  if (!tournament) return <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}>البطولة غير موجودة</div>

  const approvedCount = teams.filter((t) => t.status === 'approved').length
  const pendingCount = teams.filter((t) => t.status === 'pending').length

  const tabDefs = [
    { key: 'info', label: '📋 المعلومات' },
    { key: 'teams', label: `👥 الفرق (${teams.length})` },
    { key: 'matches', label: `⚽ المباريات (${matches.length})` },
  ]

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <header style={{ background: 'var(--bg2)', padding: '52px 16px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()} style={{ fontSize: 20, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text)' }}>←</button>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>إدارة البطولة</p>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{tournament.name}</h1>
          </div>
        </div>
        <select value={tournament.status} onChange={(e) => changeStatus(e.target.value)}
          style={{ fontSize: 11, background: 'var(--card2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 10, padding: '4px 8px', outline: 'none', cursor: 'pointer' }}>
          {tournamentStatuses.map((s) => <option key={s} value={s}>{s === 'upcoming' ? 'قادمة' : s === 'registration' ? 'تسجيل' : s === 'ongoing' ? 'جارية' : s === 'completed' ? 'منتهية' : 'ملغاة'}</option>)}
        </select>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
        {[
          { label: 'الفرق', value: `${approvedCount}/${tournament.max_teams}` },
          { label: 'معلقة', value: pendingCount },
          { label: 'المباريات', value: matches.length },
        ].map(({ label, value }) => (
          <div key={label} style={{ textAlign: 'center', padding: '12px 0' }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)', margin: 0 }}>{value}</p>
            <p style={{ fontSize: 10, color: 'var(--text2)', margin: 0 }}>{label}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
        {tabDefs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
            style={{ flex: 1, padding: '12px 4px', fontSize: 11, fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer', color: tab === t.key ? 'var(--primary)' : 'var(--text2)', borderBottom: tab === t.key ? '2px solid var(--primary)' : '2px solid transparent' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px 16px 40px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {tab === 'info' && (
          <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'المدينة', value: tournament.city },
              { label: 'الملعب', value: tournament.venue },
              { label: 'الفئة العمرية', value: tournament.age_group },
              { label: 'رسوم التسجيل', value: tournament.registration_fee_sar ? `${tournament.registration_fee_sar} ريال` : 'مجاني' },
              { label: 'آخر موعد تسجيل', value: tournament.registration_deadline ? new Date(tournament.registration_deadline).toLocaleDateString('ar-SA') : null },
              { label: 'تاريخ البداية', value: tournament.start_date ? new Date(tournament.start_date).toLocaleDateString('ar-SA') : null },
            ].map(({ label, value }) => value ? (
              <div key={label}><p style={{ fontSize: 11, color: 'var(--text3)', margin: '0 0 2px' }}>{label}</p><p style={{ fontSize: 13, color: 'var(--text)', margin: 0 }}>{value}</p></div>
            ) : null)}
          </div>
        )}

        {tab === 'teams' && (
          teams.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}><p style={{ fontSize: 40, marginBottom: 8 }}>👥</p><p style={{ fontSize: 13, color: 'var(--text2)' }}>لا توجد فرق مسجلة بعد</p></div>
          ) : teams.map((team) => (
            <div key={team.id} style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <p style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13, margin: '0 0 2px' }}>{team.team_name}</p>
                  <p style={{ fontSize: 12, color: 'var(--text2)', margin: '0 0 2px' }}>{Array.isArray(team.players) ? team.players.length : 0} لاعب</p>
                  <p style={{ fontSize: 10, color: 'var(--text3)', margin: 0 }}>{new Date(team.created_at).toLocaleDateString('ar-SA')}</p>
                </div>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: statusColors[team.status]?.bg ?? 'var(--bg)', color: statusColors[team.status]?.color ?? 'var(--text3)' }}>
                  {team.status === 'pending' ? 'معلق' : team.status === 'approved' ? 'مقبول' : team.status === 'rejected' ? 'مرفوض' : 'انسحب'}
                </span>
              </div>
              {team.status === 'pending' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => approveTeam(team.id, true)} disabled={actionLoading === team.id}
                    style={{ flex: 1, background: 'var(--primary)', color: 'var(--primary-fg)', fontSize: 12, padding: '8px', borderRadius: 12, border: 'none', cursor: 'pointer', opacity: actionLoading === team.id ? 0.5 : 1 }}>
                    {actionLoading === team.id ? '...' : '✓ قبول'}
                  </button>
                  <button onClick={() => approveTeam(team.id, false)} disabled={actionLoading === team.id}
                    style={{ flex: 1, border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: 12, padding: '8px', borderRadius: 12, background: 'transparent', cursor: 'pointer', opacity: actionLoading === team.id ? 0.5 : 1 }}>✕ رفض</button>
                </div>
              )}
            </div>
          ))
        )}

        {tab === 'matches' && (
          <>
            <button onClick={addMatch} style={{ width: '100%', border: '2px dashed var(--primary)', color: 'var(--primary)', fontSize: 13, padding: '12px', borderRadius: 20, fontWeight: 600, background: 'transparent', cursor: 'pointer' }}>
              + إضافة مباراة
            </button>
            {matches.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}><p style={{ fontSize: 40, marginBottom: 8 }}>⚽</p><p style={{ fontSize: 13, color: 'var(--text2)' }}>لا توجد مباريات بعد</p></div>
            ) : matches.map((m) => (
              <div key={m.id} style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>الجولة {m.round} · مباراة {m.match_number}</span>
                  {m.match_date && <span style={{ fontSize: 11, color: 'var(--text3)' }}>{new Date(m.match_date).toLocaleDateString('ar-SA')}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: m.winner_id === m.team1_id ? 'var(--primary)' : 'var(--text)' }}>{teamName(m.team1_id)}</p>
                  <div style={{ margin: '0 8px', textAlign: 'center' }}>
                    {m.is_played ? (
                      <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{m.team1_score} – {m.team2_score}</span>
                    ) : (
                      <span style={{ fontSize: 12, background: 'var(--bg)', padding: '4px 12px', borderRadius: 20, color: 'var(--text2)' }}>لم تُلعب</span>
                    )}
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: m.winner_id === m.team2_id ? 'var(--primary)' : 'var(--text)' }}>{teamName(m.team2_id)}</p>
                </div>
                {!m.is_played && m.team1_id && m.team2_id && (
                  <button onClick={() => { setEditMatch(m); setScore1(''); setScore2('') }}
                    style={{ width: '100%', marginTop: 8, border: '1px solid var(--primary)', color: 'var(--primary)', fontSize: 12, padding: '6px', borderRadius: 12, background: 'transparent', cursor: 'pointer' }}>
                    إدخال النتيجة
                  </button>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {editMatch && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 50 }} onClick={() => setEditMatch(null)}>
          <div style={{ background: 'var(--card)', borderRadius: '20px 20px 0 0', padding: 20, width: '100%', boxSizing: 'border-box' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 16, textAlign: 'center' }}>إدخال نتيجة المباراة</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>{teamName(editMatch.team1_id)}</p>
                <input type="number" value={score1} onChange={(e) => setScore1(e.target.value)} min="0"
                  placeholder="0" style={{ width: '100%', border: '2px solid var(--border)', borderRadius: 14, textAlign: 'center', fontSize: 24, fontWeight: 700, padding: '12px', outline: 'none', background: 'transparent', color: 'var(--text)', boxSizing: 'border-box' }} />
              </div>
              <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text2)' }}>–</span>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>{teamName(editMatch.team2_id)}</p>
                <input type="number" value={score2} onChange={(e) => setScore2(e.target.value)} min="0"
                  placeholder="0" style={{ width: '100%', border: '2px solid var(--border)', borderRadius: 14, textAlign: 'center', fontSize: 24, fontWeight: 700, padding: '12px', outline: 'none', background: 'transparent', color: 'var(--text)', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={saveResult} disabled={savingResult || score1 === '' || score2 === ''}
                style={{ flex: 1, background: 'var(--primary)', color: 'var(--primary-fg)', padding: '10px', borderRadius: 14, fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', opacity: (savingResult || score1 === '' || score2 === '') ? 0.5 : 1 }}>
                {savingResult ? 'جاري الحفظ...' : 'حفظ النتيجة'}
              </button>
              <button onClick={() => setEditMatch(null)} style={{ flex: 1, border: '1px solid var(--border)', padding: '10px', borderRadius: 14, fontSize: 13, background: 'transparent', color: 'var(--text2)', cursor: 'pointer' }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
