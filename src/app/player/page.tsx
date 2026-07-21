import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const fmt = (h: number) => `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? 'ص' : 'م'}`

export default async function PlayerDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()

  const today = new Date().toISOString().split('T')[0]

  const [
    { data: nextBookings },
    { count: totalBookings },
    { count: totalSubscriptions },
  ] = await Promise.all([
    supabase.from('bookings')
      .select('id, booking_date, start_hour, end_hour, status, facilities(name, city)')
      .eq('user_id', user.id)
      .in('status', ['confirmed', 'pending_payment'])
      .gte('booking_date', today)
      .order('booking_date', { ascending: true })
      .limit(1),
    supabase.from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .not('status', 'eq', 'cancelled'),
    supabase.from('academy_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active'),
  ])

  const nextBooking = nextBookings?.[0]
  const facilityName = (nextBooking?.facilities as unknown as { name: string; city: string } | null)

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24">
      {/* Header */}
      <header className="bg-white border-b border-[#E8ECEF] px-4 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-[#6B7280]">أهلاً بك 👋</p>
          <h1 className="text-base font-bold text-[#1A1A1A]">{profile?.full_name ?? 'لاعب'}</h1>
        </div>
        <Link href="/player/bookings" className="relative">
          <span className="text-2xl">🔔</span>
        </Link>
      </header>

      <div className="px-4 py-5 space-y-4">
        {/* الحجز القادم */}
        {nextBooking ? (
          <div className="bg-[#0F6E56] rounded-2xl p-5 text-white">
            <p className="text-xs opacity-70 mb-1">حجزك القادم</p>
            <p className="font-bold text-lg">{facilityName?.name}</p>
            <p className="text-sm opacity-80 mt-0.5">📍 {facilityName?.city}</p>
            <div className="flex items-center justify-between mt-3">
              <div>
                <p className="text-xs opacity-70">التاريخ</p>
                <p className="text-sm font-semibold">
                  {new Date(nextBooking.booking_date + 'T12:00:00').toLocaleDateString('ar-SA', { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
              </div>
              <div>
                <p className="text-xs opacity-70">الوقت</p>
                <p className="text-sm font-semibold" dir="ltr">{fmt(nextBooking.start_hour)} – {fmt(nextBooking.end_hour)}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                nextBooking.status === 'confirmed' ? 'bg-white/20 text-white' : 'bg-[#C17B1A]/30 text-yellow-100'
              }`}>
                {nextBooking.status === 'confirmed' ? 'مؤكد' : 'انتظار الدفع'}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-white border-2 border-dashed border-[#0F6E56]/30 rounded-2xl p-5 text-center">
            <p className="text-3xl mb-2">🏟️</p>
            <p className="text-sm font-semibold text-[#1A1A1A] mb-1">لا توجد حجوزات قادمة</p>
            <p className="text-xs text-[#6B7280] mb-3">احجز ملعبك الآن في 3 خطوات سريعة</p>
            <Link href="/player/facilities"
              className="inline-block bg-[#0F6E56] text-white px-5 py-2 rounded-xl text-sm font-semibold">
              احجز الآن ←
            </Link>
          </div>
        )}

        {/* الإحصاءات */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/player/bookings" className="bg-white rounded-2xl border border-[#E8ECEF] p-4 text-center">
            <p className="text-2xl font-bold text-[#0F6E56]">{totalBookings ?? 0}</p>
            <p className="text-xs text-[#6B7280] mt-1">حجوزاتي</p>
          </Link>
          <Link href="/player/academies" className="bg-white rounded-2xl border border-[#E8ECEF] p-4 text-center">
            <p className="text-2xl font-bold text-[#6B3FA0]">{totalSubscriptions ?? 0}</p>
            <p className="text-xs text-[#6B7280] mt-1">اشتراكاتي</p>
          </Link>
        </div>

        {/* روابط سريعة */}
        <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4">
          <h2 className="text-sm font-bold text-[#1A1A1A] mb-3">استكشاف</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { href: '/player/facilities', icon: '⚽', label: 'الملاعب', sub: 'احجز الآن' },
              { href: '/player/academies', icon: '🏅', label: 'الأكاديميات', sub: 'سجّل' },
              { href: '/player/tournaments', icon: '🏆', label: 'البطولات', sub: 'شارك' },
            ].map((item) => (
              <Link key={item.href} href={item.href}
                className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-[#F8F9FA] border border-[#E8ECEF] text-center">
                <span className="text-2xl">{item.icon}</span>
                <span className="text-xs font-medium text-[#1A1A1A]">{item.label}</span>
                <span className="text-[10px] text-[#0F6E56]">{item.sub}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8ECEF] flex">
        {[
          { href: '/player', icon: '🏠', label: 'الرئيسية', active: true },
          { href: '/player/bookings', icon: '📅', label: 'حجوزاتي' },
          { href: '/player/facilities', icon: '⚽', label: 'الملاعب' },
          { href: '/player/profile', icon: '👤', label: 'حسابي' },
        ].map((item) => (
          <Link key={item.href} href={item.href}
            className={`flex-1 flex flex-col items-center py-2 gap-0.5 ${item.active ? 'text-[#0F6E56]' : 'text-[#6B7280]'}`}>
            <span className="text-xl">{item.icon}</span>
            <span className="text-xs">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
