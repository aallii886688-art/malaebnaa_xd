'use client'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const activityInfo: Record<string, { label: string; icon: string; desc: string }> = {
  facility_manager: { label: 'مدير ملعب', icon: '🏟️', desc: 'أضف ملاعبك وأوقاتها وأسعارها واستقبل حجوزات اللاعبين' },
  academy_manager: { label: 'مدير أكاديمية', icon: '🏅', desc: 'أنشئ أكاديميتك الرياضية وأدر برامجها التدريبية وأعضاءها' },
  tournament_manager: { label: 'منظم بطولة', icon: '🏆', desc: 'نظّم بطولات رياضية وأدر الفرق والمباريات والنتائج' },
}

export default function ActivatePage() {
  const { activity } = useParams<{ activity: string }>()
  const router = useRouter()
  const info = activityInfo[activity]
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  if (!info) {
    return (
      <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}>
        نشاط غير معروف
      </div>
    )
  }

  const submit = async () => {
    setLoading(true); setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error: err } = await supabase.from('partner_roles').insert({
      user_id: user.id,
      activity,
      status: 'pending',
    })

    if (err) {
      if (err.code === '23505') {
        setError('لقد تقدمت بهذا الطلب من قبل، يرجى انتظار المراجعة')
      } else {
        setError(err.message)
      }
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
      <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 24, maxWidth: 300 }}>سيتم مراجعة طلبك من قِبل الإدارة وإشعارك بالنتيجة قريباً</p>
      <button onClick={() => router.push('/partner')}
        style={{ background: 'var(--primary)', color: 'var(--primary-fg)', padding: '12px 24px', borderRadius: 20, fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>
        العودة للوحة الشريك
      </button>
    </div>
  )

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <header style={{ background: 'var(--bg2)', padding: '52px 16px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ fontSize: 20, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text)' }}>←</button>
        <div>
          <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>تفعيل نشاط</p>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{info.label}</h1>
        </div>
      </header>

      <div style={{ padding: '32px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>{info.icon}</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{info.label}</h2>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 32, maxWidth: 280 }}>{info.desc}</p>

        <div style={{ background: 'var(--primary-dim)', borderRadius: 20, border: '1px solid var(--border)', padding: 16, width: '100%', maxWidth: 320, marginBottom: 32, textAlign: 'right' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', textAlign: 'center', margin: '0 0 12px' }}>كيف تعمل؟</p>
          {['تقدّم بطلب التفعيل', 'تراجع الإدارة طلبك خلال 24 ساعة', 'عند الموافقة تظهر في لوحتك', 'ابدأ إدارة نشاطك فوراً'].map((step, i) => (
            <p key={i} style={{ fontSize: 12, color: 'var(--text)', margin: i > 0 ? '8px 0 0' : '0' }}>✓ {step}</p>
          ))}
        </div>

        {error && <p style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 16 }}>{error}</p>}

        <button onClick={submit} disabled={loading}
          style={{ width: '100%', maxWidth: 320, background: 'var(--primary)', color: 'var(--primary-fg)', padding: '14px', borderRadius: 20, fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}>
          {loading ? 'جاري الإرسال...' : 'تقديم طلب التفعيل'}
        </button>
      </div>
    </div>
  )
}
