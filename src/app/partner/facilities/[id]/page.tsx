'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'

type Facility = {
  id: string; name: string; sport_type: string; city: string; district: string | null
  address: string | null; phone: string | null; description: string | null; is_active: boolean
}

type TimeSlot = {
  id: string; day_of_week: number; start_hour: number; end_hour: number
  price_sar: number; is_available: boolean
}

const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

const fmt = (h: number) => `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? 'ص' : 'م'}`

export default function FacilityManagePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [facility, setFacility] = useState<Facility | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'info' | 'slots'>('info')

  // slot form
  const [showSlotForm, setShowSlotForm] = useState(false)
  const [slotForm, setSlotForm] = useState({ day: 0, start: 8, end: 10, price: '' })
  const [slotSaving, setSlotSaving] = useState(false)
  const [slotError, setSlotError] = useState('')

  const load = async () => {
    const supabase = createClient()
    const [{ data: f }, { data: s }] = await Promise.all([
      supabase.from('facilities').select('*').eq('id', id).single(),
      supabase.from('facility_time_slots').select('*').eq('facility_id', id).order('day_of_week').order('start_hour'),
    ])
    setFacility(f as Facility)
    setSlots((s as TimeSlot[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const toggleActive = async () => {
    if (!facility) return
    const supabase = createClient()
    await supabase.from('facilities').update({ is_active: !facility.is_active }).eq('id', id)
    setFacility((f) => f ? { ...f, is_active: !f.is_active } : f)
  }

  const addSlot = async () => {
    if (!slotForm.price || +slotForm.price <= 0) { setSlotError('السعر مطلوب'); return }
    if (slotForm.end <= slotForm.start) { setSlotError('وقت الانتهاء يجب أن يكون بعد البداية'); return }
    setSlotSaving(true); setSlotError('')
    const supabase = createClient()
    const { error } = await supabase.from('facility_time_slots').insert({
      facility_id: id,
      day_of_week: slotForm.day,
      start_hour: slotForm.start,
      end_hour: slotForm.end,
      price_sar: +slotForm.price,
    })
    if (error) { setSlotError(error.message); setSlotSaving(false); return }
    setShowSlotForm(false)
    setSlotForm({ day: 0, start: 8, end: 10, price: '' })
    await load()
    setSlotSaving(false)
  }

  const deleteSlot = async (slotId: string) => {
    const supabase = createClient()
    await supabase.from('facility_time_slots').delete().eq('id', slotId)
    setSlots((s) => s.filter((x) => x.id !== slotId))
  }

  const toggleSlotAvail = async (slotId: string, current: boolean) => {
    const supabase = createClient()
    await supabase.from('facility_time_slots').update({ is_available: !current }).eq('id', slotId)
    setSlots((s) => s.map((x) => x.id === slotId ? { ...x, is_available: !current } : x))
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#6B7280]">جاري التحميل...</div>
  if (!facility) return <div className="min-h-screen flex items-center justify-center text-red-500">الملعب غير موجود</div>

  const slotsByDay = days.map((_, d) => ({ day: d, slots: slots.filter((s) => s.day_of_week === d) }))

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="bg-[#0F6E56] text-white px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-white text-xl">←</button>
          <div>
            <p className="text-xs opacity-80">إدارة الملعب</p>
            <h1 className="text-base font-bold">{facility.name}</h1>
          </div>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${facility.is_active ? 'bg-white/20 text-white' : 'bg-red-400/30 text-red-100'}`}>
          {facility.is_active ? '🟢 نشط' : '🔴 موقوف'}
        </span>
      </header>

      {/* Tabs */}
      <div className="flex bg-white border-b border-[#E8ECEF]">
        {(['info', 'slots'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-medium ${tab === t ? 'text-[#0F6E56] border-b-2 border-[#0F6E56]' : 'text-[#6B7280]'}`}>
            {t === 'info' ? '📋 المعلومات' : '🕐 الأوقات والأسعار'}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 pb-10 space-y-3">
        {tab === 'info' ? (
          <>
            <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4 space-y-3">
              {[
                { label: 'المدينة', value: facility.city },
                { label: 'الحي', value: facility.district },
                { label: 'العنوان', value: facility.address },
                { label: 'الجوال', value: facility.phone, ltr: true },
                { label: 'الوصف', value: facility.description },
              ].map(({ label, value, ltr }) => value ? (
                <div key={label}>
                  <p className="text-xs text-[#9CA3AF]">{label}</p>
                  <p className="text-sm text-[#1A1A1A] mt-0.5" dir={ltr ? 'ltr' : undefined}>{value}</p>
                </div>
              ) : null)}
            </div>

            <button onClick={toggleActive}
              className={`w-full py-3 rounded-2xl font-semibold text-sm border ${facility.is_active ? 'border-red-300 text-red-500' : 'border-[#0F6E56] text-[#0F6E56]'}`}>
              {facility.is_active ? '⏸ إيقاف الملعب مؤقتاً' : '▶ تفعيل الملعب'}
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#6B7280]">{slots.length} وقت مضاف</p>
              <button onClick={() => setShowSlotForm(true)}
                className="text-xs bg-[#0F6E56] text-white px-3 py-1.5 rounded-xl font-medium">
                + إضافة وقت
              </button>
            </div>

            {slots.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-4xl mb-2">🕐</p>
                <p className="text-sm text-[#6B7280]">لم تضف أوقات بعد</p>
                <button onClick={() => setShowSlotForm(true)}
                  className="mt-3 bg-[#0F6E56] text-white px-4 py-2 rounded-xl text-sm">
                  أضف أول وقت
                </button>
              </div>
            ) : (
              slotsByDay.filter((d) => d.slots.length > 0).map(({ day, slots: daySlots }) => (
                <div key={day} className="bg-white rounded-2xl border border-[#E8ECEF] p-4">
                  <p className="text-sm font-bold text-[#1A1A1A] mb-3">{days[day]}</p>
                  <div className="space-y-2">
                    {daySlots.map((s) => (
                      <div key={s.id} className="flex items-center justify-between border border-[#E8ECEF] rounded-xl px-3 py-2">
                        <div>
                          <p className="text-xs font-medium text-[#1A1A1A]" dir="ltr">{fmt(s.start_hour)} – {fmt(s.end_hour)}</p>
                          <p className="text-xs text-[#0F6E56]">{s.price_sar} ريال</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => toggleSlotAvail(s.id, s.is_available)}
                            className={`text-[10px] px-2 py-0.5 rounded-full ${s.is_available ? 'bg-[#E8F5F1] text-[#0F6E56]' : 'bg-gray-100 text-gray-400'}`}>
                            {s.is_available ? 'متاح' : 'مغلق'}
                          </button>
                          <button onClick={() => deleteSlot(s.id)} className="text-red-400 text-xs">🗑</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>

      {/* Add slot sheet */}
      {showSlotForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => setShowSlotForm(false)}>
          <div className="bg-white rounded-t-2xl p-5 w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-[#1A1A1A] mb-4">إضافة وقت حجز</h3>

            <label className="block text-xs font-medium text-[#1A1A1A] mb-1">اليوم</label>
            <select value={slotForm.day} onChange={(e) => setSlotForm((f) => ({ ...f, day: +e.target.value }))}
              className="w-full border border-[#E8ECEF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56] mb-3">
              {days.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-[#1A1A1A] mb-1">وقت البداية</label>
                <select value={slotForm.start} onChange={(e) => setSlotForm((f) => ({ ...f, start: +e.target.value }))}
                  className="w-full border border-[#E8ECEF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56]">
                  {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{fmt(i)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#1A1A1A] mb-1">وقت الانتهاء</label>
                <select value={slotForm.end} onChange={(e) => setSlotForm((f) => ({ ...f, end: +e.target.value }))}
                  className="w-full border border-[#E8ECEF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56]">
                  {Array.from({ length: 24 }, (_, i) => i + 1).map((i) => <option key={i} value={i}>{fmt(i)}</option>)}
                </select>
              </div>
            </div>

            <label className="block text-xs font-medium text-[#1A1A1A] mb-1">السعر (ريال)</label>
            <input type="number" value={slotForm.price} onChange={(e) => setSlotForm((f) => ({ ...f, price: e.target.value }))}
              placeholder="مثال: 150"
              className="w-full border border-[#E8ECEF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56] mb-4" />

            {slotError && <p className="text-red-500 text-xs mb-3">{slotError}</p>}

            <div className="flex gap-2">
              <button onClick={addSlot} disabled={slotSaving}
                className="flex-1 bg-[#0F6E56] text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50">
                {slotSaving ? 'جاري الحفظ...' : 'إضافة'}
              </button>
              <button onClick={() => { setShowSlotForm(false); setSlotError('') }}
                className="flex-1 border border-[#E8ECEF] py-2.5 rounded-xl text-sm">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
