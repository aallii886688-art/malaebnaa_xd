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
    return <div className="min-h-screen flex items-center justify-center text-red-500">نشاط غير معروف</div>
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
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-[#F8F9FA]">
      <div className="text-6xl mb-4">✅</div>
      <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">تم إرسال الطلب</h2>
      <p className="text-sm text-[#6B7280] mb-6">سيتم مراجعة طلبك من قِبل الإدارة وإشعارك بالنتيجة قريباً</p>
      <button onClick={() => router.push('/partner')}
        className="bg-[#0F6E56] text-white px-6 py-3 rounded-2xl font-bold">
        العودة للوحة الشريك
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="bg-[#0F6E56] text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-white text-xl">←</button>
        <div>
          <p className="text-xs opacity-80">تفعيل نشاط</p>
          <h1 className="text-lg font-bold">{info.label}</h1>
        </div>
      </header>

      <div className="px-4 py-8 flex flex-col items-center text-center">
        <div className="text-7xl mb-4">{info.icon}</div>
        <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">{info.label}</h2>
        <p className="text-sm text-[#6B7280] mb-8 max-w-xs">{info.desc}</p>

        <div className="bg-[#E8F5F1] rounded-2xl border border-[#0F6E56]/20 p-4 w-full max-w-xs mb-8 text-right space-y-2">
          <p className="text-xs font-bold text-[#0F6E56] text-center mb-3">كيف تعمل؟</p>
          <p className="text-xs text-[#1A1A1A]">✓ تقدّم بطلب التفعيل</p>
          <p className="text-xs text-[#1A1A1A]">✓ تراجع الإدارة طلبك خلال 24 ساعة</p>
          <p className="text-xs text-[#1A1A1A]">✓ عند الموافقة تظهر في لوحتك</p>
          <p className="text-xs text-[#1A1A1A]">✓ ابدأ إدارة نشاطك فوراً</p>
        </div>

        {error && <p className="text-red-500 text-xs mb-4">{error}</p>}

        <button onClick={submit} disabled={loading}
          className="w-full max-w-xs bg-[#0F6E56] text-white py-3.5 rounded-2xl font-bold text-sm disabled:opacity-50">
          {loading ? 'جاري الإرسال...' : 'تقديم طلب التفعيل'}
        </button>
      </div>
    </div>
  )
}
