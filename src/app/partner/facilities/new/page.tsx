'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { sanitizeText, enforceLimit } from '@/lib/sanitize'

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

  const set = (key: keyof FormData, val: string) => setForm((f) => ({ ...f, [key]: val }))

  const save = async () => {
    if (!form.name.trim() || !form.city) { setError('اسم الملعب والمدينة مطلوبان'); return }
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
    router.push(`/partner/facilities/${data.id}`)
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="bg-[#0F6E56] text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-white text-xl">←</button>
        <div>
          <p className="text-xs opacity-80">الشريك</p>
          <h1 className="text-lg font-bold">إضافة ملعب جديد</h1>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4 pb-10">
        <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4 space-y-4">
          <h2 className="text-sm font-bold text-[#1A1A1A]">المعلومات الأساسية</h2>

          <div>
            <label className="block text-xs font-medium text-[#1A1A1A] mb-1">اسم الملعب *</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)}
              placeholder="مثال: ملعب النور"
              className="w-full border border-[#E8ECEF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56]" />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1A1A1A] mb-2">نوع الرياضة *</label>
            <div className="grid grid-cols-2 gap-2">
              {sportOptions.map((s) => (
                <button key={s.value} onClick={() => set('sport_type', s.value)}
                  className={`text-xs py-2 px-3 rounded-xl border text-right ${form.sport_type === s.value ? 'border-[#0F6E56] bg-[#E8F5F1] text-[#0F6E56]' : 'border-[#E8ECEF] text-[#6B7280]'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4 space-y-4">
          <h2 className="text-sm font-bold text-[#1A1A1A]">الموقع</h2>

          <div>
            <label className="block text-xs font-medium text-[#1A1A1A] mb-1">المدينة *</label>
            <select value={form.city} onChange={(e) => set('city', e.target.value)}
              className="w-full border border-[#E8ECEF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56]">
              <option value="">اختر المدينة</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1A1A1A] mb-1">الحي</label>
            <input value={form.district} onChange={(e) => set('district', e.target.value)}
              placeholder="مثال: حي النزهة"
              className="w-full border border-[#E8ECEF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56]" />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1A1A1A] mb-1">العنوان التفصيلي</label>
            <input value={form.address} onChange={(e) => set('address', e.target.value)}
              placeholder="مثال: شارع الأمير سلطان، بجوار مسجد النور"
              className="w-full border border-[#E8ECEF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56]" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4 space-y-4">
          <h2 className="text-sm font-bold text-[#1A1A1A]">معلومات إضافية</h2>

          <div>
            <label className="block text-xs font-medium text-[#1A1A1A] mb-1">رقم التواصل</label>
            <div className="flex items-center border border-[#E8ECEF] rounded-xl overflow-hidden focus-within:border-[#0F6E56]" dir="ltr">
              <span className="px-3 py-2.5 text-sm text-[#6B7280] bg-[#F8F9FA] border-r border-[#E8ECEF] whitespace-nowrap">🇸🇦 +966</span>
              <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value.replace(/\D/g, '').slice(0, 9))}
                placeholder="5XXXXXXXX"
                className="flex-1 px-3 py-2.5 text-sm focus:outline-none bg-white" dir="ltr" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1A1A1A] mb-1">وصف الملعب</label>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)}
              placeholder="اكتب وصفاً مختصراً عن الملعب، المميزات، الخدمات..."
              rows={3}
              className="w-full border border-[#E8ECEF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56] resize-none" />
          </div>
        </div>

        {error && <p className="text-red-500 text-xs text-center">{error}</p>}

        <button onClick={save} disabled={saving}
          className="w-full bg-[#0F6E56] text-white py-3.5 rounded-2xl font-bold text-sm disabled:opacity-50">
          {saving ? 'جاري الحفظ...' : 'إضافة الملعب ←'}
        </button>

        <p className="text-xs text-center text-[#9CA3AF]">بعد الإضافة ستتمكن من ضبط أوقات وأسعار الحجز</p>
      </div>
    </div>
  )
}
