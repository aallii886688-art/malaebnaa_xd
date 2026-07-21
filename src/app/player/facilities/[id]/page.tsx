'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'

type Facility = {
  id: string; name: string; sport_type: string; city: string; district: string | null
  address: string | null; phone: string | null; description: string | null
  rating: number; reviews_count: number
}
type TimeSlot = { id: string; day_of_week: number; start_hour: number; end_hour: number; price_sar: number }

const fmt = (h: number) => `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? 'ص' : 'م'}`
const sportGradient: Record<string, string> = {
  football:'linear-gradient(135deg,#1a4d2e,#2d7a4f)', futsal:'linear-gradient(135deg,#1a3a5c,#2d6a9f)',
  padel:'linear-gradient(135deg,#4d1a1a,#9f2d2d)', basketball:'linear-gradient(135deg,#4d2e1a,#9f5a2d)',
  default:'linear-gradient(135deg,#1a2d4d,#2d4d7a)',
}
const sportEmoji: Record<string, string> = {
  football:'⚽', futsal:'🥅', padel:'🎾', basketball:'🏀', volleyball:'🏐', tennis:'🎾', squash:'🏸', swimming:'🏊', other:'🏅',
}

function getNext7Days() {
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(); d.setDate(d.getDate() + i)
    days.push(d)
  }
  return days
}

const dayNames = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']
const dayNamesShort = ['أحد','اثن','ثلا','أرب','خمس','جمع','سبت']

