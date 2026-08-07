import { NextRequest, NextResponse } from 'next/server'
import { sendWhatsApp } from '@/lib/whatsapp'

export const runtime = 'nodejs'

// إرسال واتساب لرقم مباشر (لمن لم يسجل بعد)
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('x-internal-key')
  if (authHeader !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { phone, message } = await req.json()
  if (!phone || !message) return NextResponse.json({ error: 'phone and message required' }, { status: 400 })

  const sent = await sendWhatsApp(phone, message)
  return NextResponse.json({ success: true, sent })
}
