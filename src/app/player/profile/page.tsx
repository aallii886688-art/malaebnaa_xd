'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import { useTheme } from '@/lib/theme'

type Profile = {
  name: string
  phone: string
  created_at: string
  reliability_score: number | null
  no_show_count: number | null
  suspended_until: string | null
}
type Child = { id: string; name: string; birth_date: string | null; sport_type: string | null }
type ChildReport = { id: string; child_id: string; report_date: string; content: string; rating: number | null }

function ScoreRing({ score }: { score: number }) {
  const r = 28, circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const color = score >= 80 ? 'var(--primary)' : score >= 50 ? '#f59e0b' : 'var(--danger)'
  return (
    <svg width={72} height={72} viewBox="0 0 72 72" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={36} cy={36} r={r} fill="none" stroke="var(--border)" strokeWidth={6} />
      <circle cx={36} cy={36} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      <text x={36} y={36} textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: 16, fontWeight: 800, fill: color, transform: 'rotate(90deg)', transformOrigin: '36px 36px' }}>
        {score}
      </text>
    </svg>
  )
}

export default function PlayerProfilePage() {
  const router = useRouter()
  const { theme, toggle } = useTheme()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)
  const [profileTab, setProfileTab] = useState<'main' | 'children'>('main')
  const [children, setChildren] = useState<Child[]>([])
  const [childReports, setChildReports] = useState<ChildReport[]>([])
  const [showAddChild, setShowAddChild] = useState(false)
  const [childForm, setChildForm] = useState({ name: '', birth_date: '', sport_type: '' })
  const [savingChild, setSavingChild] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      supabase.from('profiles')
        .select('name, phone, created_at, reliability_score, no_show_count, suspended_until')
        .eq('id', user.id).single()
        .then(({ data }) => { setProfile(data as Profile); setLoading(false) })
    })
  }, [router])

  useEffect(() => {
    if (profileTab !== 'children' || !userId) return
    const supabase = createClient()
    supabase.from('children').select('*').eq('parent_id', userId).order('created_at')
      .then(({ data }) => {
        const kids = (data ?? []) as Child[]
        setChildren(kids)
        if (kids.length > 0) {
          supabase.from('performance_reports')
            .select('id, child_id, report_date, content, rating')
            .in('child_id', kids.map(c => c.id))
            .order('report_date', { ascending: false })
            .then(({ data: reps }) => setChildReports((reps ?? []) as ChildReport[]))
        }
      })
  }, [profileTab, userId])

  const addChild = async () => {
    if (!childForm.name.trim() || !userId) return
    setSavingChild(true)
    const supabase = createClient()
    await supabase.from('children').insert({
      parent_id: userId, name: childForm.name,
      birth_date: childForm.birth_date || null, sport_type: childForm.sport_type || null,
    })
    const { data } = await supabase.from('children').select('*').eq('parent_id', userId).order('created_at')
    setChildren((data ?? []) as Child[])
    setShowAddChild(false); setChildForm({ name: '', birth_date: '', sport_type: '' }); setSavingChild(false)
  }

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

  const score = profile?.reliability_score ?? 100
  const isSuspended = profile?.suspended_until && new Date(profile.suspended_until) > new Date()
  const scoreColor = score >= 80 ? 'var(--primary)' : score >= 50 ? '#f59e0b' : 'var(--danger)'

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: 80 }}>
      <div style={{ background: 'linear-gradient(135deg,#0F6E56,#1A9870)', padding: '52px 16px 32px', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: 36, background: 'rgba(255,255,255,0.2)', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>👤</div>
        <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>{profile?.name}</h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 }} dir="ltr">+966{profile?.phone?.replace('+966', '')}</p>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 }}>
          عضو منذ {profile ? new Date(profile.created_at).toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' }) : ''}
        </p>
      </div>

      {/* بطاقة الموثوقية */}
      <div style={{ margin: '-20px 16px 0', position: 'relative', zIndex: 10 }}>
        <div style={{ background: 'var(--card)', borderRadius: 20, border: `1px solid ${isSuspended ? 'var(--danger)' : 'var(--border)'}`, padding: '16px', boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <ScoreRing score={score} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>نقاط الموثوقية</p>
            {isSuspended ? (
              <>
                <span style={{ fontSize: 11, background: 'var(--danger-dim)', color: 'var(--danger)', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>⛔ محظور</span>
                <p style={{ fontSize: 11, color: 'var(--text3)', margin: '4px 0 0', lineHeight: 1.4 }}>
                  حتى {new Date(profile!.suspended_until!).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long' })}
                </p>
              </>
            ) : (
              <>
                <p style={{ fontSize: 12, color: scoreColor, fontWeight: 600, margin: '0 0 2px' }}>
                  {score >= 90 ? '🌟 ممتاز' : score >= 70 ? '✅ جيد' : score >= 50 ? '⚠️ متوسط' : '❌ منخفض'}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>
                  غياب: {profile?.no_show_count ?? 0} مرة
                </p>
              </>
            )}
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 28, fontWeight: 800, color: scoreColor, margin: 0 }}>{score}</p>
            <p style={{ fontSize: 10, color: 'var(--text3)', margin: 0 }}>/ 100</p>
          </div>
        </div>

        {/* تحذير لو النقاط منخفضة */}
        {score < 70 && !isSuspended && (
          <div style={{ marginTop: 8, background: 'var(--gold-dim)', border: '1px solid var(--gold)', borderRadius: 14, padding: '10px 14px' }}>
            <p style={{ fontSize: 12, color: 'var(--gold)', margin: 0 }}>
              ⚠️ نقاطك منخفضة. عدم الحضور {3 - (profile?.no_show_count ?? 0)} مرات أخرى سيؤدي إلى تعليق حسابك.
            </p>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', background: 'var(--card)', borderBottom: '1px solid var(--border)', marginTop: 16 }}>
        {([{ key: 'main', label: '👤 ملفي' }, { key: 'children', label: '👶 أبنائي' }] as const).map((t) => (
          <button key={t.key} onClick={() => setProfileTab(t.key)}
            style={{ flex: 1, padding: '12px', fontSize: 13, fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer', color: profileTab === t.key ? 'var(--primary)' : 'var(--text2)', borderBottom: profileTab === t.key ? '2px solid var(--primary)' : '2px solid transparent' }}>
            {t.label}
          </button>
        ))}
      </div>

      {profileTab === 'children' && (
        <div style={{ padding: '16px 16px 100px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button onClick={() => setShowAddChild(true)}
            style={{ width: '100%', border: '2px dashed var(--primary)', color: 'var(--primary)', fontSize: 13, padding: '12px', borderRadius: 20, fontWeight: 600, background: 'transparent', cursor: 'pointer' }}>
            + إضافة طفل
          </button>
          {children.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <p style={{ fontSize: 40, marginBottom: 8 }}>👶</p>
              <p style={{ fontSize: 13, color: 'var(--text2)' }}>لم تضف أطفالك بعد</p>
            </div>
          ) : children.map((child) => {
            const reports = childReports.filter(r => r.child_id === child.id)
            return (
              <div key={child.id} style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: reports.length > 0 ? 12 : 0 }}>
                  <div>
                    <p style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14, margin: '0 0 4px' }}>{child.name}</p>
                    {child.birth_date && (
                      <p style={{ fontSize: 12, color: 'var(--text3)', margin: '0 0 2px' }}>
                        {new Date(child.birth_date).toLocaleDateString('ar-SA')} · {Math.floor((Date.now() - new Date(child.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 365))} سنة
                      </p>
                    )}
                    {child.sport_type && <p style={{ fontSize: 12, color: 'var(--primary)', margin: 0 }}>🏅 {child.sport_type}</p>}
                  </div>
                  <span style={{ fontSize: 24 }}>👦</span>
                </div>
                {reports.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, margin: '0 0 4px' }}>تقارير الأداء ({reports.length})</p>
                    {reports.map(r => (
                      <div key={r.id} style={{ background: 'var(--bg)', borderRadius: 12, padding: '8px 12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span style={{ fontSize: 10, color: 'var(--text3)' }}>{new Date(r.report_date).toLocaleDateString('ar-SA')}</span>
                          {r.rating && <span style={{ fontSize: 11, color: 'var(--gold)' }}>{'★'.repeat(r.rating)}</span>}
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--text)', margin: 0 }}>{r.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {showAddChild && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 50 }} onClick={() => setShowAddChild(false)}>
              <div style={{ background: 'var(--card)', borderRadius: '20px 20px 0 0', padding: 20, width: '100%', boxSizing: 'border-box' }} onClick={e => e.stopPropagation()}>
                <h3 style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>إضافة طفل</h3>
                {[
                  { label: 'اسم الطفل *', key: 'name', type: 'text', placeholder: 'الاسم الكامل' },
                  { label: 'تاريخ الميلاد', key: 'birth_date', type: 'date', placeholder: '' },
                  { label: 'الرياضة المفضلة', key: 'sport_type', type: 'text', placeholder: 'مثال: كرة القدم' },
                ].map(({ label, key, type, placeholder }) => (
                  <div key={key} style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>{label}</label>
                    <input type={type} value={(childForm as Record<string, string>)[key]}
                      onChange={e => setChildForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px', fontSize: 13, outline: 'none', background: 'transparent', color: 'var(--text)', boxSizing: 'border-box' as const }} />
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button onClick={addChild} disabled={savingChild || !childForm.name.trim()}
                    style={{ flex: 1, background: 'var(--primary)', color: 'var(--primary-fg)', padding: '10px', borderRadius: 14, fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', opacity: (savingChild || !childForm.name.trim()) ? 0.5 : 1 }}>
                    {savingChild ? 'جاري الحفظ...' : 'إضافة'}
                  </button>
                  <button onClick={() => setShowAddChild(false)} style={{ flex: 1, border: '1px solid var(--border)', padding: '10px', borderRadius: 14, fontSize: 13, background: 'transparent', color: 'var(--text2)', cursor: 'pointer' }}>إلغاء</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {profileTab === 'main' && (
        <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <p style={{ color: 'var(--text3)', fontSize: 11, fontWeight: 700, padding: '12px 16px 0', letterSpacing: 0.8 }}>نشاطي</p>
            {[
              { icon: '📅', label: 'حجوزاتي', href: '/player/bookings' },
              { icon: '🎓', label: 'اشتراكاتي وتسجيلاتي', href: '/player/subscriptions' },
              { icon: '🔔', label: 'الإشعارات', href: '/player/notifications' },
              { icon: '⚽', label: 'أكمل الفريق', href: '/player/matches' },
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
      )}

      <BottomNav />
    </div>
  )
}
