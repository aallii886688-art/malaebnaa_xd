'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const formatPhone = (raw: string) => {
    // Convert 05XXXXXXXX to +9665XXXXXXXX
    const digits = raw.replace(/\D/g, '')
    if (digits.startsWith('05') && digits.length === 10) return '+966' + digits.slice(1)
    if (digits.startsWith('9665') && digits.length === 12) return '+' + digits
    return raw
  }

  const sendOtp = async () => {
    setLoading(true)
    setError('')
    const formattedPhone = formatPhone(phone)
    const { error } = await supabase.auth.signInWithOtp({ phone: formattedPhone })
    if (error) { setError(error.message); setLoading(false); return }
    setStep('otp')
    setLoading(false)
  }

  const verifyOtp = async () => {
    setLoading(true)
    setError('')
    const formattedPhone = formatPhone(phone)
    const { error } = await supabase.auth.verifyOtp({ phone: formattedPhone, token: otp, type: 'sms' })
    if (error) { setError('رمز التحقق غير صحيح'); setLoading(false); return }
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
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-1">تسجيل الدخول</h2>
          <p className="text-sm text-[#6B7280] mb-6">أدخل رقم جوالك للمتابعة</p>

          {step === 'phone' ? (
            <>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1">رقم الجوال</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="05XXXXXXXX"
                className="w-full border border-[#E8ECEF] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#0F6E56] mb-4"
                dir="ltr"
              />
              {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
              <button
                onClick={sendOtp}
                disabled={loading || phone.length < 10}
                className="w-full bg-[#0F6E56] text-white py-3 rounded-xl font-semibold disabled:opacity-50"
              >
                {loading ? 'جاري الإرسال...' : 'إرسال رمز التحقق'}
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-[#6B7280] mb-4">تم إرسال رمز التحقق إلى {phone}</p>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1">رمز التحقق</label>
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
                {loading ? 'جاري التحقق...' : 'تحقق وادخل'}
              </button>
              <button onClick={() => setStep('phone')} className="w-full text-sm text-[#6B7280]">
                تغيير رقم الجوال
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
