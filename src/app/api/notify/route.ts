import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWhatsApp, messages } from '@/lib/whatsapp'

export const runtime = 'nodejs'

// Internal API — تُستدعى من server-side فقط
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('x-internal-key')
  if (authHeader !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const body = await req.json()
  const { type, userId, data } = body

  // Get user phone
  const { data: profile } = await supabase.from('profiles').select('phone, full_name').eq('id', userId).single()
  if (!profile?.phone) return NextResponse.json({ error: 'No phone' }, { status: 400 })

  let message = ''
  let notifTitle = ''
  let notifBody = ''

  switch (type) {
    case 'booking_confirmed':
      message = messages.bookingConfirmed(data.facilityName, data.date, data.time, data.amount)
      notifTitle = 'تم تأكيد الحجز'
      notifBody = `حجزك في ${data.facilityName} تم تأكيده`
      break
    case 'booking_cancelled':
      message = messages.bookingCancelled(data.facilityName, data.date)
      notifTitle = 'تم إلغاء الحجز'
      notifBody = `حجزك في ${data.facilityName} تم إلغاؤه`
      break
    case 'subscription_confirmed':
      message = messages.subscriptionConfirmed(data.academyName, data.programName, data.amount)
      notifTitle = 'تم تأكيد الاشتراك'
      notifBody = `اشتراكك في ${data.academyName} تم تأكيده`
      break
    case 'tournament_registered':
      message = messages.tournamentRegistered(data.tournamentName, data.teamName)
      notifTitle = 'تم استلام طلب تسجيل الفريق'
      notifBody = `طلب تسجيل فريق ${data.teamName} قيد المراجعة`
      break
    case 'team_approved':
      message = messages.tournamentTeamApproved(data.tournamentName, data.teamName)
      notifTitle = 'تم قبول فريقك'
      notifBody = `فريق ${data.teamName} مقبول في ${data.tournamentName}`
      break
    case 'activation_approved':
      message = messages.partnerApproved(data.activityLabel)
      notifTitle = 'تم تفعيل نشاطك'
      notifBody = `نشاطك ${data.activityLabel} تم تفعيله`
      break
    default:
      return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  }

  // Save notification in DB
  await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title_ar: notifTitle,
    body_ar: notifBody,
    entity_type: data.entityType ?? null,
    entity_id: data.entityId ?? null,
    sent_via_whatsapp: false,
  })

  // Send WhatsApp
  const sent = await sendWhatsApp(profile.phone, message)

  // Update sent_via_whatsapp
  if (sent) {
    await supabase.from('notifications')
      .update({ sent_via_whatsapp: true })
      .eq('user_id', userId)
      .eq('title_ar', notifTitle)
      .order('created_at', { ascending: false })
      .limit(1)
  }

  return NextResponse.json({ success: true, sent })
}
