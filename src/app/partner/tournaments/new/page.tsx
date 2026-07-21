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

  const inputStyle = { width: '100%', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px', fontSize: 13, outline: 'none', background: 'transparent', color: 'var(--text)', boxSizing: 'border-box' as const }
  const labelStyle = { display: 'block' as const, fontSize: 12, fontWeight: 600 as const, color: 'var(--text)', marginBottom: 6 }

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <header style={{ background: 'var(--bg2)', padding: '52px 16px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ fontSize: 20, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text)' }}>←</button>
        <div>
          <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>الشريك</p>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>إنشاء بطولة</h1>
        </div>
      </header>

      <div style={{ padding: '16px 16px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>المعلومات الأساسية</h2>
          <div>
            <label style={labelStyle}>اسم البطولة *</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="مثال: كأس الرياض الخامس" style={inputStyle} />
          </div>
          <div>
            <label style={{ ...labelStyle, marginBottom: 8 }}>الرياضة *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {sportOptions.map((s) => (
                <button key={s.value} onClick={() => set('sport_type', s.value)}
                  style={{ fontSize: 12, padding: '8px 12px', borderRadius: 12, border: `1px solid ${form.sport_type === s.value ? 'var(--primary)' : 'var(--border)'}`, background: form.sport_type === s.value ? 'var(--primary-dim)' : 'transparent', color: form.sport_type === s.value ? 'var(--primary)' : 'var(--text2)', cursor: 'pointer', textAlign: 'right' }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ ...labelStyle, marginBottom: 8 }}>نظام البطولة *</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {systemOptions.map((s) => (
                <button key={s.value} onClick={() => set('system', s.value)}
                  style={{ fontSize: 12, padding: '10px 12px', borderRadius: 12, border: `1px solid ${form.system === s.value ? 'var(--primary)' : 'var(--border)'}`, background: form.system === s.value ? 'var(--primary-dim)' : 'transparent', color: form.system === s.value ? 'var(--primary)' : 'var(--text2)', cursor: 'pointer', textAlign: 'right' }}>
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
            <select value={form.city} onChange={(e) => set('city', e.target.value)} style={{ ...inputStyle, background: 'var(--card)' }}>
              <option value="">اختر المدينة</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>الملعب / الموقع</label>
            <input value={form.venue} onChange={(e) => set('venue', e.target.value)} placeholder="مثال: ملعب الأمير فيصل" style={inputStyle} />
          </div>
        </div>

        <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>إعدادات الفرق</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[
              { label: 'عدد الفرق *', key: 'max_teams', placeholder: '8' },
              { label: 'لاعبو الفريق', key: 'players_per_team', placeholder: '11' },
              { label: 'الاحتياطيون', key: 'substitutes_per_team', placeholder: '5' },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>{label}</label>
                <input type="number" value={(form as Record<string,string>)[key]} onChange={(e) => set(key, e.target.value)}
                  placeholder={placeholder} style={{ ...inputStyle, padding: '8px 10px' }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>رسوم التسجيل (ريال)</label>
              <input type="number" value={form.registration_fee_sar} onChange={(e) => set('registration_fee_sar', e.target.value)} placeholder="0" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>الفئة العمرية</label>
              <input value={form.age_group} onChange={(e) => set('age_group', e.target.value)} placeholder="مثال: تحت 18" style={inputStyle} />
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>التواريخ</h2>
          {[
            { label: 'آخر موعد للتسجيل', key: 'registration_deadline' },
            { label: 'تاريخ البداية', key: 'start_date' },
            { label: 'تاريخ النهاية', key: 'end_date' },
          ].map(({ label, key }) => (
            <div key={key}>
              <label style={labelStyle}>{label}</label>
              <input type="date" value={(form as Record<string,string>)[key]} onChange={(e) => set(key, e.target.value)} style={{ ...inputStyle, background: 'var(--card)' }} />
            </div>
          ))}
        </div>

        {error && <p style={{ color: 'var(--danger)', fontSize: 12, textAlign: 'center' }}>{error}</p>}
        <button onClick={save} disabled={saving}
          style={{ width: '100%', background: 'var(--primary)', color: 'var(--primary-fg)', padding: '14px', borderRadius: 20, fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>
          {saving ? 'جاري الإنشاء...' : 'إنشاء البطولة ←'}
        </button>
      </div>
    </div>
  )
}
