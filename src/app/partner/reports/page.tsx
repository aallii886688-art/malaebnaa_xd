'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type PeriodKey = '7d' | '30d' | '90d'

type Stats = {
  totalBookings: number
  confirmedBookings: number
  cancelledBookings: number
  totalRevenue: number
  totalNet: number
  totalCommission: number
  topFacility: string | null
  byDay: { date: string; count: number; net: number }[]
}

const periods: { key: PeriodKey; label: string }[] = [
  { key: '7d', label: '7 أيام' },
  { key: '30d', label: '30 يوم' },
  { key: '90d', label: '90 يوم' },
]

export default function PartnerReportsPage() {
  const router = useRouter()
  const [period, setPeriod] = useState<PeriodKey>('30d')
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
      const fromDate = new Date()
      fromDate.setDate(fromDate.getDate() - days)
      const from = fromDate.toISOString().split('T')[0]

      const { data: facilities } = await supabase.from('facilities').select('id, name').eq('owner_id', user.id)
      const facilityIds = (facilities ?? []).map((f) => f.id)

      if (facilityIds.length === 0) {
        setStats({ totalBookings: 0, confirmedBookings: 0, cancelledBookings: 0, totalRevenue: 0, totalNet: 0, totalCommission: 0, topFacility: null, byDay: [] })
        setLoading(false)
        return
      }

      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, status, total_amount_sar, net_amount_sar, commission_sar, booking_date, facility_id')
        .in('facility_id', facilityIds)
        .gte('booking_date', from)

      const all = bookings ?? []
      const confirmed = all.filter((b) => b.status !== 'cancelled')
      const cancelled = all.filter((b) => b.status === 'cancelled')
      const totalRevenue = confirmed.reduce((s, b) => s + +b.total_amount_sar, 0)
      const totalNet = confirmed.reduce((s, b) => s + +b.net_amount_sar, 0)
      const totalCommission = confirmed.reduce((s, b) => s + +b.commission_sar, 0)

      // أفضل ملعب
      const facilityCount: Record<string, number> = {}
      confirmed.forEach((b) => { facilityCount[b.facility_id] = (facilityCount[b.facility_id] ?? 0) + 1 })
      const topFacilityId = Object.entries(facilityCount).sort((a, b) => b[1] - a[1])[0]?.[0]
      const topFacility = facilities?.find((f) => f.id === topFacilityId)?.name ?? null

      // تجميع بالأيام (آخر 14 يوم فقط للرسم)
      const chartDays = Math.min(days, 14)
      const byDay: Stats['byDay'] = []
      for (let i = chartDays - 1; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i)
        const date = d.toISOString().split('T')[0]
        const dayBookings = confirmed.filter((b) => b.booking_date === date)
        byDay.push({ date, count: dayBookings.length, net: dayBookings.reduce((s, b) => s + +b.net_amount_sar, 0) })
      }

      setStats({ totalBookings: all.length, confirmedBookings: confirmed.length, cancelledBookings: cancelled.length, totalRevenue, totalNet, totalCommission, topFacility, byDay })
      setLoading(false)
    }
    load()
  }, [period, router])

  const maxNet = Math.max(...(stats?.byDay.map((d) => d.net) ?? [1]), 1)

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="bg-[#0F6E56] text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-xl">←</button>
        <div><p className="text-xs opacity-80">الشريك</p><h1 className="text-lg font-bold">التقارير</h1></div>
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
          {/* الإيرادات */}
          <div className="bg-[#0F6E56] rounded-2xl p-5 text-white">
            <p className="text-xs opacity-70 mb-1">صافي الأرباح</p>
            <p className="text-3xl font-bold">{stats.totalNet.toFixed(0)} <span className="text-base">ريال</span></p>
            <div className="grid grid-cols-2 gap-3 mt-3 border-t border-white/20 pt-3">
              <div>
                <p className="text-xs opacity-70">إجمالي الإيرادات</p>
                <p className="font-bold">{stats.totalRevenue.toFixed(0)} ر</p>
              </div>
              <div>
                <p className="text-xs opacity-70">عمولة المنصة (5%)</p>
                <p className="font-bold">{stats.totalCommission.toFixed(0)} ر</p>
              </div>
            </div>
          </div>

          {/* إحصاءات الحجوزات */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4 text-center">
              <p className="text-xl font-bold text-[#1A1A1A]">{stats.totalBookings}</p>
              <p className="text-[10px] text-[#6B7280] mt-1">إجمالي</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4 text-center">
              <p className="text-xl font-bold text-[#0F6E56]">{stats.confirmedBookings}</p>
              <p className="text-[10px] text-[#6B7280] mt-1">مكتملة</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4 text-center">
              <p className="text-xl font-bold text-red-400">{stats.cancelledBookings}</p>
              <p className="text-[10px] text-[#6B7280] mt-1">ملغاة</p>
            </div>
          </div>

          {/* أفضل ملعب */}
          {stats.topFacility && (
            <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4 flex items-center gap-3">
              <span className="text-2xl">🏟️</span>
              <div>
                <p className="text-xs text-[#9CA3AF]">الملعب الأكثر حجزاً</p>
                <p className="font-bold text-sm text-[#1A1A1A]">{stats.topFacility}</p>
              </div>
            </div>
          )}

          {/* رسم بياني — صافي الأرباح اليومي */}
          {stats.byDay.some((d) => d.net > 0) && (
            <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4">
              <p className="text-xs font-bold text-[#1A1A1A] mb-4">الأرباح اليومية (آخر {stats.byDay.length} يوم)</p>
              <div className="flex items-end gap-1 h-24">
                {stats.byDay.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-[#0F6E56] rounded-t-sm transition-all"
                      style={{ height: `${Math.max((d.net / maxNet) * 80, d.net > 0 ? 4 : 0)}px` }}
                      title={`${d.net.toFixed(0)} ر`}
                    />
                    <span className="text-[8px] text-[#9CA3AF]">
                      {new Date(d.date + 'T12:00:00').getDate()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* معدل الإلغاء */}
          {stats.totalBookings > 0 && (
            <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4">
              <p className="text-xs font-bold text-[#1A1A1A] mb-3">نسبة الإتمام</p>
              <div className="w-full bg-[#F8F9FA] rounded-full h-3">
                <div className="bg-[#0F6E56] h-3 rounded-full transition-all"
                  style={{ width: `${((stats.confirmedBookings / stats.totalBookings) * 100).toFixed(0)}%` }} />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-xs text-[#0F6E56] font-medium">
                  {((stats.confirmedBookings / stats.totalBookings) * 100).toFixed(0)}% مكتملة
                </span>
                <span className="text-xs text-red-400">
                  {((stats.cancelledBookings / stats.totalBookings) * 100).toFixed(0)}% ملغاة
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
