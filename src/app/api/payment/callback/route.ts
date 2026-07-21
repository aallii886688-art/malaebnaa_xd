import { NextRequest, NextResponse } from 'next/server'
import { handlePaymentSuccess, handlePaymentFailed } from '@/lib/payment/processor'

export const runtime = 'nodejs'

// يُستدعى من بوابة الدفع أو من الـ redirect بعد الدفع
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const paymentRecordId = searchParams.get('payment_record_id')
  const status = searchParams.get('status')

  if (!paymentRecordId) {
    return NextResponse.redirect(new URL('/player', req.url))
  }

  if (status === 'success') {
    await handlePaymentSuccess(paymentRecordId)
    return NextResponse.redirect(new URL('/player/bookings?payment=success', req.url))
  } else {
    await handlePaymentFailed(paymentRecordId)
    return NextResponse.redirect(new URL('/player/bookings?payment=failed', req.url))
  }
}

// Webhook من بوابة الدفع (POST) — سيتم تفعيله عند اختيار المزود
export async function POST(req: NextRequest) {
  // التحقق من صحة الـ webhook signature — يختلف حسب المزود
  // TODO: أضف التحقق من signature هنا عند اختيار البوابة

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'invalid body' }, { status: 400 })

  // TODO: parse الـ webhook حسب صيغة المزود وادعُ:
  // await handlePaymentSuccess(paymentRecordId) أو handlePaymentFailed(paymentRecordId)

  console.log('[Payment webhook received]', JSON.stringify(body).slice(0, 200))
  return NextResponse.json({ received: true })
}
