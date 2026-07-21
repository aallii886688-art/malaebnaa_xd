'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import { useTheme } from '@/lib/theme'

type Profile = { full_name: string; phone: string; created_at: string }

export default function PlayerProfilePage() {
  const router = useRouter()
  const { theme, toggle } = useTheme()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      supabase.from('profiles').select('full_name, phone, created_at').eq('id', user.id).single()
        .then(({ data }) => { setProfile(data as Profile); setLoading(false) })
    })
  }, [router])

  const signOut = async () => {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text3)' }}>جاري التحميل...</p>
    </div>
  )

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: 80 }}>
      <div style={{ background: 'linear-gradient(135deg,#0F6E56,#1A9870)', padding: '52px 16px 32px', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: 36, background: 'rgba(255,255,255,0.2)', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>👤</div>
        <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>{profile?.full_name}</h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 }} dir="ltr">+966{profile?.phone?.replace('+966', '')}</p>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 }}>
          عضو منذ {profile ? new Date(profile.created_at).toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' }) : ''}
        </p>
      </div>

      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <p style={{ color: 'var(--text3)', fontSize: 11, fontWeight: 700, padding: '12px 16px 0', letterSpacing: 0.8 }}>نشاطي</p>
          {[
            { icon: '📅', label: 'حجوزاتي', href: '/player/bookings' },
            { icon: '🏅', label: 'الأكاديميات', href: '/player/academies' },
            { icon: '🏆', label: 'البطولات', href: '/player/tournaments' },
          ].map((item, i, arr) => (
            <button key={item.label} onClick={() => router.push(item.href)} className="press"
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <span style={{ flex: 1, color: 'var(--text)', fontSize: 15, fontWeight: 500, textAlign: 'right' }}>{item.label}</span>
              <span style={{ color: 'var(--text3)', fontSize: 16 }}>←</span>
            </button>
          ))}
        </div>

        <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <p style={{ color: 'var(--text3)', fontSize: 11, fontWeight: 700, padding: '12px 16px 0', letterSpacing: 0.8 }}>المظهر</p>
          <button onClick={toggle} className="press"
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer' }}>
            <span style={{ fontSize: 20 }}>{theme === 'dark' ? '🌙' : '☀️'}</span>
            <span style={{ flex: 1, color: 'var(--text)', fontSize: 15, fontWeight: 500, textAlign: 'right' }}>{theme === 'dark' ? 'الوضع الداكن' : 'الوضع الفاتح'}</span>
            <div style={{ width: 44, height: 26, borderRadius: 13, background: theme === 'dark' ? 'var(--primary)' : 'var(--border)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
              <div style={{ width: 20, height: 20, borderRadius: 10, background: '#fff', position: 'absolute', top: 3, left: theme === 'dark' ? 21 : 3, transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
            </div>
          </button>
        </div>

        <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <p style={{ color: 'var(--text3)', fontSize: 11, fontWeight: 700, padding: '12px 16px 0', letterSpacing: 0.8 }}>الأدوار</p>
          {[
            { icon: '🤝', label: 'لوحة الشريك', href: '/partner' },
            { icon: '🛡️', label: 'لوحة الأدمن', href: '/admin' },
          ].map((item, i, arr) => (
            <button key={item.label} onClick={() => router.push(item.href)} className="press"
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <span style={{ flex: 1, color: 'var(--text)', fontSize: 15, fontWeight: 500, textAlign: 'right' }}>{item.label}</span>
              <span style={{ color: 'var(--text3)', fontSize: 16 }}>←</span>
            </button>
          ))}
        </div>

        <button onClick={signOut} disabled={signingOut} className="press"
          style={{ width: '100%', padding: '15px', borderRadius: 16, background: 'var(--danger-dim)', border: '1.5px solid var(--danger)', color: 'var(--danger)', fontWeight: 700, fontSize: 15, cursor: 'pointer', opacity: signingOut ? 0.6 : 1 }}>
          {signingOut ? 'جاري الخروج...' : '🚪 تسجيل الخروج'}
        </button>
      </div>
      <BottomNav />
    </div>
  )
}
