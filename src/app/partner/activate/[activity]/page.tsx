'use client'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const activityInfo: Record<string, { label: string; icon: string; desc: string; fields: string[] }> = {
  facility_manager: {
    label: 'مدير ملعب',
    icon: '🏟️',
    desc: 'أضف ملاعبك وأوقاتها وأسعارها واستقبل حجوزات اللاعبين',
    fields: ['اسم الملعب / المجمع الرياضي', 'المدينة', 'رقم السجل التجاري (اختياري)', 'رقم التواصل', 'ملاحظات إضافية'],
  },
  academy_manager: {
    label: 'مدير أكاديمية',
    icon: '🏅',
    desc: 'أنشئ أكاديميتك الرياضية وأدر برامجها التدريبية وأعضاءها',
    fields: ['اسم الأكاديمية', 'المدينة', 'رقم السجل التجاري (اختياري)', 'رقم التواصل', 'ملاحظات إضافية'],
  },
  tournament_manager: {
    label: 'منظم بطولة',
    icon: '🏆',
    desc: 'نظّم بطولات رياضية وأدر الفرق والمباريات والنتائج',
    fields: ['اسم الجهة المنظمة', 'المدينة', 'رقم السجل التجاري (اختياري)', 'رقم التواصل', 'ملاحظات إضافية'],
  },
}

export default function ActivatePage() {
  const { activity } = useParams<{ activity: string }>()
  const router = useRouter()
  const info = activityInfo[activity]

  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    business_name: '',
    business_city: '',
    commercial_reg: '',
    applicant_phone: '',
    applicant_notes: '',
  })

  if (!info) return (
    <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}>
      نشاط غير معروف
    </div>
  )

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async () => {
    if (!form.business_name.trim() || !form.business_city.trim() || !form.applicant_phone.trim()) {
      setError('يرجى تعبئة الاسم والمدينة ورقم التواصل على الأقل')
      return
    }
    setLoading(true); setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error: err } = await supabase.from('partner_roles').insert({
      user_id: user.id,
      activity,
      status: 'pending',
      business_name: form.business_name.trim(),
      business_city: form.business_city.trim(),
      commercial_reg: form.commercial_reg.trim() || null,
      applicant_phone: form.applicant_phone.trim(),
      applicant_notes: form.applicant_notes.trim() || null,
    })

    if (err) {
      if (err.code === '23505') setError('لقد تقدمت بهذا الطلب من قبل، يرجى انتظار المراجعة')
      else setError(err.message)
      setLoading(false)
      return
    }
    setDone(true)
    setLoading(false)
  }

  if (done) return (
    <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 16px', textAlign: 'center', background: 'var(--bg)' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>تم إرسال الطلب</h2>
      <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 24, maxWidth: 300 }}>سيتم مراجعة طلبك من قِبل الإدارة خلال 24 ساعة وإشعارك بالنتيجة</p>
      <button onClick={() => router.push('/partner')}
        style={{ background: 'var(--primary)', color: 'var(--primary-fg)', padding: '12px 32px', borderRadius: 20, fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer' }}>
        العودة للوحة الشريك
      </button>
    </div>
  )

  const inputStyle: React.CSSProperties = {
    width: '100%', border: '1px solid var(--border)', borderRadius: 12, padding: '11px 12px',
    fontSize: 14, outline: 'none', background: 'var(--card)', color: 'var(--text)',
    boxSizing: 'border-box', marginBottom: 14,
  }

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)', paddingBottom: 40 }}>
      <header style={{ background: 'var(--bg2)', padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ fontSize: 20, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text)' }}>←</button>
        <div>
          <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>تفعيل نشاط</p>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{info.icon} {info.label}</h1>
        </div>
      </header>

      <div style={{ padding: '20px 16px', maxWidth: 480, margin: '0 auto' }}>
        {/* Info card */}
        <div style={{ background: 'var(--primary-dim)', borderRadius: 18, border: '1px solid var(--primary)', padding: '14px 16px', marginBottom: 24 }}>
          <p style={{ fontSize: 13, color: 'var(--primary)', margin: 0 }}>{info.desc}</p>
        </div>

        {/* Form */}
        <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>تفاصيل الطلب</p>

          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 5 }}>
            {info.fields[0]} <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input value={form.business_name} onChange={set('business_name')} placeholder="أدخل الاسم" style={inputStyle} />

          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 5 }}>
            المدينة <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input value={form.business_city} onChange={set('business_city')} placeholder="مثال: الرياض" style={inputStyle} />

          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 5 }}>
            رقم التواصل <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input value={form.applicant_phone} onChange={set('applicant_phone')} placeholder="05XXXXXXXX" type="tel" inputMode="numeric" style={inputStyle} dir="ltr" />

          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 5 }}>
            رقم السجل التجاري <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(اختياري)</span>
          </label>
          <input value={form.commercial_reg} onChange={set('commercial_reg')} placeholder="10XXXXXXXX" style={inputStyle} dir="ltr" />

          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 5 }}>
            ملاحظات إضافية <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(اختياري)</span>
          </label>
          <textarea value={form.applicant_notes} onChange={set('applicant_notes')}
            placeholder="أي معلومات إضافية تود إضافتها..." rows={3}
            style={{ ...inputStyle, resize: 'none', fontFamily: 'inherit' }} />

          {error && <p style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 12 }}>{error}</p>}

          <button onClick={submit} disabled={loading}
            style={{ width: '100%', background: 'var(--primary)', color: 'var(--primary-fg)', padding: '14px', borderRadius: 14, fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}>
            {loading ? 'جاري الإرسال...' : 'إرسال طلب التفعيل'}
          </button>
        </div>
      </div>
    </div>
  )
}
