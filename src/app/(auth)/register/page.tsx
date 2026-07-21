'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type AccountType = 'player' | 'partner'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ full_name: '', phone: '', account_type: 'player' as AccountType })
  const [otp, setOtp] = useState('')

  const formatPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, '')
    if (digits.startsWith('05') && digits.length === 10) return '+966' + digits.slice(1)
    return raw
  }

  const sendOtp = async () => {
    if (!form.full_name || !form.phone) { setError('يرجى تعبئة جميع الحقول'); return }
    setLoading(true)
    setError('')
    const formattedPhone = formatPhone(form.phone)
    const { error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
      options: { data: { full_name: form.full_name, phone: formattedPhone, account_type: form.account_type } }
    })
    if (error) { setError(error.message); setLoading(false); return }
    setStep('otp')
    setLoading(false)
  }

  const verifyOtp = async () => {
    setLoading(true)
    setError('')
    const formattedPhone = formatPhone(form.phone)
    const { data, error } = await supabase.auth.verifyOtp({ phone: formattedPhone, token: otp, type: 'sms' })
    if (error) { setError('رمز التحقق غير صحيح'); setLoading(false); return }

    // Insert role
    if (data.user) {
      await supabase.from('user_roles').upsert({ user_id: data.user.id, role: form.account_type === 'partner' ? 'partner' : 'player' })
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-[#F8F9FA]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">⚽</div>
          <h1 className="text-2xl font-bold text-[#0F6E56]">ملاعبنا</h1>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8ECEF] p-6">
          {step === 'form' ? (
            <>
              <h2 className="text-lg font-bold text-[#1A1A1A] mb-1">إنشاء حساب جديد</h2>
              <p className="text-sm text-[#6B7280] mb-6">اختر نوع حسابك وأدخل بياناتك</p>

              {/* Account type selector */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                {(['player', 'partner'] as AccountType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setForm((f) => ({ ...f, account_type: type }))}
                    className={`border-2 rounded-xl p-3 text-center transition-all ${
                      form.account_type === type
                        ? 'border-[#0F6E56] bg-[#E8F5F1]'
                        : 'border-[#E8ECEF] bg-white'
                    }`}
                  >
                    <div className="text-2xl mb-1">{type === 'player' ? '🏃' : '🏟️'}</div>
                    <div className={`text-sm font-semibold ${form.account_type === type ? 'text-[#0F6E56]' : 'text-[#1A1A1A]'}`}>
                      {type === 'player' ? 'لاعب' : 'شريك'}
                    </div>
                    <div className="text-xs text-[#6B7280] mt-0.5">
                      {type === 'player' ? 'احجز وشارك' : 'أدر منشأتك'}
                    </div>
                  </button>
                ))}
              </div>
              {form.account_type === 'partner' && (
                <p className="text-xs text-[#6B7280] bg-[#F8F9FA] rounded-lg p-3 mb-4">
                  تفعيل أنشطة الشركاء يتم من داخل الحساب ويحتاج موافقة الإدارة
                </p>
              )}

              <label className="block text-sm font-medium text-[#1A1A1A] mb-1">الاسم الكامل</label>
              <input
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                placeholder="الاسم الرباعي"
                className="w-full border border-[#E8ECEF] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#0F6E56] mb-4"
              />

              <label className="block text-sm font-medium text-[#1A1A1A] mb-1">رقم الجوال</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="05XXXXXXXX"
                className="w-full border border-[#E8ECEF] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#0F6E56] mb-5"
                dir="ltr"
              />

              {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
              <button
                onClick={sendOtp}
                disabled={loading}
                className="w-full bg-[#0F6E56] text-white py-3 rounded-xl font-semibold disabled:opacity-50"
              >
                {loading ? 'جاري الإرسال...' : 'إرسال رمز التحقق'}
              </button>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-[#1A1A1A] mb-1">التحقق من الجوال</h2>
              <p className="text-sm text-[#6B7280] mb-6">تم إرسال رمز التحقق إلى {form.phone}</p>

              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                maxLength={6}
                className="w-full border border-[#E8ECEF] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#0F6E56] mb-4 text-center text-xl tracking-widest"
                dir="ltr"
              />
              {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
              <button
                onClick={verifyOtp}
                disabled={loading || otp.length < 6}
                className="w-full bg-[#0F6E56] text-white py-3 rounded-xl font-semibold disabled:opacity-50 mb-3"
              >
                {loading ? 'جاري التحقق...' : 'إنشاء الحساب'}
              </button>
              <button onClick={() => setStep('form')} className="w-full text-sm text-[#6B7280]">
                رجوع
              </button>
            </>
          )}
        </div>

        <p className="text-center text-sm text-[#6B7280] mt-4">
          لديك حساب؟{' '}
          <Link href="/login" className="text-[#0F6E56] font-medium">سجل دخول</Link>
        </p>
      </div>
    </div>
  )
}
