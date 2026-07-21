import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function PartnerDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  const { data: partnerRoles } = await supabase.from('partner_roles').select('activity, status').eq('user_id', user.id)

  const approvedRoles = partnerRoles?.filter((r) => r.status === 'approved') ?? []
  const pendingRoles  = partnerRoles?.filter((r) => r.status === 'pending') ?? []
  const allActivities = ['facility_manager', 'academy_manager', 'tournament_manager']
  const unactivated   = allActivities.filter((a) => !partnerRoles?.some((r) => r.activity === a))

  const activityInfo: Record<string, { label: string; icon: string; href: string; grad: string }> = {
    facility_manager:   { label: 'ملاعبي', icon: '⚽', href: '/partner/facilities', grad: 'linear-gradient(135deg,#1a4d2e,#2d7a4f)' },
    academy_manager:    { label: 'أكاديمياتي', icon: '🏅', href: '/partner/academies', grad: 'linear-gradient(135deg,#2e1a4d,#5a2d9f)' },
    tournament_manager: { label: 'بطولاتي', icon: '🏆', href: '/partner/tournaments', grad: 'linear-gradient(135deg,#4d2e1a,#9f5a2d)' },
  }

  const quickLinks = [
    { href: '/partner/bookings', icon: '📅', label: 'الحجوزات' },
    { href: '/partner/wallet',   icon: '💰', label: 'المحفظة' },
    { href: '/partner/reports',  icon: '📊', label: 'التقارير' },
    { href: '/partner/staff',    icon: '👥', label: 'الموظفون' },
    { href: '/player',           icon: '🏃', label: 'وضع اللاعب' },
  ]

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: 32 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#0F6E56,#1A9870)', padding: '52px 20px 28px' }}>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>لوحة الشريك</p>
        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, marginTop: 4 }}>{profile?.full_name}</h1>
      </div>

      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Approved roles */}
        {approvedRoles.length > 0 && (
          <div>
            <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: 15, marginBottom: 12 }}>أنشطتي المفعلة</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {approvedRoles.map((role) => {
                const info = activityInfo[role.activity]
                return (
                  <a key={role.activity} href={info.href}
                    style={{ background: info.grad, borderRadius: 20, padding: '18px', display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none' }}>
                    <span style={{ fontSize: 32 }}>{info.icon}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ color: '#fff', fontWeight: 700, fontSize: 17 }}>{info.label}</p>
                      <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 }}>مفعّل ✓</p>
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 20 }}>←</span>
                  </a>
                )
              })}
            </div>
          </div>
        )}

        {/* Pending */}
        {pendingRoles.length > 0 && (
          <div style={{ background: 'var(--gold-dim)', border: '1px solid var(--gold)', borderRadius: 16, padding: '14px 16px' }}>
            <p style={{ color: 'var(--gold)', fontWeight: 700, fontSize: 14, marginBottom: 8 }}>⏳ طلبات قيد المراجعة</p>
            {pendingRoles.map((role) => (
              <p key={role.activity} style={{ color: 'var(--text2)', fontSize: 13, marginTop: 4 }}>
                {activityInfo[role.activity]?.icon} {activityInfo[role.activity]?.label}
              </p>
            ))}
          </div>
        )}

        {/* Unactivated */}
        {unactivated.length > 0 && (
          <div>
            <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: 15, marginBottom: 12 }}>تفعيل نشاط جديد</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {unactivated.map((activity) => {
                const info = activityInfo[activity]
                return (
                  <a key={activity} href={`/partner/activate/${activity}`}
                    style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
                    <span style={{ fontSize: 24 }}>{info.icon}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ color: 'var(--text)', fontWeight: 600, fontSize: 15 }}>{info.label.replace('تي', '')}</p>
                      <p style={{ color: 'var(--text3)', fontSize: 12, marginTop: 2 }}>اضغط للتقديم</p>
                    </div>
                    <span style={{ background: 'var(--primary-dim)', color: 'var(--primary)', fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20 }}>+ تفعيل</span>
                  </a>
                )
              })}
            </div>
          </div>
        )}

        {/* Quick links */}
        <div>
          <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: 15, marginBottom: 12 }}>روابط سريعة</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {quickLinks.map((item) => (
              <a key={item.href} href={item.href}
                style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px', display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', boxShadow: 'var(--shadow)' }}>
                <span style={{ fontSize: 22 }}>{item.icon}</span>
                <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: 14 }}>{item.label}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
