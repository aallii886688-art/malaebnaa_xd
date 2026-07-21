'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'

type Facility = {
  id: string; name: string; sport_type: string; city: string; district: string | null
  address: string | null; phone: string | null; description: string | null
  rating: number; reviews_count: number
}

type TimeSlot = {
  id: string; day_of_week: number; start_hour: number; end_hour: number
  price_sar: number; is_available: boolean
}

const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const fmt = (h: number) => `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? 'ص' : 'م'}`

const sportLabel: Record<string, string> = {
  football: '⚽ كرة قدم', futsal: '🥅 فوتسال', padel: '🎾 بادل',
  basketball: '🏀 كرة سلة', volleyball: '🏐 كرة طائرة', tennis: '🎾 تنس',
  squash: '🏸 سكواش', badminton: '🏸 ريشة طائرة', swimming: '🏊 سباحة', other: '🏅 أخرى',
}

export default function FacilityDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [facility, setFacility] = useState<Facility | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)

  useEffect(() => {
    setSelectedDate(new Date().toISOString().split('T')[0])
    const supabase = createClient()
    Promise.all([
      supabase.from('facilities').select('*').eq('id', id).single(),
      supabase.from('facility_time_slots').select('*').eq('facility_id', id).eq('is_available', true).order('day_of_week').order('start_hour'),
    ]).then(([{ data: f }, { data: s }]) => {
      setFacility(f as Facility)
      setSlots((s as TimeSlot[]) ?? [])
      setLoading(false)
    })
  }, [id])

  const dayOfWeek = selectedDate ? new Date(selectedDate + 'T12:00:00').getDay() : -1
  const daySlots = slots.filter((s) => s.day_of_week === dayOfWeek)

  const goToConfirm = () => {
    if (!selectedSlot || !selectedDate) return
    router.push(
      `/player/book/confirm?facility_id=${id}&slot_id=${selectedSlot.id}&date=${selectedDate}`
    )
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#6B7280]">جاري التحميل...</div>
  if (!facility) return <div className="min-h-screen flex items-center justify-center text-red-500">الملعب غير موجود</div>

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="bg-[#0F6E56] text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-white text-xl">←</button>
        <div className="flex-1">
          <p className="text-xs opacity-80">{sportLabel[facility.sport_type]}</p>
          <h1 className="text-base font-bold">{facility.name}</h1>
        </div>
        {facility.reviews_count > 0 && (
          <span className="text-sm font-bold">⭐ {facility.rating}</span>
        )}
      </header>

      {/* مؤشر الخطوات */}
      <div className="bg-white border-b border-[#E8ECEF] px-4 py-3 flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className="w-6 h-6 rounded-full bg-[#0F6E56] text-white text-xs flex items-center justify-center font-bold">✓</span>
          <span className="text-xs text-[#0F6E56] font-medium">الملعب</span>
        </div>
        <div className="flex-1 h-0.5 bg-[#0F6E56]" />
        <div className="flex items-center gap-1.5">
          <span className="w-6 h-6 rounded-full bg-[#0F6E56] text-white text-xs flex items-center justify-center font-bold">2</span>
          <span className="text-xs text-[#0F6E56] font-medium">الوقت</span>
        </div>
        <div className="flex-1 h-0.5 bg-[#E8ECEF]" />
        <div className="flex items-center gap-1.5">
          <span className="w-6 h-6 rounded-full bg-[#E8ECEF] text-[#9CA3AF] text-xs flex items-center justify-center font-bold">3</span>
          <span className="text-xs text-[#9CA3AF]">التأكيد</span>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 pb-32">
        {/* معلومات الملعب */}
        <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4 space-y-2">
          <p className="text-sm text-[#6B7280]">📍 {facility.city}{facility.district ? ` · ${facility.district}` : ''}</p>
          {facility.address && <p className="text-xs text-[#9CA3AF]">{facility.address}</p>}
          {facility.phone && (
            <a href={`tel:+966${facility.phone}`} className="text-xs text-[#0F6E56] flex items-center gap-1">
              📞 <span dir="ltr">+966{facility.phone}</span>
            </a>
          )}
          {facility.description && <p className="text-xs text-[#6B7280] pt-1">{facility.description}</p>}
        </div>

        {/* اختيار التاريخ */}
        <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4">
          <label className="block text-sm font-bold text-[#1A1A1A] mb-2">اختر التاريخ</label>
          <input type="date" value={selectedDate} min={new Date().toISOString().split('T')[0]}
            onChange={(e) => { setSelectedDate(e.target.value); setSelectedSlot(null) }}
            className="w-full border border-[#E8ECEF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56]" />
        </div>

        {/* الأوقات المتاحة */}
        {selectedDate && (
          <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4">
            <p className="text-sm font-bold text-[#1A1A1A] mb-3">
              {days[dayOfWeek]} — الأوقات المتاحة
            </p>
            {daySlots.length === 0 ? (
              <p className="text-sm text-[#9CA3AF] text-center py-4">لا توجد أوقات متاحة في هذا اليوم</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {daySlots.map((s) => (
                  <button key={s.id} onClick={() => setSelectedSlot(selectedSlot?.id === s.id ? null : s)}
                    className={`border-2 rounded-xl p-3 text-center transition-all ${selectedSlot?.id === s.id ? 'border-[#0F6E56] bg-[#E8F5F1]' : 'border-[#E8ECEF]'}`}>
                    <p className="text-xs font-medium text-[#1A1A1A]" dir="ltr">{fmt(s.start_hour)} – {fmt(s.end_hour)}</p>
                    <p className={`text-xs mt-0.5 font-bold ${selectedSlot?.id === s.id ? 'text-[#0F6E56]' : 'text-[#6B7280]'}`}>{s.price_sar} ر</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* زر التالي ثابت في الأسفل */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8ECEF] px-4 py-4">
        {selectedSlot && (
          <p className="text-xs text-[#6B7280] text-center mb-2">
            {fmt(selectedSlot.start_hour)} – {fmt(selectedSlot.end_hour)} · <strong className="text-[#0F6E56]">{selectedSlot.price_sar} ريال</strong>
          </p>
        )}
        <button onClick={goToConfirm} disabled={!selectedSlot}
          className="w-full bg-[#0F6E56] text-white py-3.5 rounded-2xl font-bold text-sm disabled:opacity-40 transition-opacity">
          {selectedSlot ? 'التالي — تأكيد الحجز ←' : 'اختر وقتاً للمتابعة'}
        </button>
      </div>
    </div>
  )
}
