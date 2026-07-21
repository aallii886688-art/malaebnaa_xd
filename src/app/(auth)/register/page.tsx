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

  const buildPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, '')
    if (digits.startsWith('0')) return '+966' + digits.slice(1)
    return '+966' + digits
  }

  const sendOtp = async () => {
    if (!form.full_name.trim() || !form.phone) { setError('يرجى تعبئة جميع الحقول'); return }
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: buildPhone(form.phone) }),
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
          {step === 'form' ? (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>إنشاء حساب جديد</h2>
              <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>سيصلك رمز التحقق على واتساب</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                {(['player', 'partner'] as AccountType[]).map((type) => (
                  <button key={type} onClick={() => setForm((f) => ({ ...f, account_type: type }))}
                    style={{ border: `2px solid ${form.account_type === type ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 14, padding: 12, textAlign: 'center', background: form.account_type === type ? 'var(--primary-dim)' : 'transparent', cursor: 'pointer' }}>
                    <div style={{ fontSize: 24, marginBottom: 4 }}>{type === 'player' ? '🏃' : '🏟️'}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: form.account_type === type ? 'var(--primary)' : 'var(--text)' }}>
                      {type === 'player' ? 'لاعب' : 'شريك'}
                    </div>
                  </button>
                ))}
              </div>

              {form.account_type === 'partner' && (
                <p style={{ fontSize: 11, color: 'var(--text2)', background: 'var(--bg)', borderRadius: 10, padding: '8px 12px', marginBottom: 16 }}>
                  تفعيل أنشطة الشركاء يتم من داخل الحساب ويحتاج موافقة الإدارة
                </p>
              )}

              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>الاسم الكامل</label>
              <input value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                placeholder="الاسم الرباعي"
                style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 12, padding: '11px 12px', fontSize: 14, outline: 'none', background: 'var(--card)', color: 'var(--text)', boxSizing: 'border-box', marginBottom: 16 }} />

              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>رقم الجوال</label>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }} dir="ltr">
                <span style={{ padding: '12px', fontSize: 13, color: 'var(--text2)', background: 'var(--bg)', borderRight: '1px solid var(--border)', whiteSpace: 'nowrap' }}>🇸🇦 +966</span>
                <input type="tel" inputMode="numeric" value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 9) }))}
                  placeholder="5XXXXXXXX"
                  style={{ flex: 1, padding: '12px', fontSize: 15, outline: 'none', background: 'var(--card)', color: 'var(--text)', border: 'none', minWidth: 0 }}
                  dir="ltr" />
              </div>

              {error && <p style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 12 }}>{error}</p>}
              <button onClick={sendOtp} disabled={loading}
                style={{ width: '100%', background: 'var(--primary)', color: 'var(--primary-fg)', padding: '13px', borderRadius: 14, fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', opacity: loading ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
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

              <input type="text" value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="• • • • • •" maxLength={6}
                style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 14, padding: '16px', textAlign: 'center', fontSize: 24, letterSpacing: '0.5em', outline: 'none', background: 'transparent', color: 'var(--text)', boxSizing: 'border-box', marginBottom: 16 }}
                dir="ltr" />

              {error && <p style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 12, textAlign: 'center' }}>{error}</p>}

              <button onClick={verifyOtp} disabled={loading || otp.length < 6}
                style={{ width: '100%', background: 'var(--primary)', color: 'var(--primary-fg)', padding: '13px', borderRadius: 14, fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', opacity: (loading || otp.length < 6) ? 0.5 : 1, marginBottom: 12 }}>
                {loading ? 'جاري التحقق...' : 'إنشاء الحساب'}
              </button>
              <button onClick={() => { setStep('form'); setOtp(''); setError('') }}
                style={{ width: '100%', fontSize: 13, color: 'var(--text2)', padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer' }}>← رجوع</button>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text2)', marginTop: 16 }}>
          لديك حساب؟{' '}
          <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>سجل دخول</Link>
        </p>
      </div>
    </div>
  )
}
