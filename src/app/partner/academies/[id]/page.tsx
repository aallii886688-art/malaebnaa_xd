'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import DynamicFields, { type DynamicFieldsHandle, saveDynamicFieldValues } from '@/components/DynamicFields'

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
  const [userId, setUserId] = useState<string | null>(null)
  const dynamicRef = useRef<DynamicFieldsHandle>(null)

  const load = async () => {
    const supabase = createClient()
    const [{ data: a }, { data: p }] = await Promise.all([
      supabase.from('academies').select('*').eq('id', id).single(),
      supabase.from('academy_programs').select('*').eq('academy_id', id).order('created_at'),
    ])
    setAcademy(a as Academy); setPrograms((p as Program[]) ?? []); setLoading(false)
  }

  useEffect(() => { load() }, [id])

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => { if (user) setUserId(user.id) })
  }, [])

  const toggleActive = async () => {
    if (!academy) return
    const supabase = createClient()
    await supabase.from('academies').update({ is_active: !academy.is_active }).eq('id', id)
    setAcademy((a) => a ? { ...a, is_active: !a.is_active } : a)
  }

  const saveProgram = async () => {
    if (!form.name.trim() || !form.max_students) { setError('الاسم والحد الأقصى للطلاب مطلوبان'); return }
    if (dynamicRef.current && !dynamicRef.current.validate()) return
    setSaving(true); setError('')
    const supabase = createClient()
    const { data, error: err } = await supabase.from('academy_programs').insert({
      academy_id: id, name: form.name, sport_type: form.sport_type,
      coach_name: form.coach_name || null, age_min: form.age_min ? +form.age_min : null,
      age_max: form.age_max ? +form.age_max : null, max_students: +form.max_students,
      pricing_type: form.pricing_type,
      monthly_price_sar: form.monthly_price_sar ? +form.monthly_price_sar : null,
      program_price_sar: form.program_price_sar ? +form.program_price_sar : null,
    }).select('id').single()
    if (err) { setError(err.message); setSaving(false); return }
    if (dynamicRef.current && data?.id && userId) {
      await saveDynamicFieldValues(dynamicRef.current.getValues(), data.id, 'academy_programs', userId)
    }
    setShowForm(false); setForm(defaultProg); await load(); setSaving(false)
  }

  if (loading) return <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>جاري التحميل...</div>
  if (!academy) return <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}>الأكاديمية غير موجودة</div>

  const inputStyle = { width: '100%', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px', fontSize: 13, outline: 'none', background: 'transparent', color: 'var(--text)', boxSizing: 'border-box' as const }

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <header style={{ background: 'var(--bg2)', padding: '52px 16px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()} style={{ fontSize: 20, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text)' }}>←</button>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>إدارة الأكاديمية</p>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{academy.name}</h1>
          </div>
        </div>
        <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, background: academy.is_active ? 'var(--primary-dim)' : 'var(--danger-dim)', color: academy.is_active ? 'var(--primary)' : 'var(--danger)' }}>
          {academy.is_active ? '🟢 نشط' : '🔴 موقوف'}
        </span>
      </header>

      <div style={{ display: 'flex', background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
        {(['info', 'programs'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, padding: '12px', fontSize: 13, fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer', color: tab === t ? 'var(--primary)' : 'var(--text2)', borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent' }}>
            {t === 'info' ? '📋 المعلومات' : `🏃 البرامج (${programs.length})`}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px 16px 40px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {tab === 'info' ? (
          <>
            <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><p style={{ fontSize: 11, color: 'var(--text3)', margin: '0 0 2px' }}>المدينة</p><p style={{ fontSize: 13, color: 'var(--text)', margin: 0 }}>📍 {academy.city}</p></div>
              <div><p style={{ fontSize: 11, color: 'var(--text3)', margin: '0 0 2px' }}>الرياضات</p><p style={{ fontSize: 13, color: 'var(--text)', margin: 0 }}>{academy.sport_types.map((s) => sportLabel[s]).join(' · ')}</p></div>
              {academy.phone && <div><p style={{ fontSize: 11, color: 'var(--text3)', margin: '0 0 2px' }}>الجوال</p><p style={{ fontSize: 13, color: 'var(--primary)', margin: 0 }} dir="ltr">+966{academy.phone}</p></div>}
              {academy.description && <div><p style={{ fontSize: 11, color: 'var(--text3)', margin: '0 0 2px' }}>الوصف</p><p style={{ fontSize: 13, color: 'var(--text)', margin: 0 }}>{academy.description}</p></div>}
            </div>
            <button onClick={toggleActive}
              style={{ width: '100%', padding: '12px', borderRadius: 20, fontWeight: 700, fontSize: 13, background: 'transparent', cursor: 'pointer', border: `1px solid ${academy.is_active ? 'var(--danger)' : 'var(--primary)'}`, color: academy.is_active ? 'var(--danger)' : 'var(--primary)' }}>
              {academy.is_active ? '⏸ إيقاف الأكاديمية' : '▶ تفعيل الأكاديمية'}
            </button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowForm(true)} style={{ fontSize: 12, background: 'var(--primary)', color: 'var(--primary-fg)', padding: '6px 14px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 600 }}>+ برنامج جديد</button>
            </div>
            {programs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <p style={{ fontSize: 40, marginBottom: 8 }}>🏃</p>
                <p style={{ fontSize: 13, color: 'var(--text2)' }}>لا توجد برامج بعد</p>
              </div>
            ) : programs.map((p) => (
              <div key={p.id} style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div>
                    <p style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13, margin: '0 0 2px' }}>{p.name}</p>
                    <p style={{ fontSize: 12, color: 'var(--text2)', margin: '0 0 2px' }}>{sportLabel[p.sport_type]}</p>
                    {p.coach_name && <p style={{ fontSize: 12, color: 'var(--text3)', margin: '0 0 2px' }}>المدرب: {p.coach_name}</p>}
                    {(p.age_min || p.age_max) && <p style={{ fontSize: 12, color: 'var(--text3)', margin: 0 }}>العمر: {p.age_min ?? '?'} – {p.age_max ?? '?'} سنة</p>}
                  </div>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: p.is_active ? 'var(--primary-dim)' : 'var(--bg)', color: p.is_active ? 'var(--primary)' : 'var(--text3)' }}>
                    {p.is_active ? 'نشط' : 'موقوف'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, fontSize: 12 }}>
                  <span style={{ color: 'var(--text2)' }}>👥 {p.current_students}/{p.max_students}</span>
                  {p.monthly_price_sar && <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{p.monthly_price_sar} ر/شهر</span>}
                  {p.program_price_sar && <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{p.program_price_sar} ر/برنامج</span>}
                </div>
                <div style={{ width: '100%', background: 'var(--bg)', borderRadius: 20, height: 6, marginTop: 8 }}>
                  <div style={{ background: 'var(--primary)', height: 6, borderRadius: 20, width: `${Math.min((p.current_students / p.max_students) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 50 }} onClick={() => setShowForm(false)}>
          <div style={{ background: 'var(--card)', borderRadius: '20px 20px 0 0', padding: 20, width: '100%', maxHeight: '85svh', overflowY: 'auto', boxSizing: 'border-box' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>إضافة برنامج تدريبي</h3>

            {[
              { label: 'اسم البرنامج *', key: 'name', placeholder: 'مثال: برنامج كرة القدم للناشئين' },
              { label: 'اسم المدرب', key: 'coach_name', placeholder: 'اسم المدرب' },
            ].map(({ label, key, placeholder }) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>{label}</label>
                <input value={(form as Record<string, string>)[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder} style={inputStyle} />
              </div>
            ))}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
              {[
                { label: 'العمر من', key: 'age_min', placeholder: '8' },
                { label: 'العمر إلى', key: 'age_max', placeholder: '16' },
                { label: 'الحد الأقصى *', key: 'max_students', placeholder: '20' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>{label}</label>
                  <input type="number" value={(form as Record<string, string>)[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder} style={{ ...inputStyle, padding: '8px 10px' }} />
                </div>
              ))}
            </div>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>نوع السعر</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {[{ v: 'monthly', l: 'شهري' }, { v: 'program', l: 'برنامج' }, { v: 'both', l: 'كلاهما' }].map(({ v, l }) => (
                <button key={v} onClick={() => setForm((f) => ({ ...f, pricing_type: v }))}
                  style={{ flex: 1, fontSize: 12, padding: '8px', borderRadius: 12, border: `1px solid ${form.pricing_type === v ? 'var(--primary)' : 'var(--border)'}`, background: form.pricing_type === v ? 'var(--primary-dim)' : 'transparent', color: form.pricing_type === v ? 'var(--primary)' : 'var(--text2)', cursor: 'pointer' }}>{l}</button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              {(form.pricing_type === 'monthly' || form.pricing_type === 'both') && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>السعر الشهري (ريال)</label>
                  <input type="number" value={form.monthly_price_sar} onChange={(e) => setForm((f) => ({ ...f, monthly_price_sar: e.target.value }))}
                    placeholder="500" style={inputStyle} />
                </div>
              )}
              {(form.pricing_type === 'program' || form.pricing_type === 'both') && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>سعر البرنامج (ريال)</label>
                  <input type="number" value={form.program_price_sar} onChange={(e) => setForm((f) => ({ ...f, program_price_sar: e.target.value }))}
                    placeholder="1500" style={inputStyle} />
                </div>
              )}
            </div>

            {userId && (
              <div style={{ marginBottom: 12 }}>
                <DynamicFields ref={dynamicRef} ownerId={userId} activity="academy_manager" useIn="academy_program" />
              </div>
            )}

            {error && <p style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 12 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={saveProgram} disabled={saving}
                style={{ flex: 1, background: 'var(--primary)', color: 'var(--primary-fg)', padding: '10px', borderRadius: 14, fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>
                {saving ? 'جاري الحفظ...' : 'حفظ البرنامج'}
              </button>
              <button onClick={() => { setShowForm(false); setError('') }}
                style={{ flex: 1, border: '1px solid var(--border)', padding: '10px', borderRadius: 14, fontSize: 13, background: 'transparent', color: 'var(--text2)', cursor: 'pointer' }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
