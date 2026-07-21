import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: adminUser } = await supabase.from('admin_users').select('is_super_admin').eq('user_id', user.id).single()
  if (!adminUser) redirect('/player')

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()

  // Stats
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
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="bg-[#0F6E56] text-white px-4 py-4">
        <p className="text-xs opacity-80">لوحة تحكم الأدمن</p>
        <h1 className="text-lg font-bold">{profile?.full_name}</h1>
        {adminUser.is_super_admin && <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">مشرف رئيسي</span>}
      </header>

      <div className="px-4 py-5 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4 text-center">
            <p className="text-2xl font-bold text-[#0F6E56]">{usersCount ?? 0}</p>
            <p className="text-xs text-[#6B7280] mt-1">إجمالي المستخدمين</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4 text-center">
            <p className="text-2xl font-bold text-[#C17B1A]">{pendingCount ?? 0}</p>
            <p className="text-xs text-[#6B7280] mt-1">طلبات معلقة</p>
          </div>
        </div>

        {/* Pending partner requests section */}
        {(pendingCount ?? 0) > 0 && (
          <div className="bg-[#FFF8E8] border border-[#C17B1A] rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-[#C17B1A]">طلبات تسجيل جديدة</p>
                <p className="text-xs text-[#6B7280] mt-0.5">{pendingCount} طلب بانتظار المراجعة</p>
              </div>
              <a href="/admin/partners" className="text-xs bg-[#C17B1A] text-white px-3 py-1.5 rounded-lg">
                مراجعة
              </a>
            </div>
          </div>
        )}

        {/* Navigation grid */}
        <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4">
          <h2 className="text-sm font-bold text-[#1A1A1A] mb-3">إدارة المنصة</h2>
          <div className="grid grid-cols-2 gap-3">
            {navItems.map((item) => (
              <a key={item.href} href={item.href}
                className="flex items-center gap-3 p-3 rounded-xl border border-[#E8ECEF] hover:border-[#0F6E56] hover:bg-[#E8F5F1] transition-all relative">
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm font-medium text-[#1A1A1A]">{item.label}</span>
                {item.badge != null && item.badge > 0 && (
                  <span className="absolute top-2 left-2 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
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
