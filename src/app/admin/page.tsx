import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: adminUser } = await supabase.from('admin_users').select('is_super_admin').eq('user_id', user.id).single()
  if (!adminUser) redirect('/player')

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()

  const [
    { count: usersCount },
    { count: pendingCount },
    { count: refundsCount },
    { count: settlementsCount },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('partner_roles').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('refund_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('settlement_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  const totalPending = (pendingCount ?? 0) + (refundsCount ?? 0) + (settlementsCount ?? 0)

  const sections = [
    {
      key: 'review',
      label: '🔴 يحتاج مراجعة',
      color: '#ef4444',
      dimColor: 'rgba(239,68,68,0.08)',
      items: [
        { href: '/admin/partners', icon: '🤝', label: 'طلبات الشركاء', badge: pendingCount },
        { href: '/admin/refunds', icon: '↩️', label: 'الاسترداد', badge: refundsCount },
        { href: '/admin/settlements', icon: '🏦', label: 'طلبات التسوية', badge: settlementsCount },
      ],
    },
    {
      key: 'content',
      label: '📋 المحتوى',
      color: 'var(--primary)',
      dimColor: 'var(--primary-dim)',
      items: [
        { href: '/admin/users', icon: '👥', label: 'المستخدمون', badge: null },
        { href: '/admin/facilities', icon: '⚽', label: 'الملاعب', badge: null },
        { href: '/admin/academies', icon: '🏅', label: 'الأكاديميات', badge: null },
        { href: '/admin/tournaments', icon: '🏆', label: 'البطولات', badge: null },
      ],
    },
    {
      key: 'finance',
      label: '💰 المالية',
      color: '#f59e0b',
      dimColor: 'rgba(245,158,11,0.08)',
      items: [
        { href: '/admin/payments', icon: '💳', label: 'المدفوعات', badge: null },
        { href: '/admin/commissions', icon: '💰', label: 'العمولات', badge: null },
        { href: '/admin/reports', icon: '📈', label: 'تقارير المنصة', badge: null },
      ],
    },
    {
      key: 'v2',
      label: '🆕 ميزات v2',
      color: '#7c3aed',
      dimColor: 'rgba(124,58,237,0.08)',
      items: [
        { href: '/admin/subscriptions', icon: '💳', label: 'اشتراكات الملاعب', badge: null },
        { href: '/admin/suspensions',   icon: '⛔', label: 'اللاعبون الموقوفون', badge: null },
      ],
    },
    {
      key: 'system',
      label: '⚙️ النظام',
      color: 'var(--text2)',
      dimColor: 'var(--bg2)',
      items: [
        { href: '/admin/employees', icon: '🏢', label: 'موظفو الإدارة', badge: null },
        { href: '/admin/logs', icon: '📊', label: 'سجل النشاطات', badge: null },
        { href: '/admin/fields', icon: '📋', label: 'إدارة الحقول', badge: null },
        { href: '/admin/notifications', icon: '🔔', label: 'الإشعارات', badge: null },
      ],
    },
  ]

  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg,#1a1a2e,#16213e)', padding: '20px 16px 16px' }}>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: '0 0 2px' }}>لوحة تحكم الأدمن</p>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>{profile?.full_name}</h1>
        {adminUser.is_super_admin && (
          <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '2px 10px', borderRadius: 20 }}>مشرف رئيسي</span>
        )}
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14, background: 'var(--bg)', paddingBottom: 40 }}>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div style={{ background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)', padding: '12px 8px', textAlign: 'center' }}>
            <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)', margin: '0 0 2px' }}>{usersCount ?? 0}</p>
            <p style={{ fontSize: 10, color: 'var(--text2)', margin: 0 }}>المستخدمون</p>
          </div>
          <div style={{ background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)', padding: '12px 8px', textAlign: 'center' }}>
            <p style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b', margin: '0 0 2px' }}>{pendingCount ?? 0}</p>
            <p style={{ fontSize: 10, color: 'var(--text2)', margin: 0 }}>شركاء معلقون</p>
          </div>
          <div style={{ background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)', padding: '12px 8px', textAlign: 'center' }}>
            <p style={{ fontSize: 22, fontWeight: 800, color: '#ef4444', margin: '0 0 2px' }}>{totalPending}</p>
            <p style={{ fontSize: 10, color: 'var(--text2)', margin: 0 }}>يحتاج مراجعة</p>
          </div>
        </div>

        {/* تنبيه لو في طلبات معلقة */}
        {totalPending > 0 && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid #ef4444', borderRadius: 16, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', margin: '0 0 2px' }}>يوجد {totalPending} طلب يحتاج مراجعة</p>
              <p style={{ fontSize: 11, color: 'var(--text2)', margin: 0 }}>شركاء · استرداد · تسويات</p>
            </div>
            <a href="/admin/partners" style={{ fontSize: 11, background: '#ef4444', color: '#fff', padding: '6px 14px', borderRadius: 10, textDecoration: 'none', fontWeight: 600 }}>مراجعة</a>
          </div>
        )}

        {/* الأقسام */}
        {sections.map((section) => (
          <div key={section.key} style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', background: section.dimColor, borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: section.color, margin: 0 }}>{section.label}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              {section.items.map((item, i) => (
                <a key={item.href} href={item.href}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px',
                    textDecoration: 'none', position: 'relative',
                    borderBottom: i < section.items.length - 2 ? '1px solid var(--border)' : 'none',
                    borderLeft: i % 2 === 0 ? '1px solid var(--border)' : 'none',
                  }}>
                  <span style={{ fontSize: 18 }}>{item.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{item.label}</span>
                  {item.badge != null && item.badge > 0 && (
                    <span style={{ position: 'absolute', top: 8, left: 8, background: '#ef4444', color: '#fff', fontSize: 10, minWidth: 18, height: 18, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                      {item.badge}
                    </span>
                  )}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
