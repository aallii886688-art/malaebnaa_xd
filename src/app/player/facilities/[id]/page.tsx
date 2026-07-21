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

  // booking state
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [booking, setBooking] = useState(false)
  const [bookingDone, setBookingDone] = useState(false)
  const [bookingError, setBookingError] = useState('')

  useEffect(() => {
    // default to today
    const today = new Date()
    setSelectedDate(today.toISOString().split('T')[0])

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

  const confirmBooking = async () => {
    if (!selectedSlot || !selectedDate) return
    setBooking(true); setBookingError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const commission = Math.round(selectedSlot.price_sar * 0.05 * 100) / 100
    const net = selectedSlot.price_sar - commission

    const { data, error } = await supabase.from('bookings').insert({
      facility_id: id,
      user_id: user.id,
      booking_date: selectedDate,
      start_hour: selectedSlot.start_hour,
      end_hour: selectedSlot.end_hour,
      total_amount_sar: selectedSlot.price_sar,
      commission_sar: commission,
      net_amount_sar: net,
      status: 'pending_payment',
    }).select('id').single()

    if (error) { setBookingError(error.message); setBooking(false); return }
    // توجيه لصفحة الدفع
    router.push(`/payment?booking_id=${data?.id}&amount=${selectedSlot.price_sar}&facility=${encodeURIComponent(facility!.name)}`)
    setBooking(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#6B7280]">جاري التحميل...</div>
  if (!facility) return <div className="min-h-screen flex items-center justify-center text-red-500">الملعب غير موجود</div>

  if (bookingDone) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-[#F8F9FA]">
      <div className="text-6xl mb-4">✅</div>
      <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">تم الحجز بنجاح!</h2>
      <p className="text-sm text-[#6B7280] mb-1">{facility.name}</p>
      <p className="text-sm text-[#6B7280] mb-1">{new Date(selectedDate + 'T12:00:00').toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <p className="text-sm text-[#6B7280] mb-6">{fmt(selectedSlot!.start_hour)} – {fmt(selectedSlot!.end_hour)}</p>
      <p className="text-lg font-bold text-[#0F6E56] mb-6">{selectedSlot!.price_sar} ريال</p>
      <p className="text-xs text-[#9CA3AF] mb-6">سيتم التأكيد بعد إتمام الدفع</p>
      <button onClick={() => router.push('/player')}
        className="bg-[#0F6E56] text-white px-6 py-3 rounded-2xl font-bold">
        العودة للرئيسية
      </button>
    </div>
  )

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

      <div className="px-4 py-4 space-y-4 pb-10">
        {/* Info card */}
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

        {/* Date picker */}
        <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4">
          <label className="block text-sm font-bold text-[#1A1A1A] mb-2">اختر التاريخ</label>
          <input type="date" value={selectedDate} min={new Date().toISOString().split('T')[0]}
            onChange={(e) => { setSelectedDate(e.target.value); setSelectedSlot(null) }}
            className="w-full border border-[#E8ECEF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56]" />
        </div>

        {/* Time slots */}
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

        {/* Booking summary + confirm */}
        {selectedSlot && (
          <div className="bg-[#E8F5F1] rounded-2xl border border-[#0F6E56] p-4 space-y-2">
            <p className="text-sm font-bold text-[#0F6E56]">ملخص الحجز</p>
            <div className="flex justify-between text-xs text-[#1A1A1A]">
              <span>التاريخ</span>
              <span>{new Date(selectedDate + 'T12:00:00').toLocaleDateString('ar-SA')}</span>
            </div>
            <div className="flex justify-between text-xs text-[#1A1A1A]">
              <span>الوقت</span>
              <span dir="ltr">{fmt(selectedSlot.start_hour)} – {fmt(selectedSlot.end_hour)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-[#1A1A1A] pt-1 border-t border-[#0F6E56]/20">
              <span>الإجمالي</span>
              <span>{selectedSlot.price_sar} ريال</span>
            </div>
          </div>
        )}

        {bookingError && <p className="text-red-500 text-xs text-center">{bookingError}</p>}

        <button onClick={confirmBooking} disabled={!selectedSlot || booking}
          className="w-full bg-[#0F6E56] text-white py-3.5 rounded-2xl font-bold text-sm disabled:opacity-40">
          {booking ? 'جاري الحجز...' : selectedSlot ? `احجز الآن — ${selectedSlot.price_sar} ريال` : 'اختر وقتاً للحجز'}
        </button>
      </div>
    </div>
  )
}
