import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: adminUser } = await supabase.from('admin_users').select('is_super_admin').eq('user_id', user.id).single()
  if (!adminUser) redirect('/player')

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()

  const [{ count: usersCount }, { count: pendingCount }] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('partner_roles').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  const navItems = [
    { href: '/admin/users', icon: '👥', label: 'المستخدمون' },
    { href: '/admin/partners', icon: '🤝', label: 'طلبات الشركاء', badge: pendingCount },
    { href: '/admin/facilities', icon: '⚽', label: 'الملاعب' },
    { href: '/admin/academies', icon: '🏅', label: 'الأكاديميات' },
    { href: '/admin/tournaments', icon: '🏆', label: 'البطولات' },
    { href: '/admin/fields', icon: '📋', label: 'إدارة الحقول' },
    { href: '/admin/commissions', icon: '💰', label: 'العمولات' },
    { href: '/admin/payments', icon: '💳', label: 'المدفوعات' },
    { href: '/admin/settlements', icon: '🏦', label: 'طلبات التسوية' },
    { href: '/admin/refunds', icon: '↩️', label: 'الاسترداد' },
    { href: '/admin/reports', icon: '📈', label: 'تقارير المنصة' },
    { href: '/admin/logs', icon: '📊', label: 'سجل النشاطات' },
    { href: '/admin/employees', icon: '🏢', label: 'موظفو الإدارة' },
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

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16, background: 'var(--bg)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16, textAlign: 'center' }}>
            <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--primary)', margin: '0 0 4px' }}>{usersCount ?? 0}</p>
            <p style={{ fontSize: 11, color: 'var(--text2)', margin: 0 }}>إجمالي المستخدمين</p>
          </div>
          <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16, textAlign: 'center' }}>
            <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--gold)', margin: '0 0 4px' }}>{pendingCount ?? 0}</p>
            <p style={{ fontSize: 11, color: 'var(--text2)', margin: 0 }}>طلبات معلقة</p>
          </div>
        </div>

        {(pendingCount ?? 0) > 0 && (
          <div style={{ background: 'var(--gold-dim)', border: '1px solid var(--gold)', borderRadius: 20, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)', margin: '0 0 2px' }}>طلبات تسجيل جديدة</p>
              <p style={{ fontSize: 11, color: 'var(--text2)', margin: 0 }}>{pendingCount} طلب بانتظار المراجعة</p>
            </div>
            <a href="/admin/partners" style={{ fontSize: 11, background: 'var(--gold)', color: '#fff', padding: '6px 12px', borderRadius: 10, textDecoration: 'none' }}>مراجعة</a>
          </div>
        )}

        <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 12px' }}>إدارة المنصة</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {navItems.map((item) => (
              <a key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, border: '1px solid var(--border)', textDecoration: 'none', position: 'relative', background: 'var(--bg)' }}>
                <span style={{ fontSize: 20 }}>{item.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{item.label}</span>
                {item.badge != null && item.badge > 0 && (
                  <span style={{ position: 'absolute', top: 6, left: 6, background: 'var(--danger)', color: '#fff', fontSize: 10, width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.badge}
                  </span>
                )}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
