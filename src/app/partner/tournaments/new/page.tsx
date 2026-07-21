'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { sanitizeText, enforceLimit } from '@/lib/sanitize'

const sportOptions = [
  { value: 'football', label: '⚽ كرة قدم' }, { value: 'futsal', label: '🥅 فوتسال' },
  { value: 'padel', label: '🎾 بادل' }, { value: 'basketball', label: '🏀 كرة سلة' },
  { value: 'volleyball', label: '🏐 كرة طائرة' }, { value: 'other', label: '🏅 أخرى' },
]

const systemOptions = [
  { value: 'knockout', label: '⚡ خروج المغلوب' },
  { value: 'league', label: '📊 دوري' },
  { value: 'groups_knockout', label: '🏟️ مجموعات + خروج المغلوب' },
]

const cities = ['الرياض', 'جدة', 'مكة المكرمة', 'المدينة المنورة', 'الدمام', 'الخبر', 'تبوك', 'أبها', 'القصيم']

export default function NewTournamentPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '', sport_type: 'football', system: 'knockout', city: '',
    venue: '', max_teams: '8', players_per_team: '11', substitutes_per_team: '5',
    registration_fee_sar: '0', age_group: '',
    start_date: '', end_date: '', registration_deadline: '',
    description: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.name.trim() || !form.city || !form.max_teams) { setError('الاسم والمدينة وعدد الفرق مطلوبة'); return }
    setSaving(true); setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data, error: err } = await supabase.from('tournaments').insert({
      owner_id: user.id,
      name: enforceLimit(sanitizeText(form.name), 'name'),
      sport_type: form.sport_type,
      system: form.system,
      city: form.city,
      venue: form.venue ? enforceLimit(sanitizeText(form.venue), 'short_text') : null,
      max_teams: Math.min(Math.max(2, +form.max_teams), 128),
      players_per_team: Math.min(Math.max(1, +form.players_per_team), 30),
      substitutes_per_team: Math.min(Math.max(0, +form.substitutes_per_team), 15),
      registration_fee_sar: Math.max(0, +form.registration_fee_sar),
      age_group: form.age_group ? enforceLimit(sanitizeText(form.age_group), 'short_text') : null,
      description: form.description ? enforceLimit(sanitizeText(form.description), 'description') : null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      registration_deadline: form.registration_deadline || null,
      status: 'upcoming',
    }).select('id').single()
    if (err) { setError(err.message); setSaving(false); return }
    router.push(`/partner/tournaments/${data.id}`)
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="bg-[#0F6E56] text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-xl">←</button>
        <div><p className="text-xs opacity-80">الشريك</p><h1 className="text-lg font-bold">إنشاء بطولة</h1></div>
      </header>

      <div className="px-4 py-4 space-y-4 pb-10">
        {/* Basic info */}
        <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4 space-y-4">
          <h2 className="text-sm font-bold text-[#1A1A1A]">المعلومات الأساسية</h2>
          <div>
            <label className="block text-xs font-medium text-[#1A1A1A] mb-1">اسم البطولة *</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="مثال: كأس الرياض الخامس"
              className="w-full border border-[#E8ECEF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#1A1A1A] mb-2">الرياضة *</label>
            <div className="grid grid-cols-2 gap-2">
              {sportOptions.map((s) => (
                <button key={s.value} onClick={() => set('sport_type', s.value)}
                  className={`text-xs py-2 px-3 rounded-xl border text-right ${form.sport_type === s.value ? 'border-[#0F6E56] bg-[#E8F5F1] text-[#0F6E56]' : 'border-[#E8ECEF] text-[#6B7280]'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#1A1A1A] mb-2">نظام البطولة *</label>
            <div className="space-y-2">
              {systemOptions.map((s) => (
                <button key={s.value} onClick={() => set('system', s.value)}
                  className={`w-full text-xs py-2.5 px-3 rounded-xl border text-right ${form.system === s.value ? 'border-[#0F6E56] bg-[#E8F5F1] text-[#0F6E56]' : 'border-[#E8ECEF] text-[#6B7280]'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Location */}
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
            <label className="block text-xs font-medium text-[#1A1A1A] mb-1">الملعب / الموقع</label>
            <input value={form.venue} onChange={(e) => set('venue', e.target.value)} placeholder="مثال: ملعب الأمير فيصل"
              className="w-full border border-[#E8ECEF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56]" />
          </div>
        </div>

        {/* Teams config */}
        <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4 space-y-4">
          <h2 className="text-sm font-bold text-[#1A1A1A]">إعدادات الفرق</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'عدد الفرق *', key: 'max_teams', placeholder: '8' },
              { label: 'لاعبو الفريق', key: 'players_per_team', placeholder: '11' },
              { label: 'الاحتياطيون', key: 'substitutes_per_team', placeholder: '5' },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-[#1A1A1A] mb-1">{label}</label>
                <input type="number" value={(form as Record<string,string>)[key]} onChange={(e) => set(key, e.target.value)}
                  placeholder={placeholder} className="w-full border border-[#E8ECEF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56]" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#1A1A1A] mb-1">رسوم التسجيل (ريال)</label>
              <input type="number" value={form.registration_fee_sar} onChange={(e) => set('registration_fee_sar', e.target.value)}
                placeholder="0" className="w-full border border-[#E8ECEF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1A1A1A] mb-1">الفئة العمرية</label>
              <input value={form.age_group} onChange={(e) => set('age_group', e.target.value)} placeholder="مثال: تحت 18"
                className="w-full border border-[#E8ECEF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56]" />
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4 space-y-4">
          <h2 className="text-sm font-bold text-[#1A1A1A]">التواريخ</h2>
          {[
            { label: 'آخر موعد للتسجيل', key: 'registration_deadline' },
            { label: 'تاريخ البداية', key: 'start_date' },
            { label: 'تاريخ النهاية', key: 'end_date' },
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-[#1A1A1A] mb-1">{label}</label>
              <input type="date" value={(form as Record<string,string>)[key]} onChange={(e) => set(key, e.target.value)}
                className="w-full border border-[#E8ECEF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56]" />
            </div>
          ))}
        </div>

        {error && <p className="text-red-500 text-xs text-center">{error}</p>}
        <button onClick={save} disabled={saving}
          className="w-full bg-[#0F6E56] text-white py-3.5 rounded-2xl font-bold text-sm disabled:opacity-50">
          {saving ? 'جاري الإنشاء...' : 'إنشاء البطولة ←'}
        </button>
      </div>
    </div>
  )
}