export default function FacilityDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [facility, setFacility] = useState<Facility | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [days] = useState(getNext7Days)
  const [selectedDay, setSelectedDay] = useState(0)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [discountCode, setDiscountCode] = useState('')
  const [showDiscount, setShowDiscount] = useState(false)

  useEffect(() => {
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

  const dayOfWeek = days[selectedDay]?.getDay() ?? 0
  const daySlots = slots.filter((s) => s.day_of_week === dayOfWeek)
  const selectedDate = days[selectedDay]?.toISOString().split('T')[0] ?? ''

  const goConfirm = () => {
    if (!selectedSlot) return
    router.push(`/player/book/confirm?facility_id=${id}&slot_id=${selectedSlot.id}&date=${selectedDate}`)
  }

  if (loading) return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--text3)', fontSize: 14 }}>جاري التحميل...</div>
    </div>
  )
  if (!facility) return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--danger)' }}>الملعب غير موجود</p>
    </div>
  )

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: 140 }}>
      {/* Hero */}
      <div style={{ height: 220, background: sportGradient[facility.sport_type] ?? sportGradient.default, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 64, opacity: 0.8 }}>{sportEmoji[facility.sport_type] ?? '🏅'}</span>
        {/* Back */}
        <button onClick={() => router.back()}
          style={{ position: 'absolute', top: 48, right: 16, width: 36, height: 36, borderRadius: 18, background: 'rgba(0,0,0,0.35)', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          ←
        </button>
        {/* Title header */}
        <div style={{ position: 'absolute', top: 44, left: 0, right: 0, textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>حجز ملعب</p>
        </div>
        {/* Rating */}
        {facility.reviews_count > 0 && (
          <div style={{ position: 'absolute', bottom: 16, left: 16, background: 'rgba(0,0,0,0.45)', borderRadius: 20, padding: '4px 10px', color: '#fff', fontSize: 13, fontWeight: 600 }}>
            ⭐ {facility.rating} ({facility.reviews_count})
          </div>
        )}
      </div>

      {/* Info card */}
      <div style={{ margin: '-20px 16px 0', background: 'var(--card)', borderRadius: 20, padding: '18px', position: 'relative', zIndex: 10, boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)' }}>
        <h1 style={{ color: 'var(--text)', fontWeight: 700, fontSize: 20, marginBottom: 8 }}>{facility.name}</h1>
        <p style={{ color: 'var(--text3)', fontSize: 13 }}>📍 {facility.city}{facility.district ? ` · ${facility.district}` : ''}</p>
        {facility.address && <p style={{ color: 'var(--text3)', fontSize: 12, marginTop: 3 }}>{facility.address}</p>}
        {facility.phone && (
          <a href={`tel:+966${facility.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--primary)', fontSize: 13, marginTop: 6 }}>
            📞 <span dir="ltr">+966{facility.phone}</span>
          </a>
        )}
        {facility.description && (
          <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>{facility.description}</p>
        )}
      </div>

      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {[{ n: 1, l: 'الملعب', done: true }, { n: 2, l: 'الوقت', done: false }, { n: 3, l: 'التأكيد', done: false }].map((s, i) => (
            <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: i < 2 ? 1 : 'unset' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 22, height: 22, borderRadius: 11, background: s.done || s.n === 2 ? 'var(--primary)' : 'var(--card2)', border: `1.5px solid ${s.done || s.n === 2 ? 'var(--primary)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: s.done || s.n === 2 ? '#fff' : 'var(--text3)', fontWeight: 700 }}>
                  {s.done ? '✓' : s.n}
                </div>
                <span style={{ fontSize: 11, color: s.done || s.n === 2 ? 'var(--primary)' : 'var(--text3)', fontWeight: 600 }}>{s.l}</span>
              </div>
              {i < 2 && <div style={{ flex: 1, height: 1.5, background: s.done ? 'var(--primary)' : 'var(--border)' }} />}
            </div>
          ))}
        </div>

        {/* Date strip */}
        <div>
          <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: 14, marginBottom: 10 }}>📅 اختر اليوم</p>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }} className="no-scrollbar">
            {days.map((d, i) => {
              const active = selectedDay === i
              return (
                <button key={i} onClick={() => { setSelectedDay(i); setSelectedSlot(null) }}
                  style={{ flexShrink: 0, width: 56, padding: '10px 0', borderRadius: 14, background: active ? 'var(--primary)' : 'var(--card)', border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }} className="press">
                  <span style={{ fontSize: 11, color: active ? '#fff' : 'var(--text3)', fontWeight: 500 }}>{dayNamesShort[d.getDay()]}</span>
                  <span style={{ fontSize: 19, fontWeight: 700, color: active ? '#fff' : 'var(--text)' }}>{d.getDate()}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Time slots */}
        <div>
          <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: 14, marginBottom: 10 }}>
            🕐 اختر الوقت المتاح <span style={{ color: 'var(--text3)', fontWeight: 400, fontSize: 12 }}>(كل خانة = ساعة واحدة)</span>
          </p>
          {daySlots.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)' }}>
              <p style={{ color: 'var(--text3)', fontSize: 14 }}>لا توجد أوقات متاحة {dayNames[dayOfWeek]}</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {daySlots.map((s) => {
                const active = selectedSlot?.id === s.id
                return (
                  <button key={s.id} onClick={() => setSelectedSlot(active ? null : s)} className="press"
                    style={{ padding: '14px 12px', borderRadius: 14, border: `2px solid ${active ? 'var(--primary)' : 'var(--border)'}`, background: active ? 'var(--primary-dim)' : 'var(--card)', cursor: 'pointer', textAlign: 'center' }}>
                    <p style={{ color: active ? 'var(--primary)' : 'var(--text)', fontWeight: 600, fontSize: 14 }} dir="ltr">{fmt(s.start_hour)} – {fmt(s.end_hour)}</p>
                    <p style={{ color: active ? 'var(--primary)' : 'var(--text3)', fontSize: 12, marginTop: 3 }}>{s.price_sar} ريال</p>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Payment method */}
        <div>
          <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: 14, marginBottom: 10 }}>💳 طريقة الدفع</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="press" style={{ padding: '16px', borderRadius: 14, border: '2px solid var(--primary)', background: 'var(--primary-dim)', textAlign: 'center', cursor: 'pointer' }}>
              <span style={{ fontSize: 22 }}>🧑</span>
              <p style={{ color: 'var(--primary)', fontWeight: 600, fontSize: 13, marginTop: 4 }}>أدفع كامل المبلغ</p>
            </div>
            <div className="press" style={{ padding: '16px', borderRadius: 14, border: '1.5px solid var(--border)', background: 'var(--card)', textAlign: 'center', cursor: 'pointer', opacity: 0.6 }}>
              <span style={{ fontSize: 22 }}>💛</span>
              <p style={{ color: 'var(--text3)', fontWeight: 600, fontSize: 13, marginTop: 4 }}>قطة مع أصحابي</p>
              <span style={{ fontSize: 10, color: 'var(--gold)', background: 'var(--gold-dim)', padding: '2px 6px', borderRadius: 8 }}>قريباً</span>
            </div>
          </div>
        </div>

        {/* Discount code */}
        <div>
          <button onClick={() => setShowDiscount(!showDiscount)} style={{ color: 'var(--primary)', fontSize: 13, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
            {showDiscount ? '▲' : '▼'} لديك كود خصم؟
          </button>
          {showDiscount && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input value={discountCode} onChange={(e) => setDiscountCode(e.target.value)}
                placeholder="مثال: RAMADAN20" dir="ltr"
                style={{ flex: 1, background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '10px 14px', color: 'var(--text)', fontSize: 14, outline: 'none' }} />
              <button style={{ background: 'var(--primary)', color: '#fff', padding: '10px 18px', borderRadius: 12, border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                تطبيق
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Fixed bottom summary */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--bg2)', borderTop: '1px solid var(--border)', padding: '14px 16px 28px', boxShadow: 'var(--shadow-lg)' }}>
        {selectedSlot && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, padding: '10px 14px', background: 'var(--card2)', borderRadius: 12 }}>
            <div>
              <p style={{ color: 'var(--text3)', fontSize: 11 }}>الملعب</p>
              <p style={{ color: 'var(--text)', fontSize: 13, fontWeight: 600 }}>{facility.name}</p>
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ color: 'var(--text3)', fontSize: 11 }}>الوقت</p>
              <p style={{ color: 'var(--text)', fontSize: 13, fontWeight: 600 }} dir="ltr">{fmt(selectedSlot.start_hour)} – {fmt(selectedSlot.end_hour)}</p>
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ color: 'var(--text3)', fontSize: 11 }}>الإجمالي</p>
              <p style={{ color: 'var(--primary)', fontSize: 15, fontWeight: 700 }}>{selectedSlot.price_sar} ر</p>
            </div>
          </div>
        )}
        <button onClick={goConfirm} disabled={!selectedSlot} className="press"
          style={{ width: '100%', padding: '15px', borderRadius: 16, background: selectedSlot ? 'var(--primary)' : 'var(--card2)', color: selectedSlot ? 'var(--primary-fg)' : 'var(--text3)', border: 'none', fontWeight: 700, fontSize: 16, cursor: selectedSlot ? 'pointer' : 'default', transition: 'all 0.2s' }}>
          {selectedSlot ? `تأكيد الحجز ←` : 'اختر وقتاً أولاً'}
        </button>
      </div>
    </div>
  )
}
