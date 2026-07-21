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

const statusColors: Record<string, string> = {
  pending:  'bg-yellow-50 text-yellow-600',
  approved: 'bg-[#E8F5F1] text-[#0F6E56]',
  rejected: 'bg-red-50 text-red-500',
  withdrawn:'bg-gray-100 text-gray-400',
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

  // match result form
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

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#6B7280]">جاري التحميل...</div>
  if (!tournament) return <div className="min-h-screen flex items-center justify-center text-red-500">البطولة غير موجودة</div>

  const approvedCount = teams.filter((t) => t.status === 'approved').length
  const pendingCount = teams.filter((t) => t.status === 'pending').length

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="bg-[#0F6E56] text-white px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-xl">←</button>
          <div><p className="text-xs opacity-80">إدارة البطولة</p><h1 className="text-base font-bold">{tournament.name}</h1></div>
        </div>
        <select value={tournament.status} onChange={(e) => changeStatus(e.target.value)}
          className="text-xs bg-white/20 text-white border border-white/30 rounded-xl px-2 py-1 focus:outline-none">
          {tournamentStatuses.map((s) => <option key={s} value={s} className="text-[#1A1A1A]">{s === 'upcoming' ? 'قادمة' : s === 'registration' ? 'تسجيل' : s === 'ongoing' ? 'جارية' : s === 'completed' ? 'منتهية' : 'ملغاة'}</option>)}
        </select>
      </header>

      {/* Stats bar */}
      <div className="grid grid-cols-3 bg-white border-b border-[#E8ECEF]">
        {[
          { label: 'الفرق', value: `${approvedCount}/${tournament.max_teams}` },
          { label: 'معلقة', value: pendingCount },
          { label: 'المباريات', value: matches.length },
        ].map(({ label, value }) => (
          <div key={label} className="text-center py-3">
            <p className="text-lg font-bold text-[#0F6E56]">{value}</p>
            <p className="text-[10px] text-[#6B7280]">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-[#E8ECEF]">
        {(['info', 'teams', 'matches'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-3 text-xs font-medium ${tab === t ? 'text-[#0F6E56] border-b-2 border-[#0F6E56]' : 'text-[#6B7280]'}`}>
            {t === 'info' ? '📋 المعلومات' : t === 'teams' ? `👥 الفرق (${teams.length})` : `⚽ المباريات (${matches.length})`}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 pb-10 space-y-3">
        {tab === 'info' && (
          <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4 space-y-3">
            {[
              { label: 'المدينة', value: tournament.city },
              { label: 'الملعب', value: tournament.venue },
              { label: 'الفئة العمرية', value: tournament.age_group },
              { label: 'رسوم التسجيل', value: tournament.registration_fee_sar ? `${tournament.registration_fee_sar} ريال` : 'مجاني' },
              { label: 'آخر موعد تسجيل', value: tournament.registration_deadline ? new Date(tournament.registration_deadline).toLocaleDateString('ar-SA') : null },
              { label: 'تاريخ البداية', value: tournament.start_date ? new Date(tournament.start_date).toLocaleDateString('ar-SA') : null },
            ].map(({ label, value }) => value ? (
              <div key={label}><p className="text-xs text-[#9CA3AF]">{label}</p><p className="text-sm text-[#1A1A1A] mt-0.5">{value}</p></div>
            ) : null)}
          </div>
        )}

        {tab === 'teams' && (
          teams.length === 0 ? (
            <div className="text-center py-10"><p className="text-4xl mb-2">👥</p><p className="text-sm text-[#6B7280]">لا توجد فرق مسجلة بعد</p></div>
          ) : teams.map((team) => (
            <div key={team.id} className="bg-white rounded-2xl border border-[#E8ECEF] p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold text-[#1A1A1A] text-sm">{team.team_name}</p>
                  <p className="text-xs text-[#6B7280]">{Array.isArray(team.players) ? team.players.length : 0} لاعب</p>
                  <p className="text-[10px] text-[#9CA3AF]">{new Date(team.created_at).toLocaleDateString('ar-SA')}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[team.status]}`}>
                  {team.status === 'pending' ? 'معلق' : team.status === 'approved' ? 'مقبول' : team.status === 'rejected' ? 'مرفوض' : 'انسحب'}
                </span>
              </div>
              {team.status === 'pending' && (
                <div className="flex gap-2">
                  <button onClick={() => approveTeam(team.id, true)} disabled={actionLoading === team.id}
                    className="flex-1 bg-[#0F6E56] text-white text-xs py-2 rounded-xl disabled:opacity-50">
                    {actionLoading === team.id ? '...' : '✓ قبول'}
                  </button>
                  <button onClick={() => approveTeam(team.id, false)} disabled={actionLoading === team.id}
                    className="flex-1 border border-red-300 text-red-500 text-xs py-2 rounded-xl disabled:opacity-50">✕ رفض</button>
                </div>
              )}
            </div>
          ))
        )}

        {tab === 'matches' && (
          <>
            <button onClick={addMatch} className="w-full border-2 border-dashed border-[#0F6E56] text-[#0F6E56] text-sm py-3 rounded-2xl font-medium">
              + إضافة مباراة
            </button>
            {matches.length === 0 ? (
              <div className="text-center py-8"><p className="text-4xl mb-2">⚽</p><p className="text-sm text-[#6B7280]">لا توجد مباريات بعد</p></div>
            ) : matches.map((m) => (
              <div key={m.id} className="bg-white rounded-2xl border border-[#E8ECEF] p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[#9CA3AF]">الجولة {m.round} · مباراة {m.match_number}</span>
                  {m.match_date && <span className="text-xs text-[#9CA3AF]">{new Date(m.match_date).toLocaleDateString('ar-SA')}</span>}
                </div>
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-bold ${m.winner_id === m.team1_id ? 'text-[#0F6E56]' : 'text-[#1A1A1A]'}`}>{teamName(m.team1_id)}</p>
                  <div className="flex items-center gap-2 mx-2">
                    {m.is_played ? (
                      <span className="text-lg font-bold text-[#1A1A1A]">{m.team1_score} – {m.team2_score}</span>
                    ) : (
                      <span className="text-xs bg-[#F8F9FA] px-3 py-1 rounded-full text-[#6B7280]">لم تُلعب</span>
                    )}
                  </div>
                  <p className={`text-sm font-bold ${m.winner_id === m.team2_id ? 'text-[#0F6E56]' : 'text-[#1A1A1A]'}`}>{teamName(m.team2_id)}</p>
                </div>
                {!m.is_played && m.team1_id && m.team2_id && (
                  <button onClick={() => { setEditMatch(m); setScore1(''); setScore2('') }}
                    className="w-full mt-2 border border-[#0F6E56] text-[#0F6E56] text-xs py-1.5 rounded-xl">
                    إدخال النتيجة
                  </button>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Result modal */}
      {editMatch && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => setEditMatch(null)}>
          <div className="bg-white rounded-t-2xl p-5 w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-[#1A1A1A] mb-4 text-center">إدخال نتيجة المباراة</h3>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 text-center">
                <p className="text-xs text-[#6B7280] mb-2">{teamName(editMatch.team1_id)}</p>
                <input type="number" value={score1} onChange={(e) => setScore1(e.target.value)} min="0"
                  placeholder="0" className="w-full border-2 border-[#E8ECEF] rounded-xl text-center text-2xl font-bold py-3 focus:outline-none focus:border-[#0F6E56]" />
              </div>
              <span className="text-xl font-bold text-[#6B7280]">–</span>
              <div className="flex-1 text-center">
                <p className="text-xs text-[#6B7280] mb-2">{teamName(editMatch.team2_id)}</p>
                <input type="number" value={score2} onChange={(e) => setScore2(e.target.value)} min="0"
                  placeholder="0" className="w-full border-2 border-[#E8ECEF] rounded-xl text-center text-2xl font-bold py-3 focus:outline-none focus:border-[#0F6E56]" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={saveResult} disabled={savingResult || score1 === '' || score2 === ''}
                className="flex-1 bg-[#0F6E56] text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50">
                {savingResult ? 'جاري الحفظ...' : 'حفظ النتيجة'}
              </button>
              <button onClick={() => setEditMatch(null)} className="flex-1 border border-[#E8ECEF] py-2.5 rounded-xl text-sm">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
