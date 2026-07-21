'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/admin',              icon: '🏠', label: 'الرئيسية' },
  { href: '/admin/partners',     icon: '🤝', label: 'الشركاء' },
  { href: '/admin/users',        icon: '👥', label: 'المستخدمون' },
  { href: '/admin/facilities',   icon: '⚽', label: 'الملاعب' },
  { href: '/admin/academies',    icon: '🏅', label: 'الأكاديميات' },
  { href: '/admin/tournaments',  icon: '🏆', label: 'البطولات' },
  { href: '/admin/payments',     icon: '💳', label: 'المدفوعات' },
  { href: '/admin/settlements',  icon: '🏦', label: 'التسوية' },
  { href: '/admin/refunds',      icon: '↩️', label: 'الاسترداد' },
  { href: '/admin/commissions',  icon: '💰', label: 'العمولات' },
  { href: '/admin/reports',      icon: '📈', label: 'التقارير' },
  { href: '/admin/logs',         icon: '📊', label: 'السجلات' },
  { href: '/admin/employees',    icon: '🏢', label: 'الموظفون' },
  { href: '/admin/fields',       icon: '📋', label: 'الحقول' },
]

export default function AdminTopBar() {
  const path = usePathname()
  const router = useRouter()

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* Top header */}
      <div style={{ background: 'linear-gradient(135deg,#1a1a2e,#16213e)', position: 'sticky', top: 0, zIndex: 50, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href="/" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              ← الرئيسية
            </Link>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
            <Link href="/admin" style={{ color: '#fff', fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
              🛡️ الأدمن
            </Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link href="/player" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, textDecoration: 'none', background: 'rgba(255,255,255,0.1)', padding: '5px 10px', borderRadius: 8 }}>
              وضع اللاعب
            </Link>
            <button onClick={signOut} style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, background: 'rgba(255,0,0,0.15)', border: 'none', padding: '5px 10px', borderRadius: 8, cursor: 'pointer' }}>
              خروج
            </button>
          </div>
        </div>

        {/* Horizontal nav */}
        <div style={{ display: 'flex', gap: 4, padding: '0 12px 10px', overflowX: 'auto' }} className="no-scrollbar">
          {navItems.map((item) => {
            const active = path === item.href || (item.href !== '/admin' && path.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href}
                style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 20, background: active ? 'var(--primary)' : 'rgba(255,255,255,0.08)', color: active ? '#fff' : 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: active ? 700 : 400, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: 14 }}>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}
