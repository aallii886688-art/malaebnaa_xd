'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'

type Tournament = { id: string; name: string; sport_type: string; city: string; venue: string | null; status: string; max_teams: number; players_per_team: number; substitutes_per_team: number; registration_fee_sar: number; age_group: string | null; start_date: string | null; registration_deadline: string | null; show_results: boolean; show_standings: boolean }
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
    const validPlayers = players.filter((p) => p.trim())
    setRegistering(true); setRegError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { error } = await supabase.from('tournament_teams').insert({
      tournament_id: id, captain_user_id: user.id, team_name: teamName,
      players: validPlayers.map((name) => ({ name })), status: 'pending',
    })
    if (error) { setRegError(error.message); setRegistering(false); return }
    if (tournament && tournament.registration_fee_sar > 0) {
      router.push(`/payment?booking_id=${id}&amount=${tournament.registration_fee_sar}&facility=${encodeURIComponent(tournament.name)}`)
    } else {
      setShowRegForm(false); setRegistering(false)
      router.refresh()
    }
  }

  const teamName2 = (tid: string | null) => teams.find((t) => t.id === tid)?.team_name ?? '—'
  const approvedTeams = teams.filter((t) => t.status === 'approved')

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#6B7280]">جاري التحميل...</div>
  if (!tournament) return <div className="min-h-screen flex items-center justify-center text-red-500">البطولة غير موجودة</div>

  const canRegister = tournament.status === 'registration' && !myTeam && approvedTeams.length < tournament.max_teams

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="bg-[#0F6E56] text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-xl">←</button>
        <div className="flex-1">
          <p className="text-xs opacity-80">{sportLabel[tournament.sport_type]}</p>
          <h1 className="text-base font-bold">{tournament.name}</h1>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex bg-white border-b border-[#E8ECEF]">
        {(['info','teams','bracket'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-3 text-xs font-medium ${tab === t ? 'text-[#0F6E56] border-b-2 border-[#0F6E56]' : 'text-[#6B7280]'}`}>
            {t === 'info' ? '📋 تفاصيل' : t === 'teams' ? `👥 الفرق (${approvedTeams.length})` : '⚽ المباريات'}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 pb-10 space-y-3">
        {tab === 'info' && (
          <>
            <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'المدينة', value: tournament.city },
                  { label: 'الملعب', value: tournament.venue },
                  { label: 'الفئة العمرية', value: tournament.age_group },
                  { label: 'لاعبو الفريق', value: `${tournament.players_per_team} + ${tournament.substitutes_per_team} احتياط` },
                  { label: 'رسوم التسجيل', value: +tournament.registration_fee_sar === 0 ? '🆓 مجاني' : `${tournament.registration_fee_sar} ريال` },
                  { label: 'آخر تسجيل', value: tournament.registration_deadline ? new Date(tournament.registration_deadline).toLocaleDateString('ar-SA') : null },
                ].map(({ label, value }) => value ? (
                  <div key={label}><p className="text-xs text-[#9CA3AF]">{label}</p><p className="text-sm text-[#1A1A1A] mt-0.5">{value}</p></div>
                ) : null)}
              </div>
            </div>

            {/* My team status */}
            {myTeam && (
              <div className={`rounded-2xl border p-4 ${myTeam.status === 'approved' ? 'bg-[#E8F5F1] border-[#0F6E56]' : myTeam.status === 'rejected' ? 'bg-red-50 border-red-300' : 'bg-[#FFF8E8] border-[#C17B1A]'}`}>
                <p className="text-sm font-bold">{myTeam.status === 'approved' ? '✅ فريقك مقبول' : myTeam.status === 'rejected' ? '❌ تم رفض فريقك' : '⏳ طلب قيد المراجعة'}</p>
                <p className="text-xs mt-0.5 text-[#6B7280]">{myTeam.team_name}</p>
              </div>
            )}

            {canRegister && (
              <button onClick={() => setShowRegForm(true)}
                className="w-full bg-[#0F6E56] text-white py-3.5 rounded-2xl font-bold text-sm">
                🏆 سجّل فريقك الآن {+tournament.registration_fee_sar > 0 ? `— ${tournament.registration_fee_sar} ريال` : '— مجاني'}
              </button>
            )}
          </>
        )}

        {tab === 'teams' && (
          approvedTeams.length === 0 ? (
            <div className="text-center py-10"><p className="text-4xl mb-2">👥</p><p className="text-sm text-[#6B7280]">لا توجد فرق مقبولة بعد</p></div>
          ) : approvedTeams.map((t, i) => (
            <div key={t.id} className="bg-white rounded-2xl border border-[#E8ECEF] p-4 flex items-center gap-3">
              <span className="text-lg font-bold text-[#0F6E56] w-6">{i + 1}</span>
              <div className="flex-1">
                <p className="font-bold text-[#1A1A1A] text-sm">{t.team_name}</p>
                <p className="text-xs text-[#6B7280]">{t.players?.length ?? 0} لاعب</p>
              </div>
              {myTeam?.id === t.id && <span className="text-xs bg-[#0F6E56] text-white px-2 py-0.5 rounded-full">فريقك</span>}
            </div>
          ))
        )}

        {tab === 'bracket' && (
          tournament.show_results && matches.length > 0 ? (
            [...new Set(matches.map((m) => m.round))].map((round) => (
              <div key={round} className="bg-white rounded-2xl border border-[#E8ECEF] p-4">
                <p className="text-xs font-bold text-[#9CA3AF] mb-3">الجولة {round}</p>
                <div className="space-y-3">
                  {matches.filter((m) => m.round === round).map((m) => (
                    <div key={m.id} className="flex items-center justify-between border border-[#F8F9FA] rounded-xl px-3 py-2.5">
                      <p className={`text-sm font-medium flex-1 ${m.winner_id === m.team1_id ? 'text-[#0F6E56] font-bold' : 'text-[#1A1A1A]'}`}>{teamName2(m.team1_id)}</p>
                      <div className="mx-3 text-center">
                        {m.is_played ? (
                          <span className="text-base font-bold text-[#1A1A1A]">{m.team1_score} – {m.team2_score}</span>
                        ) : (
                          <span className="text-xs text-[#9CA3AF]">vs</span>
                        )}
                      </div>
                      <p className={`text-sm font-medium flex-1 text-left ${m.winner_id === m.team2_id ? 'text-[#0F6E56] font-bold' : 'text-[#1A1A1A]'}`}>{teamName2(m.team2_id)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-10"><p className="text-4xl mb-2">⚽</p><p className="text-sm text-[#6B7280]">لا توجد مباريات بعد</p></div>
          )
        )}
      </div>

      {/* Registration form */}
      {showRegForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => setShowRegForm(false)}>
          <div className="bg-white rounded-t-2xl p-5 w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-[#1A1A1A] mb-4">تسجيل فريق</h3>

            <label className="block text-xs font-medium text-[#1A1A1A] mb-1">اسم الفريق *</label>
            <input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="مثال: النسور"
              className="w-full border border-[#E8ECEF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56] mb-4" />

            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-[#1A1A1A]">أسماء اللاعبين</label>
              <button onClick={() => setPlayers((p) => [...p, ''])}
                className="text-xs text-[#0F6E56] font-medium">+ إضافة لاعب</button>
            </div>
            <div className="space-y-2 mb-4">
              {players.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <input value={p} onChange={(e) => setPlayers((arr) => arr.map((x, j) => j === i ? e.target.value : x))}
                    placeholder={`اللاعب ${i + 1}`}
                    className="flex-1 border border-[#E8ECEF] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#0F6E56]" />
                  {players.length > 1 && (
                    <button onClick={() => setPlayers((arr) => arr.filter((_, j) => j !== i))}
                      className="text-red-400 text-sm px-2">🗑</button>
                  )}
                </div>
              ))}
            </div>

            {regError && <p className="text-red-500 text-xs mb-3">{regError}</p>}
            <div className="flex gap-2">
              <button onClick={register} disabled={registering}
                className="flex-1 bg-[#0F6E56] text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50">
                {registering ? 'جاري التسجيل...' : +tournament.registration_fee_sar > 0 ? `تسجيل وادفع ${tournament.registration_fee_sar} ر` : 'تسجيل الفريق'}
              </button>
              <button onClick={() => setShowRegForm(false)} className="flex-1 border border-[#E8ECEF] py-2.5 rounded-xl text-sm">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
