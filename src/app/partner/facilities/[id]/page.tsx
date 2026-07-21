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

  if (loading) return <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>جاري التحميل...</div>
  if (!facility) return <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}>الملعب غير موجود</div>

  const slotsByDay = days.map((_, d) => ({ day: d, slots: slots.filter((s) => s.day_of_week === d) }))

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <header style={{ background: 'var(--bg2)', padding: '52px 16px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()} style={{ fontSize: 20, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text)' }}>←</button>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>إدارة الملعب</p>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{facility.name}</h1>
          </div>
        </div>
        <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, background: facility.is_active ? 'var(--primary-dim)' : 'var(--danger-dim)', color: facility.is_active ? 'var(--primary)' : 'var(--danger)' }}>
          {facility.is_active ? '🟢 نشط' : '🔴 موقوف'}
        </span>
      </header>

      <div style={{ display: 'flex', background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
        {(['info', 'slots'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, padding: '12px', fontSize: 13, fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer', color: tab === t ? 'var(--primary)' : 'var(--text2)', borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent' }}>
            {t === 'info' ? '📋 المعلومات' : '🕐 الأوقات والأسعار'}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px 16px 40px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {tab === 'info' ? (
          <>
            <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'المدينة', value: facility.city },
                { label: 'الحي', value: facility.district },
                { label: 'العنوان', value: facility.address },
                { label: 'الجوال', value: facility.phone, ltr: true },
                { label: 'الوصف', value: facility.description },
              ].map(({ label, value, ltr }) => value ? (
                <div key={label}>
                  <p style={{ fontSize: 11, color: 'var(--text3)', margin: '0 0 2px' }}>{label}</p>
                  <p style={{ fontSize: 13, color: 'var(--text)', margin: 0 }} dir={ltr ? 'ltr' : undefined}>{value}</p>
                </div>
              ) : null)}
            </div>

            <button onClick={toggleActive}
              style={{ width: '100%', padding: '12px', borderRadius: 20, fontWeight: 700, fontSize: 13, background: 'transparent', cursor: 'pointer', border: `1px solid ${facility.is_active ? 'var(--danger)' : 'var(--primary)'}`, color: facility.is_active ? 'var(--danger)' : 'var(--primary)' }}>
              {facility.is_active ? '⏸ إيقاف الملعب مؤقتاً' : '▶ تفعيل الملعب'}
            </button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0 }}>{slots.length} وقت مضاف</p>
              <button onClick={() => setShowSlotForm(true)}
                style={{ fontSize: 12, background: 'var(--primary)', color: 'var(--primary-fg)', padding: '6px 14px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                + إضافة وقت
              </button>
            </div>

            {slots.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <p style={{ fontSize: 40, marginBottom: 8 }}>🕐</p>
                <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>لم تضف أوقات بعد</p>
                <button onClick={() => setShowSlotForm(true)}
                  style={{ background: 'var(--primary)', color: 'var(--primary-fg)', padding: '8px 16px', borderRadius: 12, fontSize: 13, border: 'none', cursor: 'pointer' }}>
                  أضف أول وقت
                </button>
              </div>
            ) : (
              slotsByDay.filter((d) => d.slots.length > 0).map(({ day, slots: daySlots }) => (
                <div key={day} style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>{days[day]}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {daySlots.map((s) => (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--border)', borderRadius: 12, padding: '8px 12px' }}>
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', margin: 0 }} dir="ltr">{fmt(s.start_hour)} – {fmt(s.end_hour)}</p>
                          <p style={{ fontSize: 12, color: 'var(--primary)', margin: 0 }}>{s.price_sar} ريال</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button onClick={() => toggleSlotAvail(s.id, s.is_available)}
                            style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: s.is_available ? 'var(--primary-dim)' : 'var(--bg)', color: s.is_available ? 'var(--primary)' : 'var(--text3)', border: 'none', cursor: 'pointer' }}>
                            {s.is_available ? 'متاح' : 'مغلق'}
                          </button>
                          <button onClick={() => deleteSlot(s.id)} style={{ color: 'var(--danger)', fontSize: 12, background: 'transparent', border: 'none', cursor: 'pointer' }}>🗑</button>
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

      {showSlotForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 50 }} onClick={() => setShowSlotForm(false)}>
          <div style={{ background: 'var(--card)', borderRadius: '20px 20px 0 0', padding: 20, width: '100%', boxSizing: 'border-box' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>إضافة وقت حجز</h3>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>اليوم</label>
            <select value={slotForm.day} onChange={(e) => setSlotForm((f) => ({ ...f, day: +e.target.value }))}
              style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px', fontSize: 13, outline: 'none', background: 'var(--card)', color: 'var(--text)', marginBottom: 12, boxSizing: 'border-box' }}>
              {days.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>وقت البداية</label>
                <select value={slotForm.start} onChange={(e) => setSlotForm((f) => ({ ...f, start: +e.target.value }))}
                  style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px', fontSize: 13, outline: 'none', background: 'var(--card)', color: 'var(--text)', boxSizing: 'border-box' }}>
                  {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{fmt(i)}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>وقت الانتهاء</label>
                <select value={slotForm.end} onChange={(e) => setSlotForm((f) => ({ ...f, end: +e.target.value }))}
                  style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px', fontSize: 13, outline: 'none', background: 'var(--card)', color: 'var(--text)', boxSizing: 'border-box' }}>
                  {Array.from({ length: 24 }, (_, i) => i + 1).map((i) => <option key={i} value={i}>{fmt(i)}</option>)}
                </select>
              </div>
            </div>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>السعر (ريال)</label>
            <input type="number" value={slotForm.price} onChange={(e) => setSlotForm((f) => ({ ...f, price: e.target.value }))}
              placeholder="مثال: 150"
              style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px', fontSize: 13, outline: 'none', background: 'transparent', color: 'var(--text)', boxSizing: 'border-box', marginBottom: 16 }} />

            {slotError && <p style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 12 }}>{slotError}</p>}

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={addSlot} disabled={slotSaving}
                style={{ flex: 1, background: 'var(--primary)', color: 'var(--primary-fg)', padding: '10px', borderRadius: 14, fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', opacity: slotSaving ? 0.5 : 1 }}>
                {slotSaving ? 'جاري الحفظ...' : 'إضافة'}
              </button>
              <button onClick={() => { setShowSlotForm(false); setSlotError('') }}
                style={{ flex: 1, border: '1px solid var(--border)', padding: '10px', borderRadius: 14, fontSize: 13, background: 'transparent', color: 'var(--text2)', cursor: 'pointer' }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
