import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { initiatePayment } from '@/lib/payment/processor'
import type { PaymentType } from '@/lib/payment/types'

export const runtime = 'nodejs'

const VALID_TYPES: PaymentType[] = ['booking', 'subscription', 'tournament']

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

  const { paymentType, entityId, amountSar, description } = body as Record<string, unknown>

  if (!VALID_TYPES.includes(paymentType as PaymentType)) {
    return NextResponse.json({ error: 'نوع الدفع غير صحيح' }, { status: 400 })
  }
  if (typeof entityId !== 'string' || !entityId) {
    return NextResponse.json({ error: 'معرّف الكيان مطلوب' }, { status: 400 })
  }
  if (typeof amountSar !== 'number' || amountSar <= 0) {
    return NextResponse.json({ error: 'المبلغ غير صحيح' }, { status: 400 })
  }

  const baseUrl = req.nextUrl.origin

  try {
    const result = await initiatePayment({
      userId: user.id,
      paymentType: paymentType as PaymentType,
      entityId,
      amountSar,
      description: typeof description === 'string' ? description : 'دفع ملاعبنا',
      baseUrl,
    })
    return NextResponse.json(result)
  } catch (err) {
    console.error('initiate payment error:', err)
    return NextResponse.json({ error: 'فشل بدء عملية الدفع' }, { status: 500 })
  }
}
