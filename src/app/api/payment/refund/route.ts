import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { sanitizeText, enforceLimit } from '@/lib/sanitize'

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

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'طلب غير صالح' }, { status: 400 }) }

  const { paymentType, entityId, reason } = body
  const validTypes = ['booking', 'subscription', 'tournament']
  if (!validTypes.includes(paymentType as string)) {
    return NextResponse.json({ error: 'نوع غير صحيح' }, { status: 400 })
  }
  if (typeof entityId !== 'string' || !entityId) {
    return NextResponse.json({ error: 'المعرّف مطلوب' }, { status: 400 })
  }
  if (typeof reason !== 'string' || !reason.trim()) {
    return NextResponse.json({ error: 'سبب الاسترداد مطلوب' }, { status: 400 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // التحقق من وجود دفعة ناجحة لهذا الكيان
  const { data: payment } = await supabaseAdmin
    .from('gateway_payments')
    .select('id, amount_sar, status')
    .eq('user_id', user.id)
    .eq('payment_type', paymentType)
    .eq('entity_id', entityId)
    .eq('status', 'paid')
    .single()

  if (!payment) {
    return NextResponse.json({ error: 'لا توجد دفعة ناجحة لهذا الكيان' }, { status: 400 })
  }

  // التحقق من عدم وجود طلب استرداد مسبق
  const { data: existing } = await supabaseAdmin
    .from('refunds')
    .select('id, status')
    .eq('user_id', user.id)
    .eq('entity_id', entityId)
    .not('status', 'eq', 'rejected')
    .single()

  if (existing) {
    return NextResponse.json({ error: 'يوجد طلب استرداد سابق لهذا الكيان' }, { status: 409 })
  }

  const cleanReason = enforceLimit(sanitizeText(reason), 'description')

  const { data: refund, error } = await supabaseAdmin
    .from('refunds')
    .insert({
      user_id: user.id,
      payment_type: paymentType,
      entity_id: entityId,
      amount_sar: payment.amount_sar,
      reason: cleanReason,
      status: 'requested',
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: 'فشل إنشاء طلب الاسترداد' }, { status: 500 })
  }

  // إشعار الأدمن
  await fetch(`${req.nextUrl.origin}/api/notify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-key': process.env.INTERNAL_API_KEY ?? '',
    },
    body: JSON.stringify({
      type: 'general',
      userId: user.id,
      data: {
        entityType: paymentType,
        entityId,
        title: 'طلب استرداد جديد',
        body: `طلب استرداد ${payment.amount_sar} ريال`,
      },
    }),
  }).catch(() => null)

  return NextResponse.json({ success: true, refundId: refund.id })
}
