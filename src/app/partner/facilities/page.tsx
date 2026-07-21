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
}

const sportLabel: Record<string, string> = {
  football: '⚽ كرة قدم', futsal: '🥅 فوتسال', padel: '🎾 بادل',
  basketball: '🏀 كرة سلة', volleyball: '🏐 كرة طائرة', tennis: '🎾 تنس',
  squash: '🏸 سكواش', badminton: '🏸 ريشة طائرة', swimming: '🏊 سباحة', other: '🏅 أخرى',
}

export default function PartnerFacilitiesPage() {
  const router = useRouter()
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      supabase.from('facilities').select('*').eq('owner_id', user.id).order('created_at', { ascending: false })
        .then(({ data }) => { setFacilities(data ?? []); setLoading(false) })
    })
  }, [router])

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="bg-[#0F6E56] text-white px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-white text-xl">←</button>
          <div>
            <p className="text-xs opacity-80">الشريك</p>
            <h1 className="text-lg font-bold">ملاعبي</h1>
          </div>
        </div>
        <button onClick={() => router.push('/partner/facilities/new')}
          className="bg-white text-[#0F6E56] text-sm font-bold px-3 py-1.5 rounded-xl">
          + إضافة
        </button>
      </header>

      <div className="px-4 py-4 space-y-3">
        {loading ? (
          <div className="text-center py-10 text-[#6B7280]">جاري التحميل...</div>
        ) : facilities.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-3">🏟️</p>
            <p className="text-sm font-semibold text-[#1A1A1A] mb-1">لا توجد ملاعب بعد</p>
            <p className="text-xs text-[#6B7280] mb-4">أضف ملعبك الأول وابدأ باستقبال الحجوزات</p>
            <button onClick={() => router.push('/partner/facilities/new')}
              className="bg-[#0F6E56] text-white px-5 py-2.5 rounded-xl text-sm font-semibold">
              إضافة ملعب
            </button>
          </div>
        ) : (
          facilities.map((f) => (
            <button key={f.id} onClick={() => router.push(`/partner/facilities/${f.id}`)}
              className="w-full bg-white rounded-2xl border border-[#E8ECEF] p-4 text-right">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-[#1A1A1A]">{f.name}</p>
                  <p className="text-xs text-[#6B7280] mt-0.5">{sportLabel[f.sport_type]}</p>
                  <p className="text-xs text-[#6B7280]">📍 {f.city}</p>
                  {f.reviews_count > 0 && (
                    <p className="text-xs text-[#9CA3AF] mt-1">⭐ {f.rating} ({f.reviews_count} تقييم)</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${f.is_active ? 'bg-[#E8F5F1] text-[#0F6E56]' : 'bg-red-50 text-red-500'}`}>
                    {f.is_active ? 'نشط' : 'موقوف'}
                  </span>
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
