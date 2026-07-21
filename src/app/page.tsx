'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useTheme } from '@/lib/theme'

type Facility = { id: string; name: string; sport_type: string; city: string; rating: number; reviews_count: number }

const sportGradient: Record<string, string> = {
  football:   'linear-gradient(135deg,#1a4d2e,#2d7a4f)',
  futsal:     'linear-gradient(135deg,#1a3a5c,#2d6a9f)',
  padel:      'linear-gradient(135deg,#4d1a1a,#9f2d2d)',
  basketball: 'linear-gradient(135deg,#4d2e1a,#9f5a2d)',
  volleyball: 'linear-gradient(135deg,#2e1a4d,#5a2d9f)',
  tennis:     'linear-gradient(135deg,#1a4d3a,#2d9f6a)',
  default:    'linear-gradient(135deg,#1a2d4d,#2d4d7a)',
}
const sportEmoji: Record<string, string> = {
  football:'⚽', futsal:'🥅', padel:'🎾', basketball:'🏀', volleyball:'🏐', tennis:'🎾', other:'🏅',
}

const sections = [
  { href: '/player/facilities',  label: 'الملاعب',      icon: '⚽', grad: 'linear-gradient(135deg,#0F6E56,#1A9870)' },
  { href: '/player/academies',   label: 'الأكاديميات',  icon: '🏅', grad: 'linear-gradient(135deg,#4B2896,#7B3FE4)' },
  { href: '/player/tournaments', label: 'البطولات',     icon: '🏆', grad: 'linear-gradient(135deg,#9A4F0D,#D4781A)' },
]

export default function HomePage() {
  const { theme, toggle } = useTheme()
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [search, setSearch] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => setIsLoggedIn(!!user))
    supabase.from('facilities').select('id,name,sport_type,city,rating,reviews_count')
      .eq('is_active', true).order('rating', { ascending: false }).limit(6)
      .then(({ data }) => setFacilities(data ?? []))
  }, [])

  const filtered = facilities.filter((f) =>
    !search || f.name.includes(search) || f.city.includes(search)
  )

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <span style={{ color: 'var(--primary)', fontSize: 22, fontWeight: 800 }}>ملاعبنا</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={toggle} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '7px 10px', cursor: 'pointer', fontSize: 16 }}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          {isLoggedIn ? (
            <Link href="/player" style={{ background: 'var(--primary)', color: 'var(--primary-fg)', padding: '8px 18px', borderRadius: 12, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
              لوحتي
            </Link>
          ) : (
            <>
              <Link href="/login" style={{ color: 'var(--text)', border: '1.5px solid var(--border)', padding: '7px 16px', borderRadius: 12, fontWeight: 600, fontSize: 14, textDecoration: 'none', background: 'var(--card)' }}>
                دخول
              </Link>
              <Link href="/register" style={{ background: 'var(--primary)', color: 'var(--primary-fg)', padding: '8px 16px', borderRadius: 12, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
                تسجيل
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(160deg,#0a3d2b 0%,#0F6E56 55%,#1A9870 100%)', padding: '48px 20px 36px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⚽</div>
        <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, marginBottom: 8, lineHeight: 1.3 }}>احجز ملعبك الآن</h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 24 }}>ملاعب · أكاديميات · بطولات في مكان واحد</p>
        <div style={{ position: 'relative', maxWidth: 480, margin: '0 auto' }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن ملعب أو مدينة..."
            style={{ width: '100%', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 16, padding: '14px 48px 14px 16px', color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
          />
          <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 18 }}>🔍</span>
        </div>
      </div>

      <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 28 }}>
        {/* Sections */}
        <div>
          <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: 16, marginBottom: 14 }}>استكشف</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {sections.map((s) => (
              <Link key={s.href} href={s.href} style={{ textDecoration: 'none', background: s.grad, borderRadius: 20, padding: '20px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 30 }}>{s.icon}</span>
                <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{s.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Featured facilities */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: 16 }}>ملاعب مميزة</p>
            <Link href="/player/facilities" style={{ color: 'var(--primary)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>عرض الكل ←</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.length === 0 && search ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)' }}>لا نتائج لـ "{search}"</div>
            ) : (filtered.length === 0 ? [1,2,3] : filtered).map((item, i) => {
              const f = typeof item === 'number' ? null : item as Facility
              return (
                <div key={i}>
                  {f ? (
                    <Link href={`/player/facilities/${f.id}`} style={{ textDecoration: 'none', display: 'flex', background: 'var(--card)', borderRadius: 18, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
                      <div style={{ width: 90, height: 90, background: sportGradient[f.sport_type] ?? sportGradient.default, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>
                        {sportEmoji[f.sport_type] ?? '🏅'}
                      </div>
                      <div style={{ padding: '12px 14px', flex: 1 }}>
                        <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: 15 }}>{f.name}</p>
                        <p style={{ color: 'var(--text3)', fontSize: 12, marginTop: 3 }}>📍 {f.city}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                          <span style={{ color: 'var(--gold)', fontSize: 12, fontWeight: 600 }}>
                            ⭐ {f.rating}{f.reviews_count > 0 ? ` (${f.reviews_count})` : ''}
                          </span>
                          <span style={{ background: 'var(--primary-dim)', color: 'var(--primary)', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                            احجز الآن
                          </span>
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <div style={{ display: 'flex', background: 'var(--card)', borderRadius: 18, border: '1px solid var(--border)', overflow: 'hidden' }}>
                      <div className="skeleton" style={{ width: 90, height: 90, flexShrink: 0 }} />
                      <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div className="skeleton" style={{ height: 14, width: '60%', borderRadius: 8 }} />
                        <div className="skeleton" style={{ height: 11, width: '40%', borderRadius: 8 }} />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* CTA */}
        {!isLoggedIn && (
          <div style={{ background: 'linear-gradient(135deg,#0F6E56,#1A9870)', borderRadius: 24, padding: '28px 20px', textAlign: 'center' }}>
            <p style={{ color: '#fff', fontSize: 18, fontWeight: 800, marginBottom: 6 }}>سجّل الآن مجاناً</p>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginBottom: 20 }}>واحجز ملعبك في ثوانٍ</p>
            <Link href="/register" style={{ display: 'inline-block', background: '#fff', color: '#0F6E56', padding: '12px 36px', borderRadius: 14, fontWeight: 800, fontSize: 15, textDecoration: 'none' }}>
              ابدأ الآن
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
