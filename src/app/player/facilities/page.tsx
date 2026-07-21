'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Facility = {
  id: string; name: string; sport_type: string; city: string; district: string | null
  description: string | null; rating: number; reviews_count: number; is_active: boolean
}

const sportOptions = [
  { value: '', label: 'الكل' },
  { value: 'football', label: '⚽ قدم' },
  { value: 'futsal', label: '🥅 فوتسال' },
  { value: 'padel', label: '🎾 بادل' },
  { value: 'basketball', label: '🏀 سلة' },
  { value: 'volleyball', label: '🏐 طائرة' },
  { value: 'tennis', label: '🎾 تنس' },
]

const sportLabel: Record<string, string> = {
  football: '⚽ كرة قدم', futsal: '🥅 فوتسال', padel: '🎾 بادل',
  basketball: '🏀 كرة سلة', volleyball: '🏐 كرة طائرة', tennis: '🎾 تنس',
  squash: '🏸 سكواش', badminton: '🏸 ريشة طائرة', swimming: '🏊 سباحة', other: '🏅 أخرى',
}

export default function PlayerFacilitiesPage() {
  const router = useRouter()
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sport, setSport] = useState('')

  useEffect(() => {
    setLoading(true)
    const supabase = createClient()
    let q = supabase.from('facilities').select('*').eq('is_active', true).order('rating', { ascending: false })
    if (sport) q = q.eq('sport_type', sport)
    q.then(({ data }) => { setFacilities(data ?? []); setLoading(false) })
  }, [sport])

  const filtered = facilities.filter((f) =>
    !search || f.name.includes(search) || f.city.includes(search) || (f.district ?? '').includes(search)
  )

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="bg-[#0F6E56] text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-white text-xl">←</button>
        <div className="flex-1">
          <p className="text-xs opacity-80">الخطوة 1 من 3</p>
          <h1 className="text-lg font-bold">اختر الملعب</h1>
        </div>
      </header>

      {/* شريط البحث */}
      <div className="px-4 pt-3">
        <div className="bg-white rounded-xl border border-[#E8ECEF] px-4 py-3 flex items-center gap-2">
          <span className="text-[#6B7280]">🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم الملعب أو المدينة..."
            className="flex-1 text-sm focus:outline-none" />
          {search && (
            <button onClick={() => setSearch('')} className="text-[#9CA3AF] text-sm">✕</button>
          )}
        </div>
      </div>

      {/* فلتر الرياضة */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
        {sportOptions.map((s) => (
          <button key={s.value} onClick={() => setSport(s.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              sport === s.value ? 'bg-[#0F6E56] text-white' : 'bg-white border border-[#E8ECEF] text-[#6B7280]'
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="px-4 pb-6 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-[#E8ECEF] p-4 animate-pulse">
                <div className="h-4 bg-[#E8ECEF] rounded w-2/3 mb-2" />
                <div className="h-3 bg-[#E8ECEF] rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-3">🏟️</p>
            <p className="text-sm font-semibold text-[#1A1A1A] mb-1">لا توجد ملاعب</p>
            <p className="text-xs text-[#6B7280]">
              {search ? `لا توجد نتائج لـ "${search}"` : 'لا توجد ملاعب متاحة حالياً'}
            </p>
            {search && (
              <button onClick={() => setSearch('')} className="mt-3 text-xs text-[#0F6E56] underline">
                مسح البحث
              </button>
            )}
          </div>
        ) : (
          filtered.map((f) => (
            <button key={f.id} onClick={() => router.push(`/player/facilities/${f.id}`)}
              className="w-full bg-white rounded-2xl border border-[#E8ECEF] p-4 text-right hover:border-[#0F6E56] transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-bold text-[#1A1A1A] text-sm">{f.name}</p>
                  <p className="text-xs text-[#6B7280] mt-0.5">{sportLabel[f.sport_type]}</p>
                  <p className="text-xs text-[#6B7280]">📍 {f.city}{f.district ? ` · ${f.district}` : ''}</p>
                  {f.description && (
                    <p className="text-xs text-[#9CA3AF] mt-1 line-clamp-1">{f.description}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 mr-2">
                  {f.reviews_count > 0 && (
                    <span className="text-xs font-medium text-[#C17B1A]">⭐ {f.rating}</span>
                  )}
                  <span className="text-[#9CA3AF] text-sm">←</span>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
