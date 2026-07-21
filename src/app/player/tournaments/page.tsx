'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Tournament = { id: string; name: string; sport_type: string; city: string; status: string; max_teams: number; registration_fee_sar: number; start_date: string | null; registration_deadline: string | null; age_group: string | null }

const sportLabel: Record<string, string> = {
  football:'⚽ كرة قدم', futsal:'🥅 فوتسال', padel:'🎾 بادل',
  basketball:'🏀 كرة سلة', volleyball:'🏐 كرة طائرة', other:'🏅 أخرى',
}

const statusInfo: Record<string, { label: string; color: string }> = {
  upcoming:     { label: 'قادمة',           color: 'bg-blue-50 text-blue-600' },
  registration: { label: 'تسجيل مفتوح',    color: 'bg-[#E8F5F1] text-[#0F6E56]' },
  ongoing:      { label: 'جارية',           color: 'bg-yellow-50 text-yellow-600' },
  completed:    { label: 'منتهية',          color: 'bg-gray-100 text-gray-500' },
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
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="bg-[#0F6E56] text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-xl">←</button>
        <div><p className="text-xs opacity-80">استكشاف</p><h1 className="text-lg font-bold">البطولات</h1></div>
      </header>

      <div className="flex gap-2 px-4 py-3 overflow-x-auto">
        {([['all','الكل'],['registration','تسجيل مفتوح'],['ongoing','جارية']] as [string,string][]).map(([v,l]) => (
          <button key={v} onClick={() => { setFilter(v as typeof filter); setLoading(true) }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${filter === v ? 'bg-[#0F6E56] text-white' : 'bg-white border border-[#E8ECEF] text-[#6B7280]'}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="px-4 pb-6 space-y-3">
        {loading ? <div className="text-center py-10 text-[#6B7280]">جاري التحميل...</div>
          : tournaments.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-5xl mb-2">🏆</p><p className="text-sm text-[#6B7280]">لا توجد بطولات متاحة</p>
            </div>
          ) : tournaments.map((t) => {
            const s = statusInfo[t.status] ?? { label: t.status, color: 'bg-gray-100 text-gray-500' }
            return (
              <button key={t.id} onClick={() => router.push(`/player/tournaments/${t.id}`)}
                className="w-full bg-white rounded-2xl border border-[#E8ECEF] p-4 text-right">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-bold text-[#1A1A1A]">{t.name}</p>
                    <p className="text-xs text-[#6B7280] mt-0.5">{sportLabel[t.sport_type]}</p>
                    <p className="text-xs text-[#6B7280]">📍 {t.city} · {t.max_teams} فريق</p>
                    {t.age_group && <p className="text-xs text-[#9CA3AF]">🎯 {t.age_group}</p>}
                    {t.registration_deadline && <p className="text-xs text-[#C17B1A]">⏰ آخر تسجيل: {new Date(t.registration_deadline).toLocaleDateString('ar-SA')}</p>}
                    <p className={`text-xs mt-1 font-bold ${+t.registration_fee_sar === 0 ? 'text-[#0F6E56]' : 'text-[#1A1A1A]'}`}>
                      {+t.registration_fee_sar === 0 ? '🆓 مجاني' : `${t.registration_fee_sar} ريال / فريق`}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 mr-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                    <span className="text-[#9CA3AF] text-sm">←</span>
                  </div>
                </div>
              </button>
            )
          })}
      </div>
    </div>
  )
}
