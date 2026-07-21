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
    const supabase = createClient()
    let q = supabase.from('facilities').select('*').eq('is_active', true).order('rating', { ascending: false })
    if (sport) q = q.eq('sport_type', sport)
    q.then(({ data }) => { setFacilities(data ?? []); setLoading(false) })
  }, [sport])

  const filtered = facilities.filter((f) =>
    !search || f.name.includes(search) || f.city.includes(search)
  )

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="bg-[#0F6E56] text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-white text-xl">←</button>
        <div>
          <p className="text-xs opacity-80">استكشاف</p>
          <h1 className="text-lg font-bold">الملاعب</h1>
        </div>
      </header>

      {/* Search */}
      <div className="px-4 pt-3">
        <div className="bg-white rounded-xl border border-[#E8ECEF] px-4 py-3 flex items-center gap-2">
          <span className="text-[#6B7280]">🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن ملعب أو مدينة..."
            className="flex-1 text-sm focus:outline-none" />
        </div>
      </div>

      {/* Sport filter */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto">
        {sportOptions.map((s) => (
          <button key={s.value} onClick={() => { setSport(s.value); setLoading(true) }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${sport === s.value ? 'bg-[#0F6E56] text-white' : 'bg-white border border-[#E8ECEF] text-[#6B7280]'}`}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="px-4 pb-6 space-y-3">
        {loading ? (
          <div className="text-center py-10 text-[#6B7280]">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-2">🏟️</p>
            <p className="text-sm text-[#6B7280]">لا توجد ملاعب متاحة</p>
          </div>
        ) : (
          filtered.map((f) => (
            <button key={f.id} onClick={() => router.push(`/player/facilities/${f.id}`)}
              className="w-full bg-white rounded-2xl border border-[#E8ECEF] p-4 text-right">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-bold text-[#1A1A1A]">{f.name}</p>
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
