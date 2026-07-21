'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/partner',              icon: '🏠', label: 'لوحتي' },
  { href: '/partner/facilities',   icon: '⚽', label: 'ملاعبي' },
  { href: '/partner/academies',    icon: '🏅', label: 'أكاديمياتي' },
  { href: '/partner/tournaments',  icon: '🏆', label: 'بطولاتي' },
  { href: '/partner/bookings',     icon: '📅', label: 'الحجوزات' },
  { href: '/partner/wallet',       icon: '💰', label: 'المحفظة' },
  { href: '/partner/reports',      icon: '📊', label: 'التقارير' },
  { href: '/partner/staff',        icon: '👥', label: 'الموظفون' },
]

export default function PartnerTopBar() {
  const path = usePathname()
  const router = useRouter()

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div style={{ background: 'linear-gradient(135deg,#0a3d2b,#0F6E56)', position: 'sticky', top: 0, zIndex: 50, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/" style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, textDecoration: 'none' }}>
            ← الرئيسية
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
          <Link href="/partner" style={{ color: '#fff', fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
            🤝 الشريك
          </Link>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/player" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, textDecoration: 'none', background: 'rgba(255,255,255,0.12)', padding: '5px 10px', borderRadius: 8 }}>
            وضع اللاعب
          </Link>
          <button onClick={signOut} style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, background: 'rgba(255,0,0,0.2)', border: 'none', padding: '5px 10px', borderRadius: 8, cursor: 'pointer' }}>
            خروج
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, padding: '0 12px 10px', overflowX: 'auto' }} className="no-scrollbar">
        {navItems.map((item) => {
          const active = path === item.href || (item.href !== '/partner' && path.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href}
              style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 20, background: active ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 12, fontWeight: active ? 700 : 400, textDecoration: 'none', whiteSpace: 'nowrap', opacity: active ? 1 : 0.8 }}>
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
