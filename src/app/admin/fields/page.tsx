'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type FieldDef = {
  id: string
  name_ar: string
  field_type: string
  is_required_default: boolean
  is_active: boolean
  sort_order: number
  applies_to: string[] | null
  use_in: string[]
  created_at: string
  field_categories: { name_ar: string } | null
}

const fieldTypeLabel: Record<string, string> = {
  text: 'نص', textarea: 'نص طويل', number: 'رقم', select: 'قائمة',
  multiselect: 'قائمة متعددة', date: 'تاريخ', time: 'وقت',
  file: 'ملف', image: 'صورة', boolean: 'نعم/لا', phone: 'جوال', email: 'إيميل', url: 'رابط',
}

const activityLabel: Record<string, string> = {
  facility_manager: 'مدير ملعب',
  academy_manager: 'مدير أكاديمية',
  tournament_manager: 'منظم بطولة',
}

type NewField = {
  name_ar: string
  field_type: string
  is_required_default: boolean
  applies_to: string[]
  use_in: string[]
  placeholder_ar: string
  sort_order: number
}

const defaultNew: NewField = {
  name_ar: '', field_type: 'text', is_required_default: false,
  applies_to: [], use_in: [], placeholder_ar: '', sort_order: 0,
}

export default function AdminFieldsPage() {
  const router = useRouter()
  const [fields, setFields] = useState<FieldDef[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<NewField>(defaultNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    const supabase = createClient()
    const { data } = await supabase.from('field_definitions').select('*, field_categories(name_ar)').order('sort_order')
    setFields((data as FieldDef[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const toggle = (id: string, current: boolean) => {
    const supabase = createClient()
    supabase.from('field_definitions').update({ is_active: !current }).eq('id', id)
      .then(() => setFields((prev) => prev.map((f) => f.id === id ? { ...f, is_active: !current } : f)))
  }

  const save = async () => {
    if (!form.name_ar.trim()) { setError('اسم الحقل مطلوب'); return }
    setSaving(true); setError('')
    const supabase = createClient()
    const { error: err } = await supabase.from('field_definitions').insert({
      name_ar: form.name_ar, field_type: form.field_type,
      is_required_default: form.is_required_default,
      applies_to: form.applies_to.length ? form.applies_to : null,
      use_in: form.use_in,
      placeholder_ar: form.placeholder_ar || null,
      sort_order: form.sort_order,
    })
    if (err) { setError(err.message); setSaving(false); return }
    setShowForm(false); setForm(defaultNew)
    await load(); setSaving(false)
  }

  const toggleArr = (key: 'applies_to' | 'use_in', val: string) => {
    setForm((f) => ({ ...f, [key]: f[key].includes(val) ? f[key].filter((x) => x !== val) : [...f[key], val] }))
  }

  const inputStyle = { width: '100%', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px', fontSize: 13, outline: 'none', background: 'transparent', color: 'var(--text)', boxSizing: 'border-box' as const }

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <header style={{ background: 'linear-gradient(135deg,#1a1a2e,#16213e)', padding: '52px 16px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()} style={{ fontSize: 20, background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff' }}>←</button>
          <div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: 0 }}>لوحة التحكم</p>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>إدارة الحقول</h1>
          </div>
        </div>
        <button onClick={() => setShowForm(true)}
          style={{ background: '#fff', color: 'var(--primary)', fontSize: 13, fontWeight: 700, padding: '7px 14px', borderRadius: 14, border: 'none', cursor: 'pointer' }}>
          + إضافة
        </button>
      </header>

      <div style={{ padding: '12px 16px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)' }}>جاري التحميل...</div>
        ) : fields.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ fontSize: 40, marginBottom: 8 }}>📋</p>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>لا توجد حقول مخصصة بعد</p>
            <button onClick={() => setShowForm(true)}
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)', padding: '10px 20px', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 13 }}>
              أضف أول حقل
            </button>
          </div>
        ) : (
          fields.map((f) => (
            <div key={f.id} style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)', padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13, margin: '0 0 2px' }}>{f.name_ar}</p>
                  <p style={{ fontSize: 11, color: 'var(--text2)', margin: '0 0 2px' }}>
                    {fieldTypeLabel[f.field_type] ?? f.field_type}
                    {f.is_required_default && ' · مطلوب'}
                  </p>
                  {f.applies_to && f.applies_to.length > 0 && (
                    <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>{f.applies_to.map((a) => activityLabel[a]).join('، ')}</p>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: f.is_active ? 'var(--primary-dim)' : 'var(--bg)', color: f.is_active ? 'var(--primary)' : 'var(--text3)' }}>
                    {f.is_active ? 'مفعّل' : 'معطّل'}
                  </span>
                  <button onClick={() => toggle(f.id, f.is_active)}
                    style={{ fontSize: 10, color: 'var(--text2)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                    {f.is_active ? 'تعطيل' : 'تفعيل'}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 50 }} onClick={() => setShowForm(false)}>
          <div style={{ background: 'var(--card)', borderRadius: '20px 20px 0 0', padding: 20, width: '100%', maxHeight: '85dvh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontWeight: 700, color: 'var(--text)', margin: '0 0 16px' }}>إضافة حقل جديد</h3>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>اسم الحقل *</label>
            <input value={form.name_ar} onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))}
              placeholder="مثال: عنوان الملعب" style={{ ...inputStyle, marginBottom: 12 }} />

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>نوع الحقل</label>
            <select value={form.field_type} onChange={(e) => setForm((f) => ({ ...f, field_type: e.target.value }))}
              style={{ ...inputStyle, marginBottom: 12, background: 'var(--card)' }}>
              {Object.entries(fieldTypeLabel).map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
            </select>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>نص توضيحي</label>
            <input value={form.placeholder_ar} onChange={(e) => setForm((f) => ({ ...f, placeholder_ar: e.target.value }))}
              placeholder="مثال: أدخل العنوان كاملاً" style={{ ...inputStyle, marginBottom: 12 }} />

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>يظهر لـ (النشاط)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {Object.entries(activityLabel).map(([val, lbl]) => (
                <button key={val} onClick={() => toggleArr('applies_to', val)}
                  style={{ fontSize: 12, padding: '6px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', background: form.applies_to.includes(val) ? 'var(--primary)' : 'var(--bg)', color: form.applies_to.includes(val) ? 'var(--primary-fg)' : 'var(--text2)', outline: form.applies_to.includes(val) ? 'none' : '1px solid var(--border)' }}>
                  {lbl}
                </button>
              ))}
            </div>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>يُستخدم في</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {[{ val: 'registration', lbl: 'التسجيل' }, { val: 'facility_profile', lbl: 'ملف ملعب' }, { val: 'academy_profile', lbl: 'ملف أكاديمية' }, { val: 'booking', lbl: 'الحجز' }].map(({ val, lbl }) => (
                <button key={val} onClick={() => toggleArr('use_in', val)}
                  style={{ fontSize: 12, padding: '6px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', background: form.use_in.includes(val) ? 'var(--primary)' : 'var(--bg)', color: form.use_in.includes(val) ? 'var(--primary-fg)' : 'var(--text2)', outline: form.use_in.includes(val) ? 'none' : '1px solid var(--border)' }}>
                  {lbl}
                </button>
              ))}
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.is_required_default}
                onChange={(e) => setForm((f) => ({ ...f, is_required_default: e.target.checked }))}
                style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} />
              <span style={{ fontSize: 13, color: 'var(--text)' }}>حقل إلزامي بشكل افتراضي</span>
            </label>

            {error && <p style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 12 }}>{error}</p>}

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={save} disabled={saving}
                style={{ flex: 1, background: 'var(--primary)', color: 'var(--primary-fg)', padding: '11px', borderRadius: 14, fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>
                {saving ? 'جاري الحفظ...' : 'حفظ الحقل'}
              </button>
              <button onClick={() => { setShowForm(false); setForm(defaultNew) }}
                style={{ flex: 1, border: '1px solid var(--border)', padding: '11px', borderRadius: 14, fontSize: 13, background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
