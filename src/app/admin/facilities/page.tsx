'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Facility = {
  id: string
  name: string
  sport_type: string
  city: string
  is_active: boolean
  rating: number
  reviews_count: number
  created_at: string
  profiles: { full_name: string } | null
}

const sportLabel: Record<string, string> = {
  football: '⚽ كرة قدم',
  futsal: '🥅 فوتسال',
  padel: '🎾 بادل',
  basketball: '🏀 كرة سلة',
  volleyball: '🏐 كرة طائرة',
  tennis: '🎾 تنس',
  squash: '🏸 سكواش',
  badminton: '🏸 ريشة طائرة',
  swimming: '🏊 سباحة',
  other: '🏅 أخرى',
}

export default function AdminFacilitiesPage() {
  const router = useRouter()
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('facilities')
      .select('*, profiles:owner_id(full_name)')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setFacilities((data as Facility[]) ?? []); setLoading(false) })
  }, [])

  const toggleActive = async (id: string, current: boolean) => {
    const supabase = createClient()
    await supabase.from('facilities').update({ is_active: !current }).eq('id', id)
    setFacilities((prev) => prev.map((f) => f.id === id ? { ...f, is_active: !current } : f))
  }

  const filtered = facilities.filter((f) =>
    f.name.includes(search) || f.city.includes(search)
  )

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="bg-[#0F6E56] text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-white text-xl">←</button>
        <div>
          <p className="text-xs opacity-80">لوحة التحكم</p>
          <h1 className="text-lg font-bold">الملاعب</h1>
        </div>
      </header>

      <div className="px-4 py-4 space-y-3">
        <div className="bg-white rounded-xl border border-[#E8ECEF] px-4 py-3 flex items-center gap-2">
          <span className="text-[#6B7280]">🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو المدينة..."
            className="flex-1 text-sm focus:outline-none" />
        </div>

        <p className="text-xs text-[#6B7280]">{filtered.length} ملعب</p>

        {loading ? (
          <div className="text-center py-10 text-[#6B7280]">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-[#6B7280]">لا توجد ملاعب مضافة بعد</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((f) => (
              <div key={f.id} className="bg-white rounded-xl border border-[#E8ECEF] p-4">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <p className="font-semibold text-sm text-[#1A1A1A]">{f.name}</p>
                    <p className="text-xs text-[#6B7280]">{sportLabel[f.sport_type] ?? f.sport_type}</p>
                    <p className="text-xs text-[#6B7280]">📍 {f.city}</p>
                    {f.profiles && <p className="text-xs text-[#9CA3AF]">المالك: {f.profiles.full_name}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${f.is_active ? 'bg-[#E8F5F1] text-[#0F6E56]' : 'bg-red-50 text-red-500'}`}>
                      {f.is_active ? 'نشط' : 'موقوف'}
                    </span>
                    {f.reviews_count > 0 && (
                      <span className="text-xs text-[#9CA3AF]">⭐ {f.rating} ({f.reviews_count})</span>
                    )}
                  </div>
                </div>

                <button onClick={() => toggleActive(f.id, f.is_active)}
                  className={`mt-2 w-full text-xs py-1.5 rounded-lg border font-medium ${f.is_active ? 'border-red-300 text-red-500' : 'border-[#0F6E56] text-[#0F6E56]'}`}>
                  {f.is_active ? 'إيقاف الملعب' : 'تفعيل الملعب'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
