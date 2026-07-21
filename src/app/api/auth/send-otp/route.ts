import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export const runtime = 'nodejs'

// Rate limit: max 3 OTPs per phone per 10 minutes
const RATE_LIMIT_MAX = 3
const RATE_LIMIT_WINDOW_MINUTES = 10

function formatPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('05') && digits.length === 10) return '+966' + digits.slice(1)
  if (digits.startsWith('9665') && digits.length === 12) return '+' + digits
  if (digits.startsWith('966') && digits.length === 12) return '+' + digits
  if (/^5\d{8}$/.test(digits)) return '+966' + digits
  return null
}

async function sendWhatsAppOtp(phone: string, otp: string): Promise<boolean> {
  const apiKey = process.env.WASENDER_API_KEY
  if (!apiKey) {
    console.log(`[DEV] WhatsApp OTP for ${phone}: ${otp}`)
    return true
  }
  const res = await fetch('https://www.wasenderapi.com/api/send-message', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: phone,
      text: `🔐 رمز التحقق لتطبيق ملاعبنا:\n\n*${otp}*\n\nصالح لمدة 5 دقائق. لا تشاركه مع أحد.`,
    }),
  })
  if (!res.ok) console.error('WasenderAPI error:', await res.text())
  return res.ok
}

export async function POST(req: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'طلب غير صالح' }, { status: 400 })
  }

  const rawPhone = (body as Record<string, unknown>)?.phone
  if (typeof rawPhone !== 'string' || !rawPhone) {
    return NextResponse.json({ error: 'رقم الجوال مطلوب' }, { status: 400 })
  }

  const formattedPhone = formatPhone(rawPhone)
  if (!formattedPhone) {
    return NextResponse.json({ error: 'رقم الجوال غير صحيح' }, { status: 400 })
  }

  // Rate limiting — فحص عدد الطلبات في آخر RATE_LIMIT_WINDOW_MINUTES دقيقة
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString()
  const { count } = await supabaseAdmin
    .from('phone_otps')
    .select('*', { count: 'exact', head: true })
    .eq('phone', formattedPhone)
    .gte('created_at', windowStart)

  if ((count ?? 0) >= RATE_LIMIT_MAX) {
    return NextResponse.json(
      { error: `تجاوزت الحد المسموح. انتظر ${RATE_LIMIT_WINDOW_MINUTES} دقائق قبل المحاولة مجدداً.` },
      { status: 429 },
    )
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000))
  const otpHash = crypto.createHash('sha256').update(otp).digest('hex')

  // حذف الأكواد القديمة غير المستخدمة لهذا الرقم
  await supabaseAdmin.from('phone_otps').delete()
    .eq('phone', formattedPhone)
    .eq('used', false)

  const { error } = await supabaseAdmin.from('phone_otps').insert({
    phone: formattedPhone,
    otp_hash: otpHash,
  })

  if (error) {
    console.error('phone_otps insert error:', JSON.stringify(error))
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }

  const sent = await sendWhatsAppOtp(formattedPhone, otp)
  if (!sent) return NextResponse.json({ error: 'فشل إرسال رسالة الواتساب' }, { status: 500 })

  return NextResponse.json({ success: true, phone: formattedPhone })
}
