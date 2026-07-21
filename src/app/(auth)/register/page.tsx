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
  const [formattedPhone, setFormattedPhone] = useState('')
  const [otp, setOtp] = useState('')

  const sendOtp = async () => {
    if (!form.full_name.trim() || !form.phone) { setError('يرجى تعبئة جميع الحقول'); return }
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: form.phone }),
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
      body: JSON.stringify({
        phone: formattedPhone,
        otp,
        full_name: form.full_name,
        account_type: form.account_type,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'رمز خاطئ'); setLoading(false); return }

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
          {step === 'form' ? (
            <>
              <h2 className="text-lg font-bold text-[#1A1A1A] mb-1">إنشاء حساب جديد</h2>
              <p className="text-sm text-[#6B7280] mb-5">سيصلك رمز التحقق على واتساب</p>

              {/* Account type */}
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
                  </button>
                ))}
              </div>

              {form.account_type === 'partner' && (
                <p className="text-xs text-[#6B7280] bg-[#F8F9FA] rounded-lg p-2 mb-4">
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
              <div className="flex items-center border border-[#E8ECEF] rounded-xl overflow-hidden mb-5 focus-within:border-[#0F6E56]">
                <span className="px-3 text-sm text-[#6B7280] border-l border-[#E8ECEF] bg-[#F8F9FA] py-3">🇸🇦 +966</span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="05XXXXXXXX"
                  className="flex-1 px-3 py-3 text-sm focus:outline-none"
                  dir="ltr"
                />
              </div>

              {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

              <button
                onClick={sendOtp}
                disabled={loading}
                className="w-full bg-[#0F6E56] text-white py-3 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? 'جاري الإرسال...' : <><span>📱</span> إرسال رمز واتساب</>}
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
                {loading ? 'جاري التحقق...' : 'إنشاء الحساب'}
              </button>

              <button onClick={() => { setStep('form'); setOtp(''); setError('') }}
                className="w-full text-sm text-[#6B7280] py-2">
                ← رجوع
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
