'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Booking = {
  id: string
  booking_date: string
  start_hour: number
  end_hour: number
  total_amount_sar: number
  net_amount_sar: number
  commission_sar: number
  status: string
  facilities: { name: string } | null
  profiles: { full_name: string; phone: string } | null
}

const statusInfo: Record<string, { label: string; color: string }> = {
  pending_payment: { label: 'انتظار الدفع', color: 'bg-yellow-50 text-yellow-600' },
  confirmed:       { label: 'مؤكد',          color: 'bg-[#E8F5F1] text-[#0F6E56]' },
  cancelled:       { label: 'ملغي',           color: 'bg-red-50 text-red-500' },
  completed:       { label: 'مكتمل',          color: 'bg-gray-100 text-gray-500' },
  no_show:         { label: 'لم يحضر',        color: 'bg-gray-100 text-gray-400' },
}

const fmt = (h: number) => `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? 'ص' : 'م'}`

export default function PartnerBookingsPage() {
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'today' | 'upcoming' | 'all'>('today')
  const [updating, setUpdating] = useState<string | null>(null)

  const load = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Get partner's facility IDs
    const { data: facilities } = await supabase.from('facilities').select('id').eq('owner_id', user.id)
    const facilityIds = facilities?.map((f) => f.id) ?? []
    if (facilityIds.length === 0) { setBookings([]); setLoading(false); return }

    const today = new Date().toISOString().split('T')[0]
    let q = supabase
      .from('bookings')
      .select('*, facilities(name), profiles:user_id(full_name, phone)')
      .in('facility_id', facilityIds)
      .order('booking_date', { ascending: true })
      .order('start_hour', { ascending: true })

    if (filter === 'today') q = q.eq('booking_date', today)
    else if (filter === 'upcoming') q = q.gte('booking_date', today).not('status', 'eq', 'cancelled')

    const { data } = await q
    setBookings((data as Booking[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { setLoading(true); load() }, [filter])

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id)
    const supabase = createClient()
    await supabase.from('bookings').update({ status }).eq('id', id)
    setBookings((b) => b.map((x) => x.id === id ? { ...x, status } : x))
    setUpdating(null)
  }

  const totalNet = bookings.filter((b) => b.status !== 'cancelled').reduce((s, b) => s + +b.net_amount_sar, 0)

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="bg-[#0F6E56] text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-white text-xl">←</button>
        <div>
          <p className="text-xs opacity-80">الشريك</p>
          <h1 className="text-lg font-bold">الحجوزات</h1>
        </div>
      </header>

      {/* Filter tabs */}
      <div className="flex bg-white border-b border-[#E8ECEF]">
        {(['today', 'upcoming', 'all'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-1 py-3 text-xs font-medium ${filter === f ? 'text-[#0F6E56] border-b-2 border-[#0F6E56]' : 'text-[#6B7280]'}`}>
            {f === 'today' ? 'اليوم' : f === 'upcoming' ? 'القادمة' : 'الكل'}
          </button>
        ))}
      </div>

      {/* Summary bar */}
      {bookings.length > 0 && (
        <div className="mx-4 mt-3 bg-white rounded-2xl border border-[#E8ECEF] px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-[#6B7280]">{bookings.length} حجز</span>
          <span className="text-sm font-bold text-[#0F6E56]">صافي: {totalNet.toFixed(0)} ريال</span>
        </div>
      )}

      <div className="px-4 py-3 space-y-3 pb-6">
        {loading ? (
          <div className="text-center py-10 text-[#6B7280]">جاري التحميل...</div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-3">📅</p>
            <p className="text-sm text-[#6B7280]">
              {filter === 'today' ? 'لا توجد حجوزات اليوم' : 'لا توجد حجوزات'}
            </p>
          </div>
        ) : (
          bookings.map((b) => {
            const status = statusInfo[b.status] ?? { label: b.status, color: 'bg-gray-100 text-gray-500' }
            return (
              <div key={b.id} className="bg-white rounded-2xl border border-[#E8ECEF] p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-[#1A1A1A] text-sm">{b.profiles?.full_name}</p>
                    <p className="text-xs text-[#6B7280]" dir="ltr">{b.profiles?.phone}</p>
                    <p className="text-xs text-[#9CA3AF]">{b.facilities?.name}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
                </div>

                <div className="flex items-center gap-3 text-xs text-[#6B7280] mb-3">
                  <span>📆 {new Date(b.booking_date + 'T12:00:00').toLocaleDateString('ar-SA', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  <span dir="ltr">🕐 {fmt(b.start_hour)} – {fmt(b.end_hour)}</span>
                </div>

                <div className="flex items-center justify-between text-xs bg-[#F8F9FA] rounded-xl px-3 py-2 mb-3">
                  <span className="text-[#6B7280]">إجمالي: <strong className="text-[#1A1A1A]">{b.total_amount_sar} ر</strong></span>
                  <span className="text-[#6B7280]">عمولة: <strong className="text-red-400">{b.commission_sar} ر</strong></span>
                  <span className="text-[#6B7280]">صافي: <strong className="text-[#0F6E56]">{b.net_amount_sar} ر</strong></span>
                </div>

                {b.status === 'confirmed' && (
                  <div className="flex gap-2">
                    <button onClick={() => updateStatus(b.id, 'completed')} disabled={updating === b.id}
                      className="flex-1 bg-[#0F6E56] text-white text-xs py-2 rounded-xl disabled:opacity-50">
                      ✓ مكتمل
                    </button>
                    <button onClick={() => updateStatus(b.id, 'no_show')} disabled={updating === b.id}
                      className="flex-1 border border-[#E8ECEF] text-[#6B7280] text-xs py-2 rounded-xl disabled:opacity-50">
                      لم يحضر
                    </button>
                  </div>
                )}
                {b.status === 'pending_payment' && (
                  <button onClick={() => updateStatus(b.id, 'confirmed')} disabled={updating === b.id}
                    className="w-full bg-[#0F6E56] text-white text-xs py-2 rounded-xl disabled:opacity-50">
                    ✓ تأكيد الحجز
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
