import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function PartnerDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  const { data: partnerRoles } = await supabase
    .from('partner_roles')
    .select('activity, status')
    .eq('user_id', user.id)

  const approvedRoles = partnerRoles?.filter((r) => r.status === 'approved') ?? []
  const pendingRoles = partnerRoles?.filter((r) => r.status === 'pending') ?? []

  const activityLabels: Record<string, { label: string; icon: string }> = {
    facility_manager: { label: 'مسؤول ملعب', icon: '⚽' },
    academy_manager: { label: 'مسؤول أكاديمية', icon: '🏅' },
    tournament_manager: { label: 'مسؤول بطولة', icon: '🏆' },
  }

  const allActivities = ['facility_manager', 'academy_manager', 'tournament_manager']
  const unactivated = allActivities.filter(
    (a) => !partnerRoles?.some((r) => r.activity === a)
  )

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="bg-[#0F6E56] text-white px-4 py-4">
        <p className="text-xs opacity-80">لوحة الشريك</p>
        <h1 className="text-lg font-bold">{profile?.full_name}</h1>
      </header>

      <div className="px-4 py-5 space-y-4">
        {/* Active activities */}
        {approvedRoles.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-[#1A1A1A]">أنشطتي المفعلة</h2>
            {approvedRoles.map((role) => {
              const info = activityLabels[role.activity]
              const href = role.activity === 'facility_manager' ? '/partner/facilities'
                : role.activity === 'academy_manager' ? '/partner/academies'
                : '/partner/tournaments'

              return (
                <a key={role.activity} href={href}
                  className="flex items-center gap-3 bg-white rounded-2xl border border-[#E8ECEF] p-4">
                  <span className="text-3xl">{info.icon}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-[#1A1A1A]">{info.label}</p>
                    <p className="text-xs text-[#0F6E56]">مفعل</p>
                  </div>
                  <span className="text-[#6B7280]">←</span>
                </a>
              )
            })}
          </div>
        )}

        {/* Pending */}
        {pendingRoles.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-bold text-[#1A1A1A]">طلبات قيد المراجعة</h2>
            {pendingRoles.map((role) => {
              const info = activityLabels[role.activity]
              return (
                <div key={role.activity} className="flex items-center gap-3 bg-[#FFF8E8] rounded-2xl border border-[#C17B1A] p-3">
                  <span className="text-2xl">{info.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A]">{info.label}</p>
                    <p className="text-xs text-[#C17B1A]">قيد المراجعة</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Unactivated */}
        {unactivated.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4">
            <h2 className="text-sm font-bold text-[#1A1A1A] mb-3">تفعيل نشاط جديد</h2>
            <div className="space-y-2">
              {unactivated.map((activity) => {
                const info = activityLabels[activity]
                return (
                  <a key={activity} href={`/partner/activate/${activity}`}
                    className="flex items-center gap-3 p-3 rounded-xl border border-[#E8ECEF] hover:border-[#0F6E56] hover:bg-[#E8F5F1] transition-all">
                    <span className="text-2xl">{info.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#1A1A1A]">{info.label}</p>
                      <p className="text-xs text-[#6B7280]">اضغط للتقديم</p>
                    </div>
                    <span className="text-xs bg-[#E8F5F1] text-[#0F6E56] px-2 py-0.5 rounded-full">+ تفعيل</span>
                  </a>
                )
              })}
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4 space-y-2">
          <a href="/partner/bookings" className="flex items-center justify-between py-2 border-b border-[#F8F9FA]">
            <span className="text-sm font-medium text-[#1A1A1A]">📅 الحجوزات</span>
            <span className="text-[#6B7280] text-sm">←</span>
          </a>
          <a href="/partner/wallet" className="flex items-center justify-between py-2 border-b border-[#F8F9FA]">
            <span className="text-sm font-medium text-[#1A1A1A]">💰 محفظتي وأرباحي</span>
            <span className="text-[#6B7280] text-sm">←</span>
          </a>
          <a href="/player" className="flex items-center justify-between py-2">
            <span className="text-sm font-medium text-[#1A1A1A]">🏃 وضع اللاعب</span>
            <span className="text-[#6B7280] text-sm">←</span>
          </a>
        </div>
      </div>
    </div>
  )
}
