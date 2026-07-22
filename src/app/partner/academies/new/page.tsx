'use client'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { sanitizeText, enforceLimit } from '@/lib/sanitize'
import DynamicFields, { type DynamicFieldsHandle, saveDynamicFieldValues } from '@/components/DynamicFields'

const sportOptions = [
  { value: 'football', label: '⚽ كرة قدم' }, { value: 'futsal', label: '🥅 فوتسال' },
  { value: 'padel', label: '🎾 بادل' }, { value: 'basketball', label: '🏀 كرة سلة' },
  { value: 'volleyball', label: '🏐 كرة طائرة' }, { value: 'tennis', label: '🎾 تنس' },
  { value: 'squash', label: '🏸 سكواش' }, { value: 'swimming', label: '🏊 سباحة' },
]

const cities = ['الرياض', 'جدة', 'مكة المكرمة', 'المدينة المنورة', 'الدمام', 'الخبر', 'تبوك', 'أبها', 'القصيم', 'حائل', 'جازان']

export default function NewAcademyPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', city: '', phone: '', description: '', sport_types: [] as string[] })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const dynamicRef = useRef<DynamicFieldsHandle>(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => { if (user) setUserId(user.id) })
  }, [])

  const toggleSport = (val: string) => setForm((f) => ({
    ...f,
    sport_types: f.sport_types.includes(val) ? f.sport_types.filter((s) => s !== val) : [...f.sport_types, val],
  }))

  const save = async () => {
    if (!form.name.trim() || !form.city || form.sport_types.length === 0) {
      setError('الاسم والمدينة ونوع الرياضة مطلوبة'); return
    }
    if (dynamicRef.current && !dynamicRef.current.validate()) return
    setSaving(true); setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data, error: err } = await supabase.from('academies').insert({
      owner_id: user.id,
      name: enforceLimit(sanitizeText(form.name), 'name'),
      city: form.city,
      sport_types: form.sport_types,
      phone: form.phone || null,
      description: form.description ? enforceLimit(sanitizeText(form.description), 'description') : null,
    }).select('id').single()
    if (err) { setError(err.message); setSaving(false); return }
    if (dynamicRef.current) {
      await saveDynamicFieldValues(dynamicRef.current.getValues(), data.id, 'academies', user.id)
    }
    router.push(`/partner/academies/${data.id}`)
  }

  const inputStyle = { width: '100%', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px', fontSize: 13, outline: 'none', background: 'transparent', color: 'var(--text)', boxSizing: 'border-box' as const }
  const labelStyle = { display: 'block' as const, fontSize: 12, fontWeight: 600 as const, color: 'var(--text)', marginBottom: 6 }

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <header style={{ background: 'var(--bg2)', padding: '52px 16px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ fontSize: 20, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text)' }}>←</button>
        <div>
          <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>الشريك</p>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>إضافة أكاديمية</h1>
        </div>
      </header>

      <div style={{ padding: '16px 16px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>اسم الأكاديمية *</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="مثال: أكاديمية النجوم" style={inputStyle} />
          </div>

          <div>
            <label style={{ ...labelStyle, marginBottom: 8 }}>الرياضات *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {sportOptions.map((s) => (
                <button key={s.value} onClick={() => toggleSport(s.value)}
                  style={{ fontSize: 12, padding: '8px 12px', borderRadius: 12, border: `1px solid ${form.sport_types.includes(s.value) ? 'var(--primary)' : 'var(--border)'}`, background: form.sport_types.includes(s.value) ? 'var(--primary-dim)' : 'transparent', color: form.sport_types.includes(s.value) ? 'var(--primary)' : 'var(--text2)', cursor: 'pointer', textAlign: 'right' }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>المدينة *</label>
            <select value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              style={{ ...inputStyle, background: 'var(--card)' }}>
              <option value="">اختر المدينة</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>رقم التواصل</label>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }} dir="ltr">
              <span style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text2)', background: 'var(--bg)', borderRight: '1px solid var(--border)' }}>🇸🇦 +966</span>
              <input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 9) }))}
                placeholder="5XXXXXXXX" style={{ flex: 1, padding: '10px 12px', fontSize: 13, outline: 'none', background: 'transparent', color: 'var(--text)', border: 'none' }} dir="ltr" />
            </div>
          </div>

          <div>
            <label style={labelStyle}>وصف الأكاديمية</label>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="اكتب وصفاً عن الأكاديمية وما تقدمه..."
              rows={3} style={{ ...inputStyle, resize: 'none' }} />
          </div>
        </div>

        {userId && (
          <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16 }}>
            <DynamicFields ref={dynamicRef} ownerId={userId} activity="academy_manager" useIn="academy_profile" />
          </div>
        )}

        {error && <p style={{ color: 'var(--danger)', fontSize: 12, textAlign: 'center' }}>{error}</p>}
        <button onClick={save} disabled={saving}
          style={{ width: '100%', background: 'var(--primary)', color: 'var(--primary-fg)', padding: '14px', borderRadius: 20, fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>
          {saving ? 'جاري الحفظ...' : 'إضافة الأكاديمية ←'}
        </button>
        <p style={{ fontSize: 11, textAlign: 'center', color: 'var(--text3)' }}>بعد الإضافة ستتمكن من إضافة البرامج التدريبية</p>
      </div>
    </div>
  )
}
