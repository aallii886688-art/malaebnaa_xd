'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

type Facility = {
  id: string; name: string; city: string; district: string | null; sport_type: string
}

type TimeSlot = {
  id: string; start_hour: number; end_hour: number; price_sar: number
}

const fmt = (h: number) => `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? 'ص' : 'م'}`

const sportLabel: Record<string, string> = {
  football: '⚽ كرة قدم', futsal: '🥅 فوتسال', padel: '🎾 بادل',
  basketball: '🏀 كرة سلة', volleyball: '🏐 كرة طائرة', tennis: '🎾 تنس',
  squash: '🏸 سكواش', badminton: '🏸 ريشة طائرة', swimming: '🏊 سباحة', other: '🏅 أخرى',
}

function ConfirmContent() {
  const router = useRouter()
  const params = useSearchParams()
  const facilityId = params.get('facility_id')
  const slotId = params.get('slot_id')
  const date = params.get('date')

  const [facility, setFacility] = useState<Facility | null>(null)
  const [slot, setSlot] = useState<TimeSlot | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!facilityId || !slotId || !date) { router.push('/player/facilities'); return }
    const supabase = createClient()
    Promise.all([
      supabase.from('facilities').select('id, name, city, district, sport_type').eq('id', facilityId).single(),
      supabase.from('facility_time_slots').select('id, start_hour, end_hour, price_sar').eq('id', slotId).single(),
    ]).then(([{ data: f }, { data: s }]) => {
      if (!f || !s) { router.push('/player/facilities'); return }
      setFacility(f as Facility)
      setSlot(s as TimeSlot)
      setLoading(false)
    })
  }, [facilityId, slotId, date, router])

  const confirmBooking = async () => {
    if (!facility || !slot || !date) return
    setConfirming(true); setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const commission = Math.round(slot.price_sar * 0.05 * 100) / 100
    const net = slot.price_sar - commission

    const { data, error: err } = await supabase.from('bookings').insert({
      facility_id: facility.id,
      user_id: user.id,
      booking_date: date,
      start_hour: slot.start_hour,
      end_hour: slot.end_hour,
      total_amount_sar: slot.price_sar,
      commission_sar: commission,
      net_amount_sar: net,
      status: 'pending_payment',
    }).select('id').single()

    if (err) { setError('فشل إنشاء الحجز، حاول مجدداً'); setConfirming(false); return }

    router.push(
      `/payment?booking_id=${data?.id}&amount=${slot.price_sar}&facility=${encodeURIComponent(facility.name)}`
    )
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#6B7280]">جاري التحميل...</div>

  const dateObj = date ? new Date(date + 'T12:00:00') : null
  const dateLabel = dateObj?.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="bg-[#0F6E56] text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-white text-xl">←</button>
        <div>
          <p className="text-xs opacity-80">الخطوة الأخيرة</p>
          <h1 className="text-base font-bold">تأكيد الحجز</h1>
        </div>
      </header>

      {/* مؤشر الخطوات */}
      <div className="bg-white border-b border-[#E8ECEF] px-4 py-3 flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className="w-6 h-6 rounded-full bg-[#0F6E56] text-white text-xs flex items-center justify-center font-bold">✓</span>
          <span className="text-xs text-[#0F6E56] font-medium">الملعب</span>
        </div>
        <div className="flex-1 h-0.5 bg-[#0F6E56]" />
        <div className="flex items-center gap-1.5">
          <span className="w-6 h-6 rounded-full bg-[#0F6E56] text-white text-xs flex items-center justify-center font-bold">✓</span>
          <span className="text-xs text-[#0F6E56] font-medium">الوقت</span>
        </div>
        <div className="flex-1 h-0.5 bg-[#0F6E56]" />
        <div className="flex items-center gap-1.5">
          <span className="w-6 h-6 rounded-full bg-[#0F6E56] text-white text-xs flex items-center justify-center font-bold">3</span>
          <span className="text-xs text-[#0F6E56] font-medium">التأكيد</span>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4 pb-32">
        {/* بطاقة ملخص الحجز */}
        <div className="bg-white rounded-2xl border border-[#E8ECEF] overflow-hidden">
          <div className="bg-[#0F6E56] px-4 py-3">
            <p className="text-white text-xs opacity-80">ملخص حجزك</p>
            <p className="text-white font-bold">{facility?.name}</p>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#6B7280]">النشاط</span>
              <span className="text-xs font-medium text-[#1A1A1A]">{sportLabel[facility?.sport_type ?? '']}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#6B7280]">الموقع</span>
              <span className="text-xs font-medium text-[#1A1A1A]">{facility?.city}{facility?.district ? ` · ${facility.district}` : ''}</span>
            </div>
            <div className="h-px bg-[#F8F9FA]" />
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#6B7280]">التاريخ</span>
              <span className="text-xs font-medium text-[#1A1A1A]">{dateLabel}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#6B7280]">الوقت</span>
              <span className="text-xs font-medium text-[#1A1A1A]" dir="ltr">
                {slot ? `${fmt(slot.start_hour)} – ${fmt(slot.end_hour)}` : ''}
              </span>
            </div>
            <div className="h-px bg-[#F8F9FA]" />
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-[#1A1A1A]">الإجمالي</span>
              <span className="text-lg font-bold text-[#0F6E56]">{slot?.price_sar} ريال</span>
            </div>
          </div>
        </div>

        {/* تنبيه الدفع */}
        <div className="bg-[#FFF8E8] border border-[#C17B1A] rounded-2xl p-4 flex gap-3">
          <span className="text-xl">⚡</span>
          <div>
            <p className="text-xs font-bold text-[#C17B1A]">الدفع قيد الإعداد</p>
            <p className="text-xs text-[#6B7280] mt-0.5">سيُفعَّل الدفع الإلكتروني قريباً. يمكنك تأكيد الحجز والدفع عند الوصول.</p>
          </div>
        </div>

        {/* سياسة الإلغاء */}
        <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4 space-y-1.5">
          <p className="text-xs font-bold text-[#1A1A1A]">سياسة الإلغاء</p>
          <p className="text-xs text-[#6B7280]">• يمكن إلغاء الحجز قبل 24 ساعة من الموعد</p>
          <p className="text-xs text-[#6B7280]">• بعد تأكيد الحجز سيُرسل لك إشعار عبر واتساب</p>
        </div>

        {error && <p className="text-red-500 text-xs text-center">{error}</p>}
      </div>

      {/* أزرار ثابتة */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8ECEF] px-4 py-4 space-y-2">
        <button onClick={confirmBooking} disabled={confirming}
          className="w-full bg-[#0F6E56] text-white py-3.5 rounded-2xl font-bold text-sm disabled:opacity-50">
          {confirming ? 'جاري التأكيد...' : `✓ تأكيد الحجز — ${slot?.price_sar} ريال`}
        </button>
        <button onClick={() => router.back()}
          className="w-full border border-[#E8ECEF] text-[#6B7280] py-3 rounded-2xl text-sm">
          تعديل الوقت
        </button>
      </div>
    </div>
  )
}

export default function ConfirmBookingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-[#6B7280]">جاري التحميل...</div>}>
      <ConfirmContent />
    </Suspense>
  )
}
