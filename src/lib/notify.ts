// مكتبة الإشعارات — تُستخدم من server-side فقط (API routes, processor)
import { createClient } from '@supabase/supabase-js'
import { sendWhatsApp, messages } from '@/lib/whatsapp'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function notify(
  type: string,
  userId: string,
  data: Record<string, unknown>,
) {
  const supabase = getAdmin()

  const { data: profile } = await supabase
    .from('profiles')
    .select('phone')
    .eq('id', userId)
    .single()

  if (!profile?.phone) return

  let message = ''
  let title = ''
  let body = ''

  switch (type) {
    case 'booking_confirmed':
      message = messages.bookingConfirmed(
        data.facilityName as string,
        data.date as string,
        data.time as string,
        data.amount as number,
      )
      title = 'تم تأكيد الحجز'
      body = `حجزك في ${data.facilityName} تم تأكيده`
      break

    case 'booking_cancelled':
      message = messages.bookingCancelled(data.facilityName as string, data.date as string)
      title = 'تم إلغاء الحجز'
      body = `حجزك في ${data.facilityName} تم إلغاؤه`
      break

    case 'subscription_confirmed':
      message = messages.subscriptionConfirmed(
        data.academyName as string,
        data.programName as string,
        data.amount as number,
      )
      title = 'تم تأكيد الاشتراك'
      body = `اشتراكك في ${data.academyName} تم تأكيده`
      break

    case 'tournament_registered':
      message = messages.tournamentRegistered(data.tournamentName as string, data.teamName as string)
      title = 'تم استلام طلب تسجيل الفريق'
      body = `طلب تسجيل فريق ${data.teamName} قيد المراجعة`
      break

    case 'team_approved':
      message = messages.tournamentTeamApproved(data.tournamentName as string, data.teamName as string)
      title = 'تم قبول فريقك'
      body = `فريق ${data.teamName} مقبول في ${data.tournamentName}`
      break

    case 'team_rejected':
      message = `❌ *لم يتم قبول فريقك*\n\n🏆 ${data.tournamentName}\n👥 ${data.teamName}\n\nللاستفسار تواصل مع منظم البطولة.`
      title = 'لم يتم قبول فريقك'
      body = `فريق ${data.teamName} لم يُقبل في ${data.tournamentName}`
      break

    case 'activation_approved':
      message = messages.partnerApproved(data.activityLabel as string)
      title = 'تم تفعيل نشاطك'
      body = `نشاطك ${data.activityLabel} تم تفعيله`
      break

    case 'activation_rejected':
      message = `❌ *لم يتم قبول طلب التفعيل*\n\n${data.reason ? `السبب: ${data.reason}` : ''}\n\nيمكنك تعديل البيانات وإعادة التقديم.`
      title = 'لم يتم قبول طلب التفعيل'
      body = 'طلب تفعيل النشاط لم يُقبل'
      break

    case 'activation_revision':
      message = `📝 *يحتاج طلبك إلى تعديل*\n\n${data.note ? `ملاحظة الأدمن: ${data.note}` : ''}\n\nيرجى مراجعة التطبيق وتحديث بياناتك.`
      title = 'طلبك يحتاج تعديل'
      body = 'راجع ملاحظات الأدمن وعدّل بيانات التفعيل'
      break

    case 'settlement_approved':
      message = `✅ *تمت الموافقة على طلب السحب*\n\n💰 ${data.amount} ريال\n\nسيتم تحويل المبلغ قريباً.`
      title = 'تمت الموافقة على السحب'
      body = `طلب سحب ${data.amount} ريال تمت الموافقة عليه`
      break

    case 'settlement_completed':
      message = `✅ *تم إتمام تحويل التسوية*\n\n💰 ${data.amount} ريال\n\nتم تحويل المبلغ إلى حسابك البنكي.`
      title = 'تم التحويل البنكي'
      body = `تم تحويل ${data.amount} ريال إلى حسابك`
      break

    case 'settlement_rejected':
      message = `❌ *تم رفض طلب السحب*\n\n💰 ${data.amount} ريال\n\nلم يتم الموافقة على طلب السحب. للاستفسار تواصل مع الدعم.`
      title = 'تم رفض طلب السحب'
      body = `طلب سحب ${data.amount} ريال تم رفضه`
      break

    case 'refund_approved':
      message = `✅ *تمت الموافقة على طلب الاسترداد*\n\n💰 ${data.amount} ريال\n\nسيتم رد المبلغ خلال 3-5 أيام عمل.`
      title = 'تمت الموافقة على الاسترداد'
      body = `طلب استرداد ${data.amount} ريال تمت الموافقة عليه`
      break

    case 'refund_rejected':
      message = `❌ *تم رفض طلب الاسترداد*\n\n${data.reason ? `السبب: ${data.reason}` : ''}\n\nللاستفسار تواصل مع الدعم.`
      title = 'تم رفض طلب الاسترداد'
      body = 'طلب الاسترداد تم رفضه'
      break

    default:
      return
  }

  await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title_ar: title,
    body_ar: body,
    entity_type: (data.entityType as string) ?? null,
    entity_id: (data.entityId as string) ?? null,
    sent_via_whatsapp: false,
  })

  const sent = await sendWhatsApp(profile.phone as string, message)

  if (sent) {
    await supabase
      .from('notifications')
      .update({ sent_via_whatsapp: true })
      .eq('user_id', userId)
      .eq('title_ar', title)
      .order('created_at', { ascending: false })
      .limit(1)
  }
}
