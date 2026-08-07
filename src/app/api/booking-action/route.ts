import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { notify } from '@/lib/notify'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })

  const { bookingId, status } = await req.json() as { bookingId: string; status: string }
  if (!bookingId || !['confirmed', 'completed', 'no_show', 'cancelled'].includes(status)) {
    return NextResponse.json({ error: 'بيانات غير صحيحة' }, { status: 400 })
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // تحقق أن هذا الحجز يخص ملعباً يملكه الشريك
  const { data: booking } = await admin
    .from('bookings')
    .select('user_id, booking_date, start_hour, end_hour, total_amount_sar, facilities(name, owner_id)')
    .eq('id', bookingId)
    .single()

  if (!booking) return NextResponse.json({ error: 'الحجز غير موجود' }, { status: 404 })

  const facility = (Array.isArray(booking.facilities) ? booking.facilities[0] : booking.facilities) as { name: string; owner_id: string } | null
  if (facility?.owner_id !== user.id) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  }

  await admin.from('bookings').update({ status }).eq('id', bookingId)

  // إشعار اللاعب
  const fmt = (h: number) => `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? 'ص' : 'م'}`
  const dateStr = new Date(booking.booking_date + 'T12:00:00').toLocaleDateString('ar-SA', { weekday: 'short', month: 'short', day: 'numeric' })

  if (status === 'cancelled') {
    await notify('booking_cancelled', booking.user_id, {
      facilityName: facility?.name ?? 'الملعب',
      date: dateStr,
      entityType: 'booking',
      entityId: bookingId,
    }).catch(() => {})
  } else if (status === 'confirmed') {
    await notify('booking_confirmed', booking.user_id, {
      facilityName: facility?.name ?? 'الملعب',
      date: dateStr,
      time: `${fmt(booking.start_hour)} – ${fmt(booking.end_hour)}`,
      amount: booking.total_amount_sar,
      entityType: 'booking',
      entityId: bookingId,
    }).catch(() => {})
  }

  return NextResponse.json({ success: true })
}
