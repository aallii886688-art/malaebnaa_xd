'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import DynamicFields, { type DynamicFieldsHandle, saveDynamicFieldValues } from '@/components/DynamicFields'

type Tournament = { id: string; name: string; sport_type: string; city: string; venue: string | null; status: string; max_teams: number; players_per_team: number; substitutes_per_team: number; registration_fee_sar: number; age_group: string | null; start_date: string | null; registration_deadline: string | null; show_results: boolean; show_standings: boolean; owner_id: string }
type Team = { id: string; team_name: string; status: string; players: {name:string}[] }
type Match = { id: string; round: number; match_number: number; team1_id: string | null; team2_id: string | null; team1_score: number | null; team2_score: number | null; winner_id: string | null; is_played: boolean }

const sportLabel: Record<string, string> = { football:'⚽ كرة قدم', futsal:'🥅 فوتسال', padel:'🎾 بادل', basketball:'🏀 كرة سلة', volleyball:'🏐 كرة طائرة', other:'🏅 أخرى' }

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [myTeam, setMyTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'info' | 'teams' | 'bracket'>('info')
  const [showRegForm, setShowRegForm] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [players, setPlayers] = useState<string[]>([''])
  const [registering, setRegistering] = useState(false)
  const [regError, setRegError] = useState('')
  const dynamicRef = useRef<DynamicFieldsHandle>(null)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('tournaments').select('*').eq('id', id).single(),
      supabase.from('tournament_teams').select('*').eq('tournament_id', id),
      supabase.from('tournament_matches').select('*').eq('tournament_id', id).order('round').order('match_number'),
      supabase.auth.getUser(),
    ]).then(([{ data: t }, { data: tm }, { data: m }, { data: { user } }]) => {
      setTournament(t as Tournament)
      setTeams((tm as Team[]) ?? [])
      setMatches((m as Match[]) ?? [])
      if (user) setMyTeam((tm as Team[])?.find((team) => (team as unknown as {captain_user_id:string}).captain_user_id === user.id) ?? null)
      setLoading(false)
    })
  }, [id])

  const register = async () => {
    if (!teamName.trim()) { setRegError('اسم الفريق مطلوب'); return }
    if (dynamicRef.current && !dynamicRef.current.validate()) return
    const validPlayers = players.filter((p) => p.trim())
    setRegistering(true); setRegError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data, error } = await supabase.from('tournament_teams').insert({
      tournament_id: id, captain_user_id: user.id, team_name: teamName,
      players: validPlayers.map((name) => ({ name })), status: 'pending',
    }).select('id').single()
    if (error) { setRegError(error.message); setRegistering(false); return }
    if (dynamicRef.current && data?.id) {
      await saveDynamicFieldValues(dynamicRef.current.getValues(), data.id, 'tournament_teams', user.id)
    }
    if (tournament && tournament.registration_fee_sar > 0) {
      router.push(`/payment?booking_id=${data?.id}&amount=${tournament.registration_fee_sar}&facility=${encodeURIComponent(tournament.name)}`)
    } else {
      setShowRegForm(false); setRegistering(false)
      router.refresh()
    }
  }

  const teamName2 = (tid: string | null) => teams.find((t) => t.id === tid)?.team_name ?? '—'
  const approvedTeams = teams.filter((t) => t.status === 'approved')

  if (loading) return <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>جاري التحميل...</div>
  if (!tournament) return <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}>البطولة غير موجودة</div>

  const canRegister = tournament.status === 'registration' && !myTeam && approvedTeams.length < tournament.max_teams

  const tabs = [
    { key: 'info', label: '📋 تفاصيل' },
    { key: 'teams', label: `👥 الفرق (${approvedTeams.length})` },
    { key: 'bracket', label: '⚽ المباريات' },
  ]

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <header style={{ background: 'var(--bg2)', padding: '52px 16px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ fontSize: 20, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text)' }}>←</button>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>{sportLabel[tournament.sport_type]}</p>
          <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{tournament.name}</h1>
        </div>
      </header>

      <div style={{ display: 'flex', background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
            style={{ flex: 1, padding: '12px 4px', fontSize: 12, fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer', color: tab === t.key ? 'var(--primary)' : 'var(--text2)', borderBottom: tab === t.key ? '2px solid var(--primary)' : '2px solid transparent' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px 16px 40px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {tab === 'info' && (
          <>
            <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'المدينة', value: tournament.city },
                  { label: 'الملعب', value: tournament.venue },
                  { label: 'الفئة العمرية', value: tournament.age_group },
                  { label: 'لاعبو الفريق', value: `${tournament.players_per_team} + ${tournament.substitutes_per_team} احتياط` },
                  { label: 'رسوم التسجيل', value: +tournament.registration_fee_sar === 0 ? '🆓 مجاني' : `${tournament.registration_fee_sar} ريال` },
                  { label: 'آخر تسجيل', value: tournament.registration_deadline ? new Date(tournament.registration_deadline).toLocaleDateString('ar-SA') : null },
                ].map(({ label, value }) => value ? (
                  <div key={label}><p style={{ fontSize: 11, color: 'var(--text3)', margin: '0 0 2px' }}>{label}</p><p style={{ fontSize: 13, color: 'var(--text)', margin: 0 }}>{value}</p></div>
                ) : null)}
              </div>
            </div>

            {myTeam && (
              <div style={{ borderRadius: 20, border: `1px solid ${myTeam.status === 'approved' ? 'var(--primary)' : myTeam.status === 'rejected' ? 'var(--danger)' : 'var(--gold)'}`, padding: 16, background: myTeam.status === 'approved' ? 'var(--primary-dim)' : myTeam.status === 'rejected' ? 'var(--danger-dim)' : 'var(--gold-dim)' }}>
                <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 4px', color: 'var(--text)' }}>{myTeam.status === 'approved' ? '✅ فريقك مقبول' : myTeam.status === 'rejected' ? '❌ تم رفض فريقك' : '⏳ طلب قيد المراجعة'}</p>
                <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0 }}>{myTeam.team_name}</p>
              </div>
            )}

            {canRegister && (
              <button onClick={() => setShowRegForm(true)}
                style={{ width: '100%', background: 'var(--primary)', color: 'var(--primary-fg)', padding: '14px', borderRadius: 20, fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>
                🏆 سجّل فريقك الآن {+tournament.registration_fee_sar > 0 ? `— ${tournament.registration_fee_sar} ريال` : '— مجاني'}
              </button>
            )}
          </>
        )}

        {tab === 'teams' && (
          approvedTeams.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}><p style={{ fontSize: 40, marginBottom: 8 }}>👥</p><p style={{ fontSize: 13, color: 'var(--text2)' }}>لا توجد فرق مقبولة بعد</p></div>
          ) : approvedTeams.map((t, i) => (
            <div key={t.id} style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)', width: 24 }}>{i + 1}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13, margin: '0 0 2px' }}>{t.team_name}</p>
                <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0 }}>{t.players?.length ?? 0} لاعب</p>
              </div>
              {myTeam?.id === t.id && <span style={{ fontSize: 11, background: 'var(--primary)', color: 'var(--primary-fg)', padding: '2px 8px', borderRadius: 20 }}>فريقك</span>}
            </div>
          ))
        )}

        {tab === 'bracket' && (
          tournament.show_results && matches.length > 0 ? (
            [...new Set(matches.map((m) => m.round))].map((round) => (
              <div key={round} style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 12 }}>الجولة {round}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {matches.filter((m) => m.round === round).map((m) => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--border)', borderRadius: 14, padding: '10px 12px' }}>
                      <p style={{ fontSize: 13, fontWeight: m.winner_id === m.team1_id ? 700 : 500, flex: 1, margin: 0, color: m.winner_id === m.team1_id ? 'var(--primary)' : 'var(--text)' }}>{teamName2(m.team1_id)}</p>
                      <div style={{ margin: '0 12px', textAlign: 'center' }}>
                        {m.is_played ? (
                          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{m.team1_score} – {m.team2_score}</span>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--text3)' }}>vs</span>
                        )}
                      </div>
                      <p style={{ fontSize: 13, fontWeight: m.winner_id === m.team2_id ? 700 : 500, flex: 1, margin: 0, textAlign: 'left', color: m.winner_id === m.team2_id ? 'var(--primary)' : 'var(--text)' }}>{teamName2(m.team2_id)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0' }}><p style={{ fontSize: 40, marginBottom: 8 }}>⚽</p><p style={{ fontSize: 13, color: 'var(--text2)' }}>لا توجد مباريات بعد</p></div>
          )
        )}
      </div>

      {showRegForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 50 }} onClick={() => setShowRegForm(false)}>
          <div style={{ background: 'var(--card)', borderRadius: '20px 20px 0 0', padding: 20, width: '100%', maxHeight: '85svh', overflowY: 'auto', boxSizing: 'border-box' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>تسجيل فريق</h3>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>اسم الفريق *</label>
            <input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="مثال: النسور"
              style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px', fontSize: 13, outline: 'none', background: 'transparent', color: 'var(--text)', boxSizing: 'border-box', marginBottom: 16 }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>أسماء اللاعبين</label>
              <button onClick={() => setPlayers((p) => [...p, ''])}
                style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer' }}>+ إضافة لاعب</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {players.map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: 8 }}>
                  <input value={p} onChange={(e) => setPlayers((arr) => arr.map((x, j) => j === i ? e.target.value : x))}
                    placeholder={`اللاعب ${i + 1}`}
                    style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 12, padding: '8px 12px', fontSize: 13, outline: 'none', background: 'transparent', color: 'var(--text)' }} />
                  {players.length > 1 && (
                    <button onClick={() => setPlayers((arr) => arr.filter((_, j) => j !== i))}
                      style={{ color: 'var(--danger)', fontSize: 14, padding: '0 8px', background: 'transparent', border: 'none', cursor: 'pointer' }}>🗑</button>
                  )}
                </div>
              ))}
            </div>

            {tournament.owner_id && (
              <div style={{ marginBottom: 16 }}>
                <DynamicFields ref={dynamicRef} ownerId={tournament.owner_id} activity="tournament_manager" useIn="tournament_registration" />
              </div>
            )}

            {regError && <p style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 12 }}>{regError}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={register} disabled={registering}
                style={{ flex: 1, background: 'var(--primary)', color: 'var(--primary-fg)', padding: '10px', borderRadius: 14, fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', opacity: registering ? 0.5 : 1 }}>
                {registering ? 'جاري التسجيل...' : +tournament.registration_fee_sar > 0 ? `تسجيل وادفع ${tournament.registration_fee_sar} ر` : 'تسجيل الفريق'}
              </button>
              <button onClick={() => setShowRegForm(false)} style={{ flex: 1, border: '1px solid var(--border)', padding: '10px', borderRadius: 14, fontSize: 13, background: 'transparent', color: 'var(--text2)', cursor: 'pointer' }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
