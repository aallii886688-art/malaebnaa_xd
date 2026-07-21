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
  name_ar: '',
  field_type: 'text',
  is_required_default: false,
  applies_to: [],
  use_in: [],
  placeholder_ar: '',
  sort_order: 0,
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
    const { data } = await supabase
      .from('field_definitions')
      .select('*, field_categories(name_ar)')
      .order('sort_order')
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
      name_ar: form.name_ar,
      field_type: form.field_type,
      is_required_default: form.is_required_default,
      applies_to: form.applies_to.length ? form.applies_to : null,
      use_in: form.use_in,
      placeholder_ar: form.placeholder_ar || null,
      sort_order: form.sort_order,
      // No category_id for now (can be added later)
    })
    if (err) { setError(err.message); setSaving(false); return }
    setShowForm(false)
    setForm(defaultNew)
    await load()
    setSaving(false)
  }

  const toggleArr = (key: 'applies_to' | 'use_in', val: string) => {
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(val) ? f[key].filter((x) => x !== val) : [...f[key], val],
    }))
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="bg-[#0F6E56] text-white px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-white text-xl">←</button>
          <div>
            <p className="text-xs opacity-80">لوحة التحكم</p>
            <h1 className="text-lg font-bold">إدارة الحقول</h1>
          </div>
        </div>
        <button onClick={() => setShowForm(true)}
          className="bg-white text-[#0F6E56] text-sm font-bold px-3 py-1.5 rounded-xl">
          + إضافة
        </button>
      </header>

      <div className="px-4 py-4 space-y-2">
        {loading ? (
          <div className="text-center py-10 text-[#6B7280]">جاري التحميل...</div>
        ) : fields.length === 0 ? (
          <div className="text-center py-10 text-[#6B7280]">
            <p className="text-4xl mb-2">📋</p>
            <p className="text-sm">لا توجد حقول مخصصة بعد</p>
            <button onClick={() => setShowForm(true)}
              className="mt-3 bg-[#0F6E56] text-white px-4 py-2 rounded-xl text-sm">
              أضف أول حقل
            </button>
          </div>
        ) : (
          fields.map((f) => (
            <div key={f.id} className="bg-white rounded-xl border border-[#E8ECEF] p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm text-[#1A1A1A]">{f.name_ar}</p>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    {fieldTypeLabel[f.field_type] ?? f.field_type}
                    {f.is_required_default && ' · مطلوب'}
                  </p>
                  {f.applies_to && f.applies_to.length > 0 && (
                    <p className="text-xs text-[#9CA3AF] mt-0.5">
                      {f.applies_to.map((a) => activityLabel[a]).join('، ')}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${f.is_active ? 'bg-[#E8F5F1] text-[#0F6E56]' : 'bg-gray-100 text-gray-400'}`}>
                    {f.is_active ? 'مفعّل' : 'معطّل'}
                  </span>
                  <button onClick={() => toggle(f.id, f.is_active)}
                    className="text-[10px] text-[#6B7280] underline">
                    {f.is_active ? 'تعطيل' : 'تفعيل'}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add field sheet */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-t-2xl p-5 w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-[#1A1A1A] mb-4">إضافة حقل جديد</h3>

            <label className="block text-xs font-medium text-[#1A1A1A] mb-1">اسم الحقل *</label>
            <input value={form.name_ar} onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))}
              placeholder="مثال: عنوان الملعب"
              className="w-full border border-[#E8ECEF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56] mb-3" />

            <label className="block text-xs font-medium text-[#1A1A1A] mb-1">نوع الحقل</label>
            <select value={form.field_type} onChange={(e) => setForm((f) => ({ ...f, field_type: e.target.value }))}
              className="w-full border border-[#E8ECEF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56] mb-3">
              {Object.entries(fieldTypeLabel).map(([val, lbl]) => (
                <option key={val} value={val}>{lbl}</option>
              ))}
            </select>

            <label className="block text-xs font-medium text-[#1A1A1A] mb-1">نص توضيحي</label>
            <input value={form.placeholder_ar} onChange={(e) => setForm((f) => ({ ...f, placeholder_ar: e.target.value }))}
              placeholder="مثال: أدخل العنوان كاملاً"
              className="w-full border border-[#E8ECEF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56] mb-3" />

            <label className="block text-xs font-medium text-[#1A1A1A] mb-2">يظهر لـ (النشاط)</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {Object.entries(activityLabel).map(([val, lbl]) => (
                <button key={val} onClick={() => toggleArr('applies_to', val)}
                  className={`text-xs px-3 py-1.5 rounded-full border ${form.applies_to.includes(val) ? 'bg-[#0F6E56] text-white border-[#0F6E56]' : 'border-[#E8ECEF] text-[#6B7280]'}`}>
                  {lbl}
                </button>
              ))}
            </div>

            <label className="block text-xs font-medium text-[#1A1A1A] mb-2">يُستخدم في</label>
            <div className="flex flex-wrap gap-2 mb-4">
              {['registration', 'facility_profile', 'academy_profile', 'booking'].map((val) => (
                <button key={val} onClick={() => toggleArr('use_in', val)}
                  className={`text-xs px-3 py-1.5 rounded-full border ${form.use_in.includes(val) ? 'bg-[#0F6E56] text-white border-[#0F6E56]' : 'border-[#E8ECEF] text-[#6B7280]'}`}>
                  {val === 'registration' ? 'التسجيل' : val === 'facility_profile' ? 'ملف ملعب' : val === 'academy_profile' ? 'ملف أكاديمية' : 'الحجز'}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 mb-4 cursor-pointer">
              <input type="checkbox" checked={form.is_required_default}
                onChange={(e) => setForm((f) => ({ ...f, is_required_default: e.target.checked }))}
                className="w-4 h-4 accent-[#0F6E56]" />
              <span className="text-sm text-[#1A1A1A]">حقل إلزامي بشكل افتراضي</span>
            </label>

            {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

            <div className="flex gap-2">
              <button onClick={save} disabled={saving}
                className="flex-1 bg-[#0F6E56] text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50">
                {saving ? 'جاري الحفظ...' : 'حفظ الحقل'}
              </button>
              <button onClick={() => { setShowForm(false); setForm(defaultNew) }}
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
