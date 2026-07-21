'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { sanitizeText, enforceLimit } from '@/lib/sanitize'

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

  const toggleSport = (val: string) => setForm((f) => ({
    ...f,
    sport_types: f.sport_types.includes(val) ? f.sport_types.filter((s) => s !== val) : [...f.sport_types, val],
  }))

  const save = async () => {
    if (!form.name.trim() || !form.city || form.sport_types.length === 0) {
      setError('الاسم والمدينة ونوع الرياضة مطلوبة'); return
    }
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
    router.push(`/partner/academies/${data.id}`)
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="bg-[#0F6E56] text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-xl">←</button>
        <div><p className="text-xs opacity-80">الشريك</p><h1 className="text-lg font-bold">إضافة أكاديمية</h1></div>
      </header>

      <div className="px-4 py-4 space-y-4 pb-10">
        <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#1A1A1A] mb-1">اسم الأكاديمية *</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="مثال: أكاديمية النجوم"
              className="w-full border border-[#E8ECEF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56]" />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1A1A1A] mb-2">الرياضات *</label>
            <div className="grid grid-cols-2 gap-2">
              {sportOptions.map((s) => (
                <button key={s.value} onClick={() => toggleSport(s.value)}
                  className={`text-xs py-2 px-3 rounded-xl border text-right ${form.sport_types.includes(s.value) ? 'border-[#0F6E56] bg-[#E8F5F1] text-[#0F6E56]' : 'border-[#E8ECEF] text-[#6B7280]'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1A1A1A] mb-1">المدينة *</label>
            <select value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              className="w-full border border-[#E8ECEF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56]">
              <option value="">اختر المدينة</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1A1A1A] mb-1">رقم التواصل</label>
            <div className="flex items-center border border-[#E8ECEF] rounded-xl overflow-hidden focus-within:border-[#0F6E56]" dir="ltr">
              <span className="px-3 py-2.5 text-sm text-[#6B7280] bg-[#F8F9FA] border-r border-[#E8ECEF]">🇸🇦 +966</span>
              <input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 9) }))}
                placeholder="5XXXXXXXX" className="flex-1 px-3 py-2.5 text-sm focus:outline-none bg-white" dir="ltr" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1A1A1A] mb-1">وصف الأكاديمية</label>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="اكتب وصفاً عن الأكاديمية وما تقدمه..."
              rows={3} className="w-full border border-[#E8ECEF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56] resize-none" />
          </div>
        </div>

        {error && <p className="text-red-500 text-xs text-center">{error}</p>}
        <button onClick={save} disabled={saving}
          className="w-full bg-[#0F6E56] text-white py-3.5 rounded-2xl font-bold text-sm disabled:opacity-50">
          {saving ? 'جاري الحفظ...' : 'إضافة الأكاديمية ←'}
        </button>
        <p className="text-xs text-center text-[#9CA3AF]">بعد الإضافة ستتمكن من إضافة البرامج التدريبية</p>
      </div>
    </div>
  )
}
