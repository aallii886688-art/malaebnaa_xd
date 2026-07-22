'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type FieldDef = {
  id: string; name_ar: string; field_type: string; is_required_default: boolean
  is_active: boolean; sort_order: number; applies_to: string[] | null
  use_in: string[]; placeholder_ar: string | null; help_text_ar: string | null
  field_categories: { name_ar: string } | null
}

const fieldTypeLabel: Record<string, string> = {
  text: 'نص', textarea: 'نص طويل', number: 'رقم', select: 'قائمة',
  multiselect: 'قائمة متعددة', date: 'تاريخ', boolean: 'نعم/لا',
  file: 'ملف', image: 'صورة', phone: 'جوال', email: 'إيميل', url: 'رابط',
}

// هيكل التصنيفات الرئيسية والفرعية
const SECTIONS = [
  {
    key: 'facilities',
    label: '🏟️ ملاعب',
    subs: [
      {
        key: 'facility_profile',
        label: 'ملف الملعب',
        note: 'يملأه شريك الملاعب عند إضافة ملعب جديد للمنصة',
        applies_to: ['facility_manager'],
        use_in: ['facility_profile'],
      },
    ],
  },
  {
    key: 'academies',
    label: '🏅 أكاديميات',
    subs: [
      {
        key: 'academy_profile',
        label: 'ملف الأكاديمية',
        note: 'يملأه شريك الأكاديميات عند إضافة أكاديمية جديدة',
        applies_to: ['academy_manager'],
        use_in: ['academy_profile'],
      },
      {
        key: 'academy_program',
        label: 'ملف البرنامج التدريبي',
        note: 'يملأه شريك الأكاديميات عند إضافة برنامج تدريبي جديد',
        applies_to: ['academy_manager'],
        use_in: ['academy_program'],
      },
      {
        key: 'registration',
        label: 'تسجيل طالب',
        note: 'يملأه العميل عند الاشتراك في برنامج تدريبي',
        applies_to: ['academy_manager'],
        use_in: ['registration'],
      },
    ],
  },
  {
    key: 'tournaments',
    label: '🏆 بطولات',
    subs: [
      {
        key: 'tournament_registration',
        label: 'تسجيل فريق',
        note: 'يملأه العميل عند تسجيل فريقه في بطولة',
        applies_to: ['tournament_manager'],
        use_in: ['tournament_registration'],
      },
    ],
  },
  {
    key: 'partners',
    label: '🤝 شركاء',
    subs: [
      {
        key: 'activation_facility',
        label: 'شريك ملاعب',
        note: 'يملأه المتقدم عند طلب تفعيل نشاط إدارة الملاعب',
        applies_to: ['facility_manager'],
        use_in: ['activation_request'],
      },
      {
        key: 'activation_academy',
        label: 'شريك أكاديميات',
        note: 'يملأه المتقدم عند طلب تفعيل نشاط إدارة الأكاديميات',
        applies_to: ['academy_manager'],
        use_in: ['activation_request'],
      },
      {
        key: 'activation_tournament',
        label: 'شريك بطولات',
        note: 'يملأه المتقدم عند طلب تفعيل نشاط تنظيم البطولات',
        applies_to: ['tournament_manager'],
        use_in: ['activation_request'],
      },
    ],
  },
]

const defaultForm = {
  name_ar: '', field_type: 'text', is_required_default: false,
  placeholder_ar: '', help_text_ar: '', sort_order: 0,
}

