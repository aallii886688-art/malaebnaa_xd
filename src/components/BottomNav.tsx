'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const items = [
  { href: '/player',            icon: home,     label: 'الرئيسية' },
  { href: '/player/bookings',   icon: calendar, label: 'حجوزاتي' },
  { href: '/player/facilities', icon: pitch,    label: 'الملاعب' },
  { href: '/player/profile',    icon: person,   label: 'حسابي' },
]

function home(active: boolean) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'var(--primary)' : 'none'} stroke={active ? 'var(--primary)' : 'var(--text3)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
      <path d="M9 21V12h6v9"/>
    </svg>
  )
}
function calendar(active: boolean) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--primary)' : 'var(--text3)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <path d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
  )
}
function pitch(active: boolean) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--primary)' : 'var(--text3)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 3v18M3 12h18M6.4 6.4l11.2 11.2M17.6 6.4L6.4 17.6"/>
    </svg>
  )
}
function person(active: boolean) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--primary)' : 'var(--text3)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  )
}

export default function BottomNav() {
  const path = usePathname()
  return (
    <nav style={{ background: 'var(--nav-bg)', borderTop: '1px solid var(--border)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
      className="fixed bottom-0 left-0 right-0 flex z-40 safe-area-pb">
      {items.map((item) => {
        const active = path === item.href || (item.href !== '/player' && path.startsWith(item.href))
        return (
          <Link key={item.href} href={item.href}
            className="flex-1 flex flex-col items-center py-2.5 gap-0.5 press">
            {item.icon(active)}
            <span className="text-[10px] font-medium" style={{ color: active ? 'var(--primary)' : 'var(--text3)' }}>
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
