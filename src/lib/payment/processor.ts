// المعالج المالي — business logic مستقل عن البوابة

import { createClient } from '@supabase/supabase-js'
import { paymentGateway } from './gateway'
import type { InitiatePaymentParams, CommissionCalc, PaymentType } from './types'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// ============================================================
// حساب العمولة
// ============================================================

export async function calcCommission(
  supabase: ReturnType<typeof getServiceClient>,
  paymentType: PaymentType,
  amountSar: number,
): Promise<CommissionCalc> {
  const activityMap: Record<PaymentType, string> = {
    booking: 'facility',
    subscription: 'academy',
    tournament: 'tournament',
  }

  const { data: setting } = await supabase
    .from('commission_settings')
    .select('commission_type, percentage, fixed_sar')
    .eq('activity_type', activityMap[paymentType])
    .eq('is_active', true)
    .single()

  const rate = setting?.percentage ?? 0.05
  const fixed = setting?.fixed_sar ?? 0
  const commissionSar = Math.round((amountSar * rate + fixed) * 100) / 100
  const netSar = Math.round((amountSar - commissionSar) * 100) / 100

  return { totalSar: amountSar, commissionSar, netSar, commissionRate: rate }
}

// ============================================================
// بدء عملية دفع
// ============================================================

export async function initiatePayment(params: {
  userId: string
  paymentType: PaymentType
  entityId: string
  amountSar: number
  description: string
  baseUrl: string
}) {
  const supabase = getServiceClient()

  // إنشاء سجل في gateway_payments
  const { data: paymentRecord, error } = await supabase
    .from('gateway_payments')
    .insert({
      user_id: params.userId,
      payment_type: params.paymentType,
      entity_id: params.entityId,
      amount_sar: params.amountSar,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error || !paymentRecord) throw new Error('فشل إنشاء سجل الدفع')

  const gatewayParams: InitiatePaymentParams = {
    userId: params.userId,
    paymentType: params.paymentType,
    entityId: params.entityId,
    amountSar: params.amountSar,
    description: params.description,
    successUrl: `${params.baseUrl}/api/payment/callback?payment_record_id=${paymentRecord.id}&status=success`,
    failUrl: `${params.baseUrl}/api/payment/callback?payment_record_id=${paymentRecord.id}&status=failed`,
  }

  const result = await paymentGateway.initiate(gatewayParams)

  // تحديث السجل بمعرف البوابة ورابط الدفع
  await supabase
    .from('gateway_payments')
    .update({
      gateway_payment_id: result.gatewayPaymentId,
      checkout_url: result.checkoutUrl,
    })
    .eq('id', paymentRecord.id)

  return { paymentRecordId: paymentRecord.id, checkoutUrl: result.checkoutUrl }
}

// ============================================================
// معالجة نجاح الدفع
// ============================================================

export async function handlePaymentSuccess(paymentRecordId: string) {
  const supabase = getServiceClient()

  const { data: payment } = await supabase
    .from('gateway_payments')
    .select('*')
    .eq('id', paymentRecordId)
    .single()

  if (!payment || payment.status === 'paid') return

  // تحديث حالة الدفع
  await supabase.from('gateway_payments').update({
    status: 'paid',
    paid_at: new Date().toISOString(),
  }).eq('id', paymentRecordId)

  const commission = await calcCommission(supabase, payment.payment_type, payment.amount_sar)

  if (payment.payment_type === 'booking') {
    // تأكيد الحجز
    const { data: booking } = await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', payment.entity_id)
      .select('facility_id')
      .single()

    // إضافة صافي للشريك
    if (booking?.facility_id) {
      const { data: facility } = await supabase
        .from('facilities')
        .select('owner_id')
        .eq('id', booking.facility_id)
        .single()

      if (facility?.owner_id) {
        await supabase.rpc('credit_partner_wallet', {
          p_partner_id: facility.owner_id,
          p_amount: commission.netSar,
          p_source_type: 'booking',
          p_source_id: payment.entity_id,
          p_description: `حجز ملعب — صافي بعد عمولة ${(commission.commissionRate * 100).toFixed(0)}%`,
        })
      }
    }
  } else if (payment.payment_type === 'subscription') {
    // تأكيد الاشتراك
    await supabase.from('academy_subscriptions').update({
      status: 'active',
      start_date: new Date().toISOString().split('T')[0],
    }).eq('id', payment.entity_id)

    const { data: sub } = await supabase
      .from('academy_subscriptions')
      .select('program_id, academy_programs(academy_id, academies(owner_id))')
      .eq('id', payment.entity_id)
      .single()

    const ownerId = (sub?.academy_programs as { academies?: { owner_id?: string } })?.academies?.owner_id
    if (ownerId) {
      await supabase.rpc('credit_partner_wallet', {
        p_partner_id: ownerId,
        p_amount: commission.netSar,
        p_source_type: 'subscription',
        p_source_id: payment.entity_id,
        p_description: `اشتراك أكاديمية — صافي بعد عمولة`,
      })
    }
  } else if (payment.payment_type === 'tournament') {
    // تأكيد تسجيل الفريق
    await supabase.from('tournament_teams').update({ registration_fee_paid: true })
      .eq('id', payment.entity_id)

    const { data: team } = await supabase
      .from('tournament_teams')
      .select('tournament_id, tournaments(owner_id)')
      .eq('id', payment.entity_id)
      .single()

    const ownerId = (team?.tournaments as { owner_id?: string })?.owner_id
    if (ownerId) {
      await supabase.rpc('credit_partner_wallet', {
        p_partner_id: ownerId,
        p_amount: commission.netSar,
        p_source_type: 'tournament',
        p_source_id: payment.entity_id,
        p_description: `تسجيل بطولة — صافي بعد عمولة`,
      })
    }
  }
}

// ============================================================
// معالجة فشل الدفع
// ============================================================

export async function handlePaymentFailed(paymentRecordId: string) {
  const supabase = getServiceClient()
  await supabase.from('gateway_payments').update({
    status: 'failed',
    failed_at: new Date().toISOString(),
  }).eq('id', paymentRecordId)
}
