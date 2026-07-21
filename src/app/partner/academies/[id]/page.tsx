'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'

type Academy = { id: string; name: string; city: string; phone: string | null; description: string | null; is_active: boolean; sport_types: string[] }
type Program = { id: string; name: string; sport_type: string; coach_name: string | null; max_students: number; current_students: number; monthly_price_sar: number | null; program_price_sar: number | null; pricing_type: string; is_active: boolean; age_min: number | null; age_max: number | null }

const sportLabel: Record<string, string> = {
  football: '⚽ كرة قدم', futsal: '🥅 فوتسال', padel: '🎾 بادل', basketball: '🏀 كرة سلة',
  volleyball: '🏐 كرة طائرة', tennis: '🎾 تنس', squash: '🏸 سكواش', swimming: '🏊 سباحة', other: '🏅 أخرى',
}

const defaultProg = { name: '', sport_type: 'football', coach_name: '', age_min: '', age_max: '', max_students: '20', pricing_type: 'monthly', monthly_price_sar: '', program_price_sar: '' }

export default function AcademyManagePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [academy, setAcademy] = useState<Academy | null>(null)
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'info' | 'programs'>('info')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(defaultProg)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    const supabase = createClient()
    const [{ data: a }, { data: p }] = await Promise.all([
      supabase.from('academies').select('*').eq('id', id).single(),
      supabase.from('academy_programs').select('*').eq('academy_id', id).order('created_at'),
    ])
    setAcademy(a as Academy); setPrograms((p as Program[]) ?? []); setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const toggleActive = async () => {
    if (!academy) return
    const supabase = createClient()
    await supabase.from('academies').update({ is_active: !academy.is_active }).eq('id', id)
    setAcademy((a) => a ? { ...a, is_active: !a.is_active } : a)
  }

  const saveProgram = async () => {
    if (!form.name.trim() || !form.max_students) { setError('الاسم والحد الأقصى للطلاب مطلوبان'); return }
    setSaving(true); setError('')
    const supabase = createClient()
    const { error: err } = await supabase.from('academy_programs').insert({
      academy_id: id, name: form.name, sport_type: form.sport_type,
      coach_name: form.coach_name || null, age_min: form.age_min ? +form.age_min : null,
      age_max: form.age_max ? +form.age_max : null, max_students: +form.max_students,
      pricing_type: form.pricing_type,
      monthly_price_sar: form.monthly_price_sar ? +form.monthly_price_sar : null,
      program_price_sar: form.program_price_sar ? +form.program_price_sar : null,
    })
    if (err) { setError(err.message); setSaving(false); return }
    setShowForm(false); setForm(defaultProg); await load(); setSaving(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#6B7280]">جاري التحميل...</div>
  if (!academy) return <div className="min-h-screen flex items-center justify-center text-red-500">الأكاديمية غير موجودة</div>

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="bg-[#0F6E56] text-white px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-xl">←</button>
          <div><p className="text-xs opacity-80">إدارة الأكاديمية</p><h1 className="text-base font-bold">{academy.name}</h1></div>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${academy.is_active ? 'bg-white/20' : 'bg-red-400/30 text-red-100'}`}>
          {academy.is_active ? '🟢 نشط' : '🔴 موقوف'}
        </span>
      </header>

      <div className="flex bg-white border-b border-[#E8ECEF]">
        {(['info', 'programs'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-medium ${tab === t ? 'text-[#0F6E56] border-b-2 border-[#0F6E56]' : 'text-[#6B7280]'}`}>
            {t === 'info' ? '📋 المعلومات' : `🏃 البرامج (${programs.length})`}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 pb-10 space-y-3">
        {tab === 'info' ? (
          <>
            <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4 space-y-3">
              <div><p className="text-xs text-[#9CA3AF]">المدينة</p><p className="text-sm text-[#1A1A1A] mt-0.5">📍 {academy.city}</p></div>
              <div><p className="text-xs text-[#9CA3AF]">الرياضات</p><p className="text-sm text-[#1A1A1A] mt-0.5">{academy.sport_types.map((s) => sportLabel[s]).join(' · ')}</p></div>
              {academy.phone && <div><p className="text-xs text-[#9CA3AF]">الجوال</p><p className="text-sm text-[#0F6E56] mt-0.5" dir="ltr">+966{academy.phone}</p></div>}
              {academy.description && <div><p className="text-xs text-[#9CA3AF]">الوصف</p><p className="text-sm text-[#1A1A1A] mt-0.5">{academy.description}</p></div>}
            </div>
            <button onClick={toggleActive}
              className={`w-full py-3 rounded-2xl font-semibold text-sm border ${academy.is_active ? 'border-red-300 text-red-500' : 'border-[#0F6E56] text-[#0F6E56]'}`}>
              {academy.is_active ? '⏸ إيقاف الأكاديمية' : '▶ تفعيل الأكاديمية'}
            </button>
          </>
        ) : (
          <>
            <div className="flex justify-end">
              <button onClick={() => setShowForm(true)} className="text-xs bg-[#0F6E56] text-white px-3 py-1.5 rounded-xl">+ برنامج جديد</button>
            </div>
            {programs.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-4xl mb-2">🏃</p>
                <p className="text-sm text-[#6B7280]">لا توجد برامج بعد</p>
              </div>
            ) : programs.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl border border-[#E8ECEF] p-4">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <p className="font-bold text-[#1A1A1A] text-sm">{p.name}</p>
                    <p className="text-xs text-[#6B7280]">{sportLabel[p.sport_type]}</p>
                    {p.coach_name && <p className="text-xs text-[#9CA3AF]">المدرب: {p.coach_name}</p>}
                    {(p.age_min || p.age_max) && <p className="text-xs text-[#9CA3AF]">العمر: {p.age_min ?? '?'} – {p.age_max ?? '?'} سنة</p>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_active ? 'bg-[#E8F5F1] text-[#0F6E56]' : 'bg-gray-100 text-gray-400'}`}>
                    {p.is_active ? 'نشط' : 'موقوف'}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs">
                  <span className="text-[#6B7280]">👥 {p.current_students}/{p.max_students}</span>
                  {p.monthly_price_sar && <span className="text-[#0F6E56] font-bold">{p.monthly_price_sar} ر/شهر</span>}
                  {p.program_price_sar && <span className="text-[#0F6E56] font-bold">{p.program_price_sar} ر/برنامج</span>}
                </div>
                <div className="w-full bg-[#F8F9FA] rounded-full h-1.5 mt-2">
                  <div className="bg-[#0F6E56] h-1.5 rounded-full" style={{ width: `${Math.min((p.current_students / p.max_students) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-t-2xl p-5 w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-[#1A1A1A] mb-4">إضافة برنامج تدريبي</h3>

            {[
              { label: 'اسم البرنامج *', key: 'name', placeholder: 'مثال: برنامج كرة القدم للناشئين' },
              { label: 'اسم المدرب', key: 'coach_name', placeholder: 'اسم المدرب' },
            ].map(({ label, key, placeholder }) => (
              <div key={key} className="mb-3">
                <label className="block text-xs font-medium text-[#1A1A1A] mb-1">{label}</label>
                <input value={(form as Record<string, string>)[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder} className="w-full border border-[#E8ECEF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56]" />
              </div>
            ))}

            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { label: 'العمر من', key: 'age_min', placeholder: '8' },
                { label: 'العمر إلى', key: 'age_max', placeholder: '16' },
                { label: 'الحد الأقصى *', key: 'max_students', placeholder: '20' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-[#1A1A1A] mb-1">{label}</label>
                  <input type="number" value={(form as Record<string, string>)[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder} className="w-full border border-[#E8ECEF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56]" />
                </div>
              ))}
            </div>

            <label className="block text-xs font-medium text-[#1A1A1A] mb-2">نوع السعر</label>
            <div className="flex gap-2 mb-3">
              {[{ v: 'monthly', l: 'شهري' }, { v: 'program', l: 'برنامج' }, { v: 'both', l: 'كلاهما' }].map(({ v, l }) => (
                <button key={v} onClick={() => setForm((f) => ({ ...f, pricing_type: v }))}
                  className={`flex-1 text-xs py-2 rounded-xl border ${form.pricing_type === v ? 'border-[#0F6E56] bg-[#E8F5F1] text-[#0F6E56]' : 'border-[#E8ECEF] text-[#6B7280]'}`}>{l}</button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {(form.pricing_type === 'monthly' || form.pricing_type === 'both') && (
                <div>
                  <label className="block text-xs font-medium text-[#1A1A1A] mb-1">السعر الشهري (ريال)</label>
                  <input type="number" value={form.monthly_price_sar} onChange={(e) => setForm((f) => ({ ...f, monthly_price_sar: e.target.value }))}
                    placeholder="500" className="w-full border border-[#E8ECEF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56]" />
                </div>
              )}
              {(form.pricing_type === 'program' || form.pricing_type === 'both') && (
                <div>
                  <label className="block text-xs font-medium text-[#1A1A1A] mb-1">سعر البرنامج (ريال)</label>
                  <input type="number" value={form.program_price_sar} onChange={(e) => setForm((f) => ({ ...f, program_price_sar: e.target.value }))}
                    placeholder="1500" className="w-full border border-[#E8ECEF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56]" />
                </div>
              )}
            </div>

            {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
            <div className="flex gap-2">
              <button onClick={saveProgram} disabled={saving}
                className="flex-1 bg-[#0F6E56] text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50">
                {saving ? 'جاري الحفظ...' : 'حفظ البرنامج'}
              </button>
              <button onClick={() => { setShowForm(false); setError('') }}
                className="flex-1 border border-[#E8ECEF] py-2.5 rounded-xl text-sm">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
