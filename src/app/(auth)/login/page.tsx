'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [phone, setPhone] = useState('')
  const [formattedPhone, setFormattedPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const sendOtp = async () => {
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'حدث خطأ'); setLoading(false); return }
    setFormattedPhone(data.phone)
    setStep('otp')
    setLoading(false)
  }

  const verifyOtp = async () => {
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: formattedPhone, otp }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'رمز خاطئ'); setLoading(false); return }

    // تعيين الجلسة في المتصفح
    await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    })

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
          {step === 'phone' ? (
            <>
              <h2 className="text-lg font-bold text-[#1A1A1A] mb-1">تسجيل الدخول</h2>
              <p className="text-sm text-[#6B7280] mb-6">سيصلك رمز التحقق على واتساب</p>

              <label className="block text-sm font-medium text-[#1A1A1A] mb-1">رقم الجوال</label>
              <div className="flex items-center border border-[#E8ECEF] rounded-xl overflow-hidden mb-4 focus-within:border-[#0F6E56]">
                <span className="px-3 text-sm text-[#6B7280] border-l border-[#E8ECEF] bg-[#F8F9FA] py-3">🇸🇦 +966</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="05XXXXXXXX"
                  className="flex-1 px-3 py-3 text-sm focus:outline-none"
                  dir="ltr"
                />
              </div>

              {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

              <button
                onClick={sendOtp}
                disabled={loading || phone.length < 10}
                className="w-full bg-[#0F6E56] text-white py-3 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? 'جاري الإرسال...' : (
                  <><span>📱</span> إرسال رمز واتساب</>
                )}
              </button>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-[#1A1A1A] mb-1">رمز التحقق</h2>
              <div className="flex items-center gap-2 bg-[#E8F5F1] rounded-xl p-3 mb-5">
                <span>💬</span>
                <p className="text-sm text-[#0F6E56]">تم إرسال الرمز على واتساب إلى <strong>{formattedPhone}</strong></p>
              </div>

              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="• • • • • •"
                maxLength={6}
                className="w-full border border-[#E8ECEF] rounded-xl px-4 py-4 text-center text-2xl tracking-[0.5em] focus:outline-none focus:border-[#0F6E56] mb-4"
                dir="ltr"
              />

              {error && <p className="text-red-500 text-xs mb-3 text-center">{error}</p>}

              <button
                onClick={verifyOtp}
                disabled={loading || otp.length < 6}
                className="w-full bg-[#0F6E56] text-white py-3 rounded-xl font-semibold disabled:opacity-50 mb-3"
              >
                {loading ? 'جاري التحقق...' : 'تحقق وادخل'}
              </button>

              <button onClick={() => { setStep('phone'); setOtp(''); setError('') }}
                className="w-full text-sm text-[#6B7280] py-2">
                ← تغيير رقم الجوال
              </button>
            </>
          )}
        </div>

        <p className="text-center text-sm text-[#6B7280] mt-4">
          ليس لديك حساب؟{' '}
          <Link href="/register" className="text-[#0F6E56] font-medium">سجل الآن</Link>
        </p>
      </div>
    </div>
  )
}