export default function AdminFieldsPage() {
  const [fields, setFields] = useState<FieldDef[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('facilities')
  const [activeSub, setActiveSub] = useState('facility_profile')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('field_definitions')
      .select('*, field_categories(name_ar)')
      .order('sort_order')
    setFields((data as FieldDef[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const currentSection = SECTIONS.find((s) => s.key === activeSection)!
  const currentSub = currentSection.subs.find((s) => s.key === activeSub) ?? currentSection.subs[0]

  // فلترة الحقول حسب التصنيف الفرعي المختار
  const filteredFields = fields.filter((f) => {
    const matchesUseIn = f.use_in.some((u) => currentSub.use_in.includes(u))
    const matchesApplies = !f.applies_to || f.applies_to.some((a) => currentSub.applies_to.includes(a))
    return matchesUseIn && matchesApplies
  })

  const toggle = async (id: string, current: boolean) => {
    const supabase = createClient()
    await supabase.from('field_definitions').update({ is_active: !current }).eq('id', id)
    setFields((prev) => prev.map((f) => f.id === id ? { ...f, is_active: !current } : f))
  }

  const save = async () => {
    if (!form.name_ar.trim()) { setError('اسم الحقل مطلوب'); return }
    setSaving(true); setError('')
    const supabase = createClient()
    const { error: err } = await supabase.from('field_definitions').insert({
      name_ar: form.name_ar,
      field_type: form.field_type,
      is_required_default: form.is_required_default,
      placeholder_ar: form.placeholder_ar || null,
      help_text_ar: form.help_text_ar || null,
      sort_order: form.sort_order,
      applies_to: currentSub.applies_to,
      use_in: currentSub.use_in,
      is_active: true,
    })
    if (err) { setError(err.message); setSaving(false); return }
    setShowForm(false); setForm(defaultForm)
    await load(); setSaving(false)
  }

  const inputStyle = {
    width: '100%', border: '1px solid var(--border)', borderRadius: 12,
    padding: '10px 12px', fontSize: 13, outline: 'none',
    background: 'var(--card)', color: 'var(--text)', boxSizing: 'border-box' as const,
  }

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#1a1a2e,#16213e)', padding: '16px' }}>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: '0 0 2px' }}>لوحة التحكم</p>
        <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: 0 }}>إدارة الحقول</h1>
      </div>

      {/* التصنيفات الرئيسية */}
      <div style={{ display: 'flex', gap: 6, padding: '12px 16px', overflowX: 'auto', background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }} className="no-scrollbar">
        {SECTIONS.map((s) => (
          <button key={s.key} onClick={() => { setActiveSection(s.key); setActiveSub(s.subs[0].key) }}
            style={{ flexShrink: 0, padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', background: activeSection === s.key ? 'var(--primary)' : 'var(--card)', color: activeSection === s.key ? 'var(--primary-fg)' : 'var(--text2)', outline: activeSection === s.key ? 'none' : '1px solid var(--border)' }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* التصنيفات الفرعية */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 16px', overflowX: 'auto', background: 'var(--bg)', borderBottom: '1px solid var(--border)' }} className="no-scrollbar">
        {currentSection.subs.map((s) => (
          <button key={s.key} onClick={() => setActiveSub(s.key)}
            style={{ flexShrink: 0, padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer', background: activeSub === s.key ? 'var(--card2)' : 'transparent', color: activeSub === s.key ? 'var(--text)' : 'var(--text3)', outline: activeSub === s.key ? '1.5px solid var(--primary)' : '1px solid var(--border)' }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* بطاقة الوصف */}
      <div style={{ margin: '14px 16px 0', background: 'var(--primary-dim)', borderRadius: 14, padding: '10px 14px', border: '1px solid var(--primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18 }}>💡</span>
        <p style={{ fontSize: 12, color: 'var(--primary)', margin: 0 }}>{currentSub.note}</p>
      </div>

      {/* قائمة الحقول */}
      <div style={{ padding: '12px 16px 100px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          [1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 14 }} />)
        ) : filteredFields.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <p style={{ fontSize: 40, marginBottom: 8 }}>📋</p>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>لا توجد حقول في هذا التصنيف بعد</p>
            <button onClick={() => setShowForm(true)}
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)', padding: '10px 24px', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              + أضف أول حقل
            </button>
          </div>
        ) : filteredFields.map((f) => (
          <div key={f.id} style={{ background: 'var(--card)', borderRadius: 16, border: `1px solid ${f.is_active ? 'var(--border)' : 'var(--card2)'}`, padding: '12px 14px', opacity: f.is_active ? 1 : 0.6 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14, margin: '0 0 3px' }}>{f.name_ar}</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>{fieldTypeLabel[f.field_type] ?? f.field_type}</span>
                  {f.is_required_default && <span style={{ fontSize: 11, color: 'var(--danger)' }}>إلزامي</span>}
                  {f.placeholder_ar && <span style={{ fontSize: 11, color: 'var(--text3)' }}>· {f.placeholder_ar}</span>}
                </div>
                {f.help_text_ar && <p style={{ fontSize: 11, color: 'var(--text3)', margin: '4px 0 0' }}>{f.help_text_ar}</p>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, marginRight: 8 }}>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: f.is_active ? 'var(--primary-dim)' : 'var(--bg)', color: f.is_active ? 'var(--primary)' : 'var(--text3)', fontWeight: 600 }}>
                  {f.is_active ? 'مفعّل' : 'معطّل'}
                </span>
                <button onClick={() => toggle(f.id, f.is_active)}
                  style={{ fontSize: 11, color: f.is_active ? 'var(--danger)' : 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                  {f.is_active ? 'تعطيل' : 'تفعيل'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* زر إضافة ثابت */}
      {filteredFields.length > 0 && (
        <div style={{ position: 'fixed', bottom: 24, left: 16, right: 16 }}>
          <button onClick={() => setShowForm(true)}
            style={{ width: '100%', background: 'var(--primary)', color: 'var(--primary-fg)', padding: '14px', borderRadius: 20, fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
            + إضافة حقل في "{currentSub.label}"
          </button>
        </div>
      )}

      {/* Bottom sheet إضافة حقل */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', zIndex: 60 }}
          onClick={() => { setShowForm(false); setForm(defaultForm); setError('') }}>
          <div style={{ background: 'var(--card)', borderRadius: '24px 24px 0 0', padding: '20px 16px 36px', width: '100%', maxHeight: '90svh', overflowY: 'auto', boxSizing: 'border-box' }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 2, margin: '0 auto 16px' }} />

            <h3 style={{ fontWeight: 700, color: 'var(--text)', fontSize: 16, margin: '0 0 4px' }}>إضافة حقل جديد</h3>
            <p style={{ fontSize: 12, color: 'var(--primary)', margin: '0 0 16px', background: 'var(--primary-dim)', padding: '6px 10px', borderRadius: 10 }}>
              {currentSection.label} ← {currentSub.label}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text3)', margin: '0 0 16px' }}>{currentSub.note}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>اسم الحقل *</label>
                <input value={form.name_ar} onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))}
                  placeholder="مثال: رقم الهوية" style={inputStyle} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>نوع الحقل</label>
                <select value={form.field_type} onChange={(e) => setForm((f) => ({ ...f, field_type: e.target.value }))}
                  style={inputStyle}>
                  {Object.entries(fieldTypeLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>نص توضيحي (placeholder)</label>
                <input value={form.placeholder_ar} onChange={(e) => setForm((f) => ({ ...f, placeholder_ar: e.target.value }))}
                  placeholder="مثال: أدخل رقم الهوية الوطنية" style={inputStyle} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>ملاحظة مساعدة (اختياري)</label>
                <input value={form.help_text_ar} onChange={(e) => setForm((f) => ({ ...f, help_text_ar: e.target.value }))}
                  placeholder="مثال: يجب أن يتطابق مع بطاقة الهوية" style={inputStyle} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>ترتيب العرض</label>
                <input type="number" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: +e.target.value }))}
                  placeholder="0" style={inputStyle} />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.is_required_default}
                  onChange={(e) => setForm((f) => ({ ...f, is_required_default: e.target.checked }))}
                  style={{ width: 18, height: 18, accentColor: 'var(--primary)' }} />
                <div>
                  <p style={{ fontSize: 13, color: 'var(--text)', margin: 0, fontWeight: 600 }}>حقل إلزامي بشكل افتراضي</p>
                  <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>يمكن للشريك تغييره لاحقاً من صفحة حقوله</p>
                </div>
              </label>
            </div>

            {error && <p style={{ color: 'var(--danger)', fontSize: 12, margin: '12px 0 0' }}>{error}</p>}

            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={save} disabled={saving}
                style={{ flex: 1, background: 'var(--primary)', color: 'var(--primary-fg)', padding: '13px', borderRadius: 16, fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>
                {saving ? 'جاري الحفظ...' : 'حفظ الحقل'}
              </button>
              <button onClick={() => { setShowForm(false); setForm(defaultForm); setError('') }}
                style={{ flex: 1, border: '1px solid var(--border)', padding: '13px', borderRadius: 16, fontSize: 14, background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
