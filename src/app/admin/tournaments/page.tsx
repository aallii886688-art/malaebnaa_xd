'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Tournament = {
  id: string
  name: string
  sport_type: string
  city: string
  status: string
  max_teams: number
  registration_fee_sar: number
  start_date: string
  is_active: boolean
  profiles: { full_name: string } | null
}

const statusLabel: Record<string, { label: string; color: string }> = {
  upcoming: { label: 'قريباً', color: 'bg-blue-50 text-blue-600' },
  registration: { label: 'تسجيل مفتوح', color: 'bg-[#E8F5F1] text-[#0F6E56]' },
  ongoing: { label: 'جارية', color: 'bg-orange-50 text-orange-600' },
  completed: { label: 'منتهية', color: 'bg-[#F8F9FA] text-[#6B7280]' },
  cancelled: { label: 'ملغية', color: 'bg-red-50 text-red-500' },
}

export default function AdminTournamentsPage() {
  const router = useRouter()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('tournaments')
      .select('*, profiles:owner_id(full_name)')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setTournaments((data as Tournament[]) ?? []); setLoading(false) })
  }, [])

  const toggleActive = async (id: string, current: boolean) => {
    const supabase = createClient()
    await supabase.from('tournaments').update({ is_active: !current }).eq('id', id)
    setTournaments((prev) => prev.map((t) => t.id === id ? { ...t, is_active: !current } : t))
  }

  const filtered = tournaments.filter((t) =>
    t.name.includes(search) || t.city.includes(search)
  )

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="bg-[#0F6E56] text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-white text-xl">←</button>
        <div>
          <p className="text-xs opacity-80">لوحة التحكم</p>
          <h1 className="text-lg font-bold">البطولات</h1>
        </div>
      </header>

      <div className="px-4 py-4 space-y-3">
        <div className="bg-white rounded-xl border border-[#E8ECEF] px-4 py-3 flex items-center gap-2">
          <span className="text-[#6B7280]">🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو المدينة..."
            className="flex-1 text-sm focus:outline-none" />
        </div>

        <p className="text-xs text-[#6B7280]">{filtered.length} بطولة</p>

        {loading ? (
          <div className="text-center py-10 text-[#6B7280]">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-[#6B7280]">لا توجد بطولات مضافة بعد</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((t) => {
              const st = statusLabel[t.status] ?? { label: t.status, color: 'bg-gray-100 text-gray-600' }
              return (
                <div key={t.id} className="bg-white rounded-xl border border-[#E8ECEF] p-4">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <p className="font-semibold text-sm text-[#1A1A1A]">{t.name}</p>
                      <p className="text-xs text-[#6B7280]">📍 {t.city} • {t.start_date}</p>
                      {t.profiles && <p className="text-xs text-[#9CA3AF]">المسؤول: {t.profiles.full_name}</p>}
                      {t.registration_fee_sar > 0 && (
                        <p className="text-xs text-[#6B7280]">رسوم التسجيل: {t.registration_fee_sar} ر.س</p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                  </div>
                  <button onClick={() => toggleActive(t.id, t.is_active)}
                    className={`mt-2 w-full text-xs py-1.5 rounded-lg border font-medium ${t.is_active ? 'border-red-300 text-red-500' : 'border-[#0F6E56] text-[#0F6E56]'}`}>
                    {t.is_active ? 'إيقاف البطولة' : 'تفعيل البطولة'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
