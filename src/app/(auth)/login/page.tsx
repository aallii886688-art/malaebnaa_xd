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

  const buildPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, '')
    if (digits.startsWith('0')) return '+966' + digits.slice(1)
    return '+966' + digits
  }

  const sendOtp = async () => {
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: buildPhone(phone) }),
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

    await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    })
    router.push('/dashboard')
  }

  return (
    <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <a href="/" style={{ textDecoration: 'none', display: 'inline-block' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>⚽</div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)', margin: 0 }}>ملاعبنا</h1>
          </a>
          <p style={{ color: 'var(--text3)', fontSize: 12, marginTop: 4 }}>اضغط الشعار للعودة للرئيسية</p>
        </div>

        <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 24 }}>
          {step === 'phone' ? (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>تسجيل الدخول</h2>
              <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 24 }}>سيصلك رمز التحقق على واتساب</p>

              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>رقم الجوال</label>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }} dir="ltr">
                <span style={{ padding: '12px 12px', fontSize: 13, color: 'var(--text2)', background: 'var(--bg)', borderRight: '1px solid var(--border)', whiteSpace: 'nowrap' }}>🇸🇦 +966</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  placeholder="5XXXXXXXX"
                  style={{ flex: 1, padding: '12px', fontSize: 15, outline: 'none', background: 'var(--card)', color: 'var(--text)', border: 'none', minWidth: 0 }}
                  dir="ltr"
                />
              </div>

              {error && <p style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 12 }}>{error}</p>}

              <button
                onClick={sendOtp}
                disabled={loading || phone.replace(/\D/g, '').length < 8}
                style={{ width: '100%', background: 'var(--primary)', color: 'var(--primary-fg)', padding: '13px', borderRadius: 14, fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', opacity: (loading || phone.replace(/\D/g, '').length < 8) ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {loading ? 'جاري الإرسال...' : <><span>📱</span> إرسال رمز واتساب</>}
              </button>
            </>
          ) : (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>رمز التحقق</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--primary-dim)', borderRadius: 12, padding: 12, marginBottom: 20 }}>
                <span>💬</span>
                <p style={{ fontSize: 13, color: 'var(--primary)', margin: 0 }}>تم إرسال الرمز على واتساب إلى <strong dir="ltr">{formattedPhone}</strong></p>
              </div>

              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="• • • • • •"
                maxLength={6}
                style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 14, padding: '16px', textAlign: 'center', fontSize: 24, letterSpacing: '0.5em', outline: 'none', background: 'transparent', color: 'var(--text)', boxSizing: 'border-box', marginBottom: 16 }}
                dir="ltr"
              />

              {error && <p style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 12, textAlign: 'center' }}>{error}</p>}

              <button
                onClick={verifyOtp}
                disabled={loading || otp.length < 6}
                style={{ width: '100%', background: 'var(--primary)', color: 'var(--primary-fg)', padding: '13px', borderRadius: 14, fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', opacity: (loading || otp.length < 6) ? 0.5 : 1, marginBottom: 12 }}
              >
                {loading ? 'جاري التحقق...' : 'تحقق وادخل'}
              </button>

              <button onClick={() => { setStep('phone'); setOtp(''); setError('') }}
                style={{ width: '100%', fontSize: 13, color: 'var(--text2)', padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                ← تغيير رقم الجوال
              </button>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text2)', marginTop: 16 }}>
          ليس لديك حساب؟{' '}
          <Link href="/register" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>سجل الآن</Link>
        </p>
      </div>
    </div>
  )
}
