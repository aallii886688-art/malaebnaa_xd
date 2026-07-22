'use client'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { sanitizeText, enforceLimit } from '@/lib/sanitize'
import DynamicFields, { type DynamicFieldsHandle, saveDynamicFieldValues } from '@/components/DynamicFields'

const sportOptions = [
  { value: 'football', label: '⚽ كرة قدم' },
  { value: 'futsal', label: '🥅 فوتسال' },
  { value: 'padel', label: '🎾 بادل' },
  { value: 'basketball', label: '🏀 كرة سلة' },
  { value: 'volleyball', label: '🏐 كرة طائرة' },
  { value: 'tennis', label: '🎾 تنس' },
  { value: 'squash', label: '🏸 سكواش' },
  { value: 'badminton', label: '🏸 ريشة طائرة' },
  { value: 'swimming', label: '🏊 سباحة' },
  { value: 'other', label: '🏅 أخرى' },
]

const cities = ['الرياض', 'جدة', 'مكة المكرمة', 'المدينة المنورة', 'الدمام', 'الخبر', 'الظهران', 'تبوك', 'أبها', 'خميس مشيط', 'القصيم', 'حائل', 'جازان', 'نجران', 'الباحة']

type FormData = {
  name: string
  sport_type: string
  city: string
  district: string
  address: string
  phone: string
  description: string
}

export default function NewFacilityPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormData>({
    name: '', sport_type: 'football', city: '', district: '', address: '', phone: '', description: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const dynamicRef = useRef<DynamicFieldsHandle>(null)

  const set = (key: keyof FormData, val: string) => setForm((f) => ({ ...f, [key]: val }))

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => { if (user) setUserId(user.id) })
  }, [])

  const save = async () => {
    if (!form.name.trim() || !form.city) { setError('اسم الملعب والمدينة مطلوبان'); return }
    if (dynamicRef.current && !dynamicRef.current.validate()) return
    setSaving(true); setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data, error: err } = await supabase.from('facilities').insert({
      owner_id: user.id,
      name: enforceLimit(sanitizeText(form.name), 'name'),
      sport_type: form.sport_type,
      city: form.city,
      district: form.district ? enforceLimit(sanitizeText(form.district), 'short_text') : null,
      address: form.address ? enforceLimit(sanitizeText(form.address), 'address') : null,
      phone: form.phone || null,
      description: form.description ? enforceLimit(sanitizeText(form.description), 'description') : null,
    }).select('id').single()

    if (err) { setError(err.message); setSaving(false); return }
    if (dynamicRef.current) {
      await saveDynamicFieldValues(dynamicRef.current.getValues(), data.id, 'facilities', user.id)
    }
    router.push(`/partner/facilities/${data.id}`)
  }

  const inputStyle = { width: '100%', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px', fontSize: 13, outline: 'none', background: 'transparent', color: 'var(--text)', boxSizing: 'border-box' as const }
  const labelStyle = { display: 'block' as const, fontSize: 12, fontWeight: 600 as const, color: 'var(--text)', marginBottom: 6 }

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <header style={{ background: 'var(--bg2)', padding: '52px 16px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ fontSize: 20, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text)' }}>←</button>
        <div>
          <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>الشريك</p>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>إضافة ملعب جديد</h1>
        </div>
      </header>

      <div style={{ padding: '16px 16px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>المعلومات الأساسية</h2>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>اسم الملعب *</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)}
              placeholder="مثال: ملعب النور" style={inputStyle} />
          </div>

          <div>
            <label style={{ ...labelStyle, marginBottom: 8 }}>نوع الرياضة *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {sportOptions.map((s) => (
                <button key={s.value} onClick={() => set('sport_type', s.value)}
                  style={{ fontSize: 12, padding: '8px 12px', borderRadius: 12, border: `1px solid ${form.sport_type === s.value ? 'var(--primary)' : 'var(--border)'}`, background: form.sport_type === s.value ? 'var(--primary-dim)' : 'transparent', color: form.sport_type === s.value ? 'var(--primary)' : 'var(--text2)', cursor: 'pointer', textAlign: 'right' }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>الموقع</h2>

          <div>
            <label style={labelStyle}>المدينة *</label>
            <select value={form.city} onChange={(e) => set('city', e.target.value)}
              style={{ ...inputStyle, background: 'var(--card)' }}>
              <option value="">اختر المدينة</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>الحي</label>
            <input value={form.district} onChange={(e) => set('district', e.target.value)}
              placeholder="مثال: حي النزهة" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>العنوان التفصيلي</label>
            <input value={form.address} onChange={(e) => set('address', e.target.value)}
              placeholder="مثال: شارع الأمير سلطان، بجوار مسجد النور" style={inputStyle} />
          </div>
        </div>

        <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>معلومات إضافية</h2>

          <div>
            <label style={labelStyle}>رقم التواصل</label>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }} dir="ltr">
              <span style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text2)', background: 'var(--bg)', borderRight: '1px solid var(--border)', whiteSpace: 'nowrap' }}>🇸🇦 +966</span>
              <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value.replace(/\D/g, '').slice(0, 9))}
                placeholder="5XXXXXXXX"
                style={{ flex: 1, padding: '10px 12px', fontSize: 13, outline: 'none', background: 'transparent', color: 'var(--text)', border: 'none' }} dir="ltr" />
            </div>
          </div>

          <div>
            <label style={labelStyle}>وصف الملعب</label>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)}
              placeholder="اكتب وصفاً مختصراً عن الملعب، المميزات، الخدمات..."
              rows={3}
              style={{ ...inputStyle, resize: 'none' }} />
          </div>
        </div>

        {userId && (
          <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16 }}>
            <DynamicFields ref={dynamicRef} ownerId={userId} activity="facility_manager" useIn="facility_profile" />
          </div>
        )}

        {error && <p style={{ color: 'var(--danger)', fontSize: 12, textAlign: 'center' }}>{error}</p>}

        <button onClick={save} disabled={saving}
          style={{ width: '100%', background: 'var(--primary)', color: 'var(--primary-fg)', padding: '14px', borderRadius: 20, fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>
          {saving ? 'جاري الحفظ...' : 'إضافة الملعب ←'}
        </button>

        <p style={{ fontSize: 11, textAlign: 'center', color: 'var(--text3)' }}>بعد الإضافة ستتمكن من ضبط أوقات وأسعار الحجز</p>
      </div>
    </div>
  )
}
