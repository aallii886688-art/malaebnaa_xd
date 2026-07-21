import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function PlayerDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, booking_date, start_hour, status, facilities(name)')
    .eq('user_id', user.id)
    .eq('status', 'confirmed')
    .gte('booking_date', new Date().toISOString().split('T')[0])
    .order('booking_date', { ascending: true })
    .limit(1)

  const nextBooking = bookings?.[0]

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24">
      {/* Header */}
      <header className="bg-white border-b border-[#E8ECEF] px-4 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-[#6B7280]">أهلاً بك</p>
          <h1 className="text-base font-bold text-[#1A1A1A]">{profile?.full_name ?? 'لاعب'}</h1>
        </div>
        <div className="relative">
          <span className="text-2xl">🔔</span>
        </div>
      </header>

      <div className="px-4 py-5 space-y-4">
        {/* Next booking */}
        {nextBooking ? (
          <div className="bg-[#E8F5F1] border-2 border-[#0F6E56] rounded-2xl p-4">
            <p className="text-xs text-[#0F6E56] font-medium mb-1">حجزك القادم</p>
            <p className="font-bold text-[#1A1A1A]">{(nextBooking.facilities as unknown as { name: string })?.name}</p>
            <p className="text-sm text-[#6B7280] mt-1">
              {nextBooking.booking_date} • {nextBooking.start_hour}:00
            </p>
            <span className="mt-2 inline-block text-xs bg-[#0F6E56] text-white px-2 py-0.5 rounded-full">مؤكد</span>
          </div>
        ) : (
          <div className="bg-[#F8F9FA] border border-[#E8ECEF] rounded-2xl p-4 text-center">
            <p className="text-sm text-[#6B7280]">لا توجد حجوزات قادمة</p>
            <Link href="/player/facilities" className="text-sm text-[#0F6E56] font-medium mt-1 block">احجز ملعب الآن</Link>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4 text-center">
            <p className="text-2xl font-bold text-[#0F6E56]">0</p>
            <p className="text-xs text-[#6B7280] mt-1">حجوزاتي</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4 text-center">
            <p className="text-2xl font-bold text-[#6B3FA0]">0</p>
            <p className="text-xs text-[#6B7280] mt-1">اشتراكاتي</p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4">
          <h2 className="text-sm font-bold text-[#1A1A1A] mb-3">روابط سريعة</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { href: '/player/facilities', icon: '⚽', label: 'الملاعب' },
              { href: '/academies', icon: '🏅', label: 'الأكاديميات' },
              { href: '/tournaments', icon: '🏆', label: 'البطولات' },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-[#F8F9FA]">
                <span className="text-2xl">{item.icon}</span>
                <span className="text-xs text-[#6B7280]">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8ECEF] flex">
        {[
          { href: '/player', icon: '🏠', label: 'الرئيسية' },
          { href: '/player/bookings', icon: '📅', label: 'حجوزاتي' },
          { href: '/player/facilities', icon: '⚽', label: 'الملاعب' },
          { href: '/player/profile', icon: '👤', label: 'حسابي' },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="flex-1 flex flex-col items-center py-2 gap-0.5">
            <span className="text-xl">{item.icon}</span>
            <span className="text-xs text-[#6B7280]">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
