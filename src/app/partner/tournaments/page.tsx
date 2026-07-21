'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Tournament = { id: string; name: string; sport_type: string; city: string; status: string; max_teams: number; start_date: string | null; registration_deadline: string | null }

const statusInfo: Record<string, { label: string; color: string }> = {
  upcoming:    { label: 'قادمة',    color: 'bg-blue-50 text-blue-600' },
  registration:{ label: 'تسجيل مفتوح', color: 'bg-[#E8F5F1] text-[#0F6E56]' },
  ongoing:     { label: 'جارية',    color: 'bg-yellow-50 text-yellow-600' },
  completed:   { label: 'منتهية',   color: 'bg-gray-100 text-gray-500' },
  cancelled:   { label: 'ملغاة',    color: 'bg-red-50 text-red-500' },
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
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="bg-[#0F6E56] text-white px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-xl">←</button>
          <div><p className="text-xs opacity-80">الشريك</p><h1 className="text-lg font-bold">بطولاتي</h1></div>
        </div>
        <button onClick={() => router.push('/partner/tournaments/new')}
          className="bg-white text-[#0F6E56] text-sm font-bold px-3 py-1.5 rounded-xl">+ إنشاء</button>
      </header>

      <div className="px-4 py-4 space-y-3">
        {loading ? <div className="text-center py-10 text-[#6B7280]">جاري التحميل...</div>
          : tournaments.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-5xl mb-3">🏆</p>
              <p className="text-sm font-semibold text-[#1A1A1A] mb-1">لا توجد بطولات بعد</p>
              <button onClick={() => router.push('/partner/tournaments/new')}
                className="mt-3 bg-[#0F6E56] text-white px-5 py-2.5 rounded-xl text-sm font-semibold">إنشاء بطولة</button>
            </div>
          ) : tournaments.map((t) => {
            const s = statusInfo[t.status] ?? { label: t.status, color: 'bg-gray-100 text-gray-500' }
            return (
              <button key={t.id} onClick={() => router.push(`/partner/tournaments/${t.id}`)}
                className="w-full bg-white rounded-2xl border border-[#E8ECEF] p-4 text-right">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-[#1A1A1A]">{t.name}</p>
                    <p className="text-xs text-[#6B7280] mt-0.5">{sportLabel[t.sport_type] ?? t.sport_type}</p>
                    <p className="text-xs text-[#6B7280]">📍 {t.city} · {t.max_teams} فريق</p>
                    {t.start_date && <p className="text-xs text-[#9CA3AF]">📅 {new Date(t.start_date).toLocaleDateString('ar-SA')}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2">
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
