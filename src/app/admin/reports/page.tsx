'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type PeriodKey = '7d' | '30d' | '90d' | 'all'

type PlatformStats = {
  totalUsers: number
  newUsers: number
  totalBookings: number
  confirmedBookings: number
  totalRevenue: number
  totalCommission: number
  totalFacilities: number
  activeFacilities: number
  totalAcademies: number
  totalTournaments: number
  pendingPartners: number
  pendingSettlements: number
  pendingRefunds: number
  byDay: { date: string; bookings: number; commission: number }[]
}

const periods: { key: PeriodKey; label: string }[] = [
  { key: '7d', label: '7 أيام' },
  { key: '30d', label: '30 يوم' },
  { key: '90d', label: '90 يوم' },
  { key: 'all', label: 'الكل' },
]

export default function AdminReportsPage() {
  const router = useRouter()
  const [period, setPeriod] = useState<PeriodKey>('30d')
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const supabase = createClient()

      const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : null
      const from = days ? (() => { const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString().split('T')[0] })() : null

      let bookingsQ = supabase.from('bookings').select('id, status, total_amount_sar, commission_sar, booking_date')
      if (from) bookingsQ = bookingsQ.gte('booking_date', from)

      let usersQ = supabase.from('profiles').select('id, created_at', { count: 'exact' })

      const [
        { data: bookings },
        { count: totalUsers },
        { count: totalFacilities },
        { count: activeFacilities },
        { count: totalAcademies },
        { count: totalTournaments },
        { count: pendingPartners },
        { count: pendingSettlements },
        { count: pendingRefunds },
      ] = await Promise.all([
        bookingsQ,
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('facilities').select('*', { count: 'exact', head: true }),
        supabase.from('facilities').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('academies').select('*', { count: 'exact', head: true }),
        supabase.from('tournaments').select('*', { count: 'exact', head: true }),
        supabase.from('partner_roles').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('settlements').select('*', { count: 'exact', head: true }).eq('status', 'requested'),
        supabase.from('refunds').select('*', { count: 'exact', head: true }).eq('status', 'requested'),
      ])

      const all = bookings ?? []
      const confirmed = all.filter((b) => b.status !== 'cancelled')
      const totalRevenue = confirmed.reduce((s, b) => s + +b.total_amount_sar, 0)
      const totalCommission = confirmed.reduce((s, b) => s + +b.commission_sar, 0)

      // مستخدمون جدد في الفترة
      const { count: newUsers } = from
        ? await supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', from + 'T00:00:00')
        : { count: 0 }

      // رسم بياني آخر 14 يوم
      const chartDays = 14
      const byDay: PlatformStats['byDay'] = []
      for (let i = chartDays - 1; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i)
        const date = d.toISOString().split('T')[0]
        const dayB = confirmed.filter((b) => b.booking_date === date)
        byDay.push({ date, bookings: dayB.length, commission: dayB.reduce((s, b) => s + +b.commission_sar, 0) })
      }

      setStats({
        totalUsers: totalUsers ?? 0,
        newUsers: newUsers ?? 0,
        totalBookings: all.length,
        confirmedBookings: confirmed.length,
        totalRevenue,
        totalCommission,
        totalFacilities: totalFacilities ?? 0,
        activeFacilities: activeFacilities ?? 0,
        totalAcademies: totalAcademies ?? 0,
        totalTournaments: totalTournaments ?? 0,
        pendingPartners: pendingPartners ?? 0,
        pendingSettlements: pendingSettlements ?? 0,
        pendingRefunds: pendingRefunds ?? 0,
        byDay,
      })
      setLoading(false)
    }
    load()
  }, [period])

  const maxCommission = Math.max(...(stats?.byDay.map((d) => d.commission) ?? [1]), 1)

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="bg-[#0F6E56] text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-xl">←</button>
        <div><p className="text-xs opacity-80">لوحة التحكم</p><h1 className="text-lg font-bold">تقارير المنصة</h1></div>
      </header>

      {/* فلتر الفترة */}
      <div className="flex gap-2 px-4 py-3">
        {periods.map((p) => (
          <button key={p.key} onClick={() => setPeriod(p.key)}
            className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
              period === p.key ? 'bg-[#0F6E56] text-white' : 'bg-white border border-[#E8ECEF] text-[#6B7280]'
            }`}>
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-[#6B7280]">جاري التحميل...</div>
      ) : !stats ? null : (
        <div className="px-4 space-y-4 pb-8">
          {/* عمولات المنصة */}
          <div className="bg-[#0F6E56] rounded-2xl p-5 text-white">
            <p className="text-xs opacity-70 mb-1">عمولات المنصة</p>
            <p className="text-3xl font-bold">{stats.totalCommission.toFixed(0)} <span className="text-base">ريال</span></p>
            <div className="grid grid-cols-2 gap-3 mt-3 border-t border-white/20 pt-3">
              <div>
                <p className="text-xs opacity-70">إجمالي الإيرادات</p>
                <p className="font-bold">{stats.totalRevenue.toFixed(0)} ر</p>
              </div>
              <div>
                <p className="text-xs opacity-70">الحجوزات المكتملة</p>
                <p className="font-bold">{stats.confirmedBookings}</p>
              </div>
            </div>
          </div>

          {/* المستخدمون */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4 text-center">
              <p className="text-2xl font-bold text-[#0F6E56]">{stats.totalUsers}</p>
              <p className="text-xs text-[#6B7280] mt-1">إجمالي المستخدمين</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4 text-center">
              <p className="text-2xl font-bold text-[#6B3FA0]">+{stats.newUsers}</p>
              <p className="text-xs text-[#6B7280] mt-1">مستخدم جديد</p>
            </div>
          </div>

          {/* المحتوى */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4">
              <p className="text-lg font-bold text-[#1A1A1A]">{stats.activeFacilities}<span className="text-xs text-[#9CA3AF]">/{stats.totalFacilities}</span></p>
              <p className="text-xs text-[#6B7280] mt-1">⚽ ملاعب نشطة</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4">
              <p className="text-lg font-bold text-[#1A1A1A]">{stats.totalAcademies}</p>
              <p className="text-xs text-[#6B7280] mt-1">🏅 أكاديميات</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4">
              <p className="text-lg font-bold text-[#1A1A1A]">{stats.totalTournaments}</p>
              <p className="text-xs text-[#6B7280] mt-1">🏆 بطولات</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4">
              <p className="text-lg font-bold text-[#1A1A1A]">{stats.totalBookings}</p>
              <p className="text-xs text-[#6B7280] mt-1">📅 حجوزات</p>
            </div>
          </div>

          {/* تنبيهات تحتاج مراجعة */}
          {(stats.pendingPartners > 0 || stats.pendingSettlements > 0 || stats.pendingRefunds > 0) && (
            <div className="bg-[#FFF8E8] border border-[#C17B1A] rounded-2xl p-4 space-y-2">
              <p className="text-xs font-bold text-[#C17B1A]">⚠️ تحتاج مراجعة</p>
              {stats.pendingPartners > 0 && (
                <a href="/admin/partners" className="flex items-center justify-between py-1.5 border-b border-[#C17B1A]/20">
                  <span className="text-xs text-[#1A1A1A]">طلبات شركاء معلقة</span>
                  <span className="text-xs font-bold text-[#C17B1A]">{stats.pendingPartners}</span>
                </a>
              )}
              {stats.pendingSettlements > 0 && (
                <a href="/admin/settlements" className="flex items-center justify-between py-1.5 border-b border-[#C17B1A]/20">
                  <span className="text-xs text-[#1A1A1A]">طلبات تسوية</span>
                  <span className="text-xs font-bold text-[#C17B1A]">{stats.pendingSettlements}</span>
                </a>
              )}
              {stats.pendingRefunds > 0 && (
                <a href="/admin/refunds" className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-[#1A1A1A]">طلبات استرداد</span>
                  <span className="text-xs font-bold text-[#C17B1A]">{stats.pendingRefunds}</span>
                </a>
              )}
            </div>
          )}

          {/* رسم بياني — عمولات يومية */}
          {stats.byDay.some((d) => d.commission > 0) && (
            <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4">
              <p className="text-xs font-bold text-[#1A1A1A] mb-4">العمولة اليومية (آخر 14 يوم)</p>
              <div className="flex items-end gap-1 h-24">
                {stats.byDay.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-[#0F6E56] rounded-t-sm"
                      style={{ height: `${Math.max((d.commission / maxCommission) * 80, d.commission > 0 ? 4 : 0)}px` }}
                      title={`${d.commission.toFixed(0)} ر`}
                    />
                    <span className="text-[8px] text-[#9CA3AF]">
                      {new Date(d.date + 'T12:00:00').getDate()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
