'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Academy = {
  id: string
  name: string
  city: string
  sport_types: string[]
  is_active: boolean
  rating: number
  reviews_count: number
  profiles: { full_name: string } | null
}

export default function AdminAcademiesPage() {
  const router = useRouter()
  const [academies, setAcademies] = useState<Academy[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('academies')
      .select('*, profiles:owner_id(full_name)')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setAcademies((data as Academy[]) ?? []); setLoading(false) })
  }, [])

  const toggleActive = async (id: string, current: boolean) => {
    const supabase = createClient()
    await supabase.from('academies').update({ is_active: !current }).eq('id', id)
    setAcademies((prev) => prev.map((a) => a.id === id ? { ...a, is_active: !current } : a))
  }

  const filtered = academies.filter((a) =>
    a.name.includes(search) || a.city.includes(search)
  )

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="bg-[#0F6E56] text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-white text-xl">←</button>
        <div>
          <p className="text-xs opacity-80">لوحة التحكم</p>
          <h1 className="text-lg font-bold">الأكاديميات</h1>
        </div>
      </header>

      <div className="px-4 py-4 space-y-3">
        <div className="bg-white rounded-xl border border-[#E8ECEF] px-4 py-3 flex items-center gap-2">
          <span className="text-[#6B7280]">🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو المدينة..."
            className="flex-1 text-sm focus:outline-none" />
        </div>

        <p className="text-xs text-[#6B7280]">{filtered.length} أكاديمية</p>

        {loading ? (
          <div className="text-center py-10 text-[#6B7280]">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-[#6B7280]">لا توجد أكاديميات مضافة بعد</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((a) => (
              <div key={a.id} className="bg-white rounded-xl border border-[#E8ECEF] p-4">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <p className="font-semibold text-sm text-[#1A1A1A]">{a.name}</p>
                    <p className="text-xs text-[#6B7280]">📍 {a.city}</p>
                    {a.profiles && <p className="text-xs text-[#9CA3AF]">المالك: {a.profiles.full_name}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${a.is_active ? 'bg-[#E8F5F1] text-[#0F6E56]' : 'bg-red-50 text-red-500'}`}>
                      {a.is_active ? 'نشطة' : 'موقوفة'}
                    </span>
                    {a.reviews_count > 0 && (
                      <span className="text-xs text-[#9CA3AF]">⭐ {a.rating} ({a.reviews_count})</span>
                    )}
                  </div>
                </div>
                <button onClick={() => toggleActive(a.id, a.is_active)}
                  className={`mt-2 w-full text-xs py-1.5 rounded-lg border font-medium ${a.is_active ? 'border-red-300 text-red-500' : 'border-[#0F6E56] text-[#0F6E56]'}`}>
                  {a.is_active ? 'إيقاف الأكاديمية' : 'تفعيل الأكاديمية'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
