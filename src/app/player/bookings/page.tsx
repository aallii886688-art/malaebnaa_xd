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
  status: string
  cancelled_at: string | null
  facilities: { name: string; city: string } | null
}

const statusInfo: Record<string, { label: string; color: string }> = {
  pending_payment: { label: 'انتظار الدفع', color: 'bg-yellow-50 text-yellow-600' },
  confirmed:       { label: 'مؤكد',          color: 'bg-[#E8F5F1] text-[#0F6E56]' },
  cancelled:       { label: 'ملغي',           color: 'bg-red-50 text-red-500' },
  completed:       { label: 'مكتمل',          color: 'bg-gray-100 text-gray-500' },
  no_show:         { label: 'لم يحضر',        color: 'bg-gray-100 text-gray-400' },
}

const fmt = (h: number) => `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? 'ص' : 'م'}`

export default function PlayerBookingsPage() {
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming')
  const [cancelling, setCancelling] = useState<string | null>(null)

  const load = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const today = new Date().toISOString().split('T')[0]
    let q = supabase
      .from('bookings')
      .select('*, facilities(name, city)')
      .eq('user_id', user.id)
      .order('booking_date', { ascending: filter === 'upcoming' })
    if (filter === 'upcoming') q = q.gte('booking_date', today).not('status', 'eq', 'cancelled')
    else q = q.lt('booking_date', today)
    const { data } = await q
    setBookings((data as Booking[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { setLoading(true); load() }, [filter])

  const cancel = async (id: string) => {
    setCancelling(id)
    const supabase = createClient()
    await supabase.from('bookings').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('id', id)
    setBookings((b) => b.filter((x) => x.id !== id))
    setCancelling(null)
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24">
      <header className="bg-[#0F6E56] text-white px-4 py-4">
        <p className="text-xs opacity-80">حسابي</p>
        <h1 className="text-lg font-bold">حجوزاتي</h1>
      </header>

      <div className="flex bg-white border-b border-[#E8ECEF]">
        {(['upcoming', 'past'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-1 py-3 text-sm font-medium ${filter === f ? 'text-[#0F6E56] border-b-2 border-[#0F6E56]' : 'text-[#6B7280]'}`}>
            {f === 'upcoming' ? '📅 القادمة' : '🕐 السابقة'}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 space-y-3">
        {loading ? (
          <div className="text-center py-10 text-[#6B7280]">جاري التحميل...</div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-3">📅</p>
            <p className="text-sm font-semibold text-[#1A1A1A] mb-1">
              {filter === 'upcoming' ? 'لا توجد حجوزات قادمة' : 'لا توجد حجوزات سابقة'}
            </p>
            {filter === 'upcoming' && (
              <button onClick={() => router.push('/player/facilities')}
                className="mt-4 bg-[#0F6E56] text-white px-5 py-2.5 rounded-xl text-sm font-semibold">
                احجز ملعب الآن
              </button>
            )}
          </div>
        ) : (
          bookings.map((b) => {
            const status = statusInfo[b.status] ?? { label: b.status, color: 'bg-gray-100 text-gray-500' }
            return (
              <div key={b.id} className="bg-white rounded-2xl border border-[#E8ECEF] p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-[#1A1A1A]">{b.facilities?.name}</p>
                    <p className="text-xs text-[#6B7280]">📍 {b.facilities?.city}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
                </div>

                <div className="flex items-center gap-3 text-xs text-[#6B7280] mb-3">
                  <span>📆 {new Date(b.booking_date + 'T12:00:00').toLocaleDateString('ar-SA', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  <span dir="ltr">🕐 {fmt(b.start_hour)} – {fmt(b.end_hour)}</span>
                  <span className="font-bold text-[#0F6E56]">{b.total_amount_sar} ر</span>
                </div>

                {(b.status === 'pending_payment' || b.status === 'confirmed') && filter === 'upcoming' && (
                  <button onClick={() => cancel(b.id)} disabled={cancelling === b.id}
                    className="w-full border border-red-300 text-red-500 text-xs py-2 rounded-xl disabled:opacity-50">
                    {cancelling === b.id ? 'جاري الإلغاء...' : 'إلغاء الحجز'}
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8ECEF] flex">
        {[
          { href: '/player', icon: '🏠', label: 'الرئيسية' },
          { href: '/player/bookings', icon: '📅', label: 'حجوزاتي', active: true },
          { href: '/player/facilities', icon: '⚽', label: 'الملاعب' },
          { href: '/player/profile', icon: '👤', label: 'حسابي' },
        ].map((item) => (
          <a key={item.href} href={item.href}
            className={`flex-1 flex flex-col items-center py-2 gap-0.5 ${item.active ? 'text-[#0F6E56]' : 'text-[#6B7280]'}`}>
            <span className="text-xl">{item.icon}</span>
            <span className="text-xs">{item.label}</span>
          </a>
        ))}
      </nav>
    </div>
  )
}
