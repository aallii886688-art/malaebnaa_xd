'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Academy = { id: string; name: string; city: string; sport_types: string[]; rating: number; reviews_count: number; description: string | null }

const sportLabel: Record<string, string> = {
  football: '⚽', futsal: '🥅', padel: '🎾', basketball: '🏀',
  volleyball: '🏐', tennis: '🎾', squash: '🏸', swimming: '🏊', other: '🏅',
}

export default function PlayerAcademiesPage() {
  const router = useRouter()
  const [academies, setAcademies] = useState<Academy[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.from('academies').select('*').eq('is_active', true).order('rating', { ascending: false })
      .then(({ data }) => { setAcademies(data ?? []); setLoading(false) })
  }, [])

  const filtered = academies.filter((a) => !search || a.name.includes(search) || a.city.includes(search))

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="bg-[#0F6E56] text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-xl">←</button>
        <div><p className="text-xs opacity-80">استكشاف</p><h1 className="text-lg font-bold">الأكاديميات</h1></div>
      </header>

      <div className="px-4 pt-3">
        <div className="bg-white rounded-xl border border-[#E8ECEF] px-4 py-3 flex items-center gap-2">
          <span className="text-[#6B7280]">🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن أكاديمية..." className="flex-1 text-sm focus:outline-none" />
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {loading ? <div className="text-center py-10 text-[#6B7280]">جاري التحميل...</div>
          : filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-5xl mb-2">🏅</p>
              <p className="text-sm text-[#6B7280]">لا توجد أكاديميات متاحة</p>
            </div>
          ) : filtered.map((a) => (
            <button key={a.id} onClick={() => router.push(`/player/academies/${a.id}`)}
              className="w-full bg-white rounded-2xl border border-[#E8ECEF] p-4 text-right">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-bold text-[#1A1A1A]">{a.name}</p>
                  <p className="text-xs text-[#6B7280] mt-0.5">{a.sport_types.map((s) => sportLabel[s]).join(' ')}</p>
                  <p className="text-xs text-[#6B7280]">📍 {a.city}</p>
                  {a.description && <p className="text-xs text-[#9CA3AF] mt-1 line-clamp-1">{a.description}</p>}
                </div>
                <div className="flex flex-col items-end gap-2 mr-2">
                  {a.reviews_count > 0 && <span className="text-xs font-medium text-[#C17B1A]">⭐ {a.rating}</span>}
                  <span className="text-[#9CA3AF] text-sm">←</span>
                </div>
              </div>
            </button>
          ))}
      </div>
    </div>
  )
}
