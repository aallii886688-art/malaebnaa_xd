import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export const runtime = 'nodejs'

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('05') && digits.length === 10) return '+966' + digits.slice(1)
  if (digits.startsWith('9665') && digits.length === 12) return '+' + digits
  if (digits.startsWith('966') && digits.length === 12) return '+' + digits
  return raw
}

async function sendWhatsAppOtp(phone: string, otp: string): Promise<boolean> {
  const apiKey = process.env.WASENDER_API_KEY

  if (!apiKey) {
    console.log(`[DEV] WhatsApp OTP for ${phone}: ${otp}`)
    return true
  }

  // WasenderAPI — إرسال رسالة نصية
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

  if (!res.ok) {
    const err = await res.text()
    console.error('WasenderAPI error:', err)
    return false
  }

  return true
}

export async function POST(req: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { phone } = await req.json()
  if (!phone) return NextResponse.json({ error: 'رقم الجوال مطلوب' }, { status: 400 })

  const formattedPhone = formatPhone(phone)
  const otp = String(Math.floor(100000 + Math.random() * 900000))
  const otpHash = crypto.createHash('sha256').update(otp).digest('hex')

  await supabaseAdmin.from('phone_otps').delete().eq('phone', formattedPhone)

  const { error } = await supabaseAdmin.from('phone_otps').insert({
    phone: formattedPhone,
    otp_hash: otpHash,
  })

  if (error) {
    console.error('phone_otps insert error:', JSON.stringify(error))
    return NextResponse.json({ error: error.message ?? 'خطأ في الخادم' }, { status: 500 })
  }

  const sent = await sendWhatsAppOtp(formattedPhone, otp)
  if (!sent) return NextResponse.json({ error: 'فشل إرسال رسالة الواتساب' }, { status: 500 })

  return NextResponse.json({ success: true, phone: formattedPhone })
}
