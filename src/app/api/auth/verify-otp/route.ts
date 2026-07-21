import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { sanitizeText, enforceLimit } from '@/lib/sanitize'

export const runtime = 'nodejs'

// Rate limit: max 5 verify attempts per phone per 10 minutes (منع brute force)
const VERIFY_RATE_LIMIT = 5
const VERIFY_WINDOW_MINUTES = 10

function phoneToEmail(phone: string) {
  return `${phone.replace('+', '')}@malaebnaa.internal`
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

  const b = body as Record<string, unknown>
  const phone = typeof b.phone === 'string' ? b.phone.trim() : ''
  const otp = typeof b.otp === 'string' ? b.otp.replace(/\D/g, '').slice(0, 6) : ''
  const rawName = typeof b.full_name === 'string' ? b.full_name : ''
  const full_name = enforceLimit(sanitizeText(rawName), 'name')
  const account_type = b.account_type === 'partner' ? 'partner' : 'player'

  if (!phone || !otp) {
    return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  }

  if (otp.length !== 6) {
    return NextResponse.json({ error: 'رمز التحقق يجب أن يكون 6 أرقام' }, { status: 400 })
  }

  // Rate limit على verify لمنع brute force
  const windowStart = new Date(Date.now() - VERIFY_WINDOW_MINUTES * 60 * 1000).toISOString()
  const { count: attemptCount } = await supabaseAdmin
    .from('otp_verify_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('phone', phone)
    .gte('created_at', windowStart)
    .catch(() => ({ count: 0 }))

  if ((attemptCount ?? 0) >= VERIFY_RATE_LIMIT) {
    return NextResponse.json(
      { error: `محاولات كثيرة. انتظر ${VERIFY_WINDOW_MINUTES} دقائق.` },
      { status: 429 },
    )
  }

  // تسجيل محاولة التحقق
  await supabaseAdmin.from('otp_verify_attempts').insert({ phone }).catch(() => null)

  const otpHash = crypto.createHash('sha256').update(otp).digest('hex')

  const { data: record } = await supabaseAdmin
    .from('phone_otps')
    .select('*')
    .eq('phone', phone)
    .eq('otp_hash', otpHash)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!record) {
    return NextResponse.json({ error: 'رمز التحقق غير صحيح أو منتهي الصلاحية' }, { status: 400 })
  }

  // تعليم الكود كـ مستخدم
  await supabaseAdmin.from('phone_otps').update({ used: true }).eq('id', record.id)

  // حذف محاولات التحقق الناجحة
  await supabaseAdmin.from('otp_verify_attempts').delete().eq('phone', phone).catch(() => null)

  const email = phoneToEmail(phone)
  const tempPassword = crypto.randomBytes(16).toString('hex')

  // البحث عن مستخدم موجود
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
  const existingUser = users.find((u) => u.email === email)

  let userId: string

  if (existingUser) {
    userId = existingUser.id
    await supabaseAdmin.auth.admin.updateUserById(userId, { password: tempPassword })
  } else {
    if (!full_name) return NextResponse.json({ error: 'الاسم مطلوب للتسجيل' }, { status: 400 })

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name, phone, account_type },
    })

    if (createError || !newUser.user) {
      return NextResponse.json({ error: 'فشل إنشاء الحساب' }, { status: 500 })
    }

    userId = newUser.user.id
    await supabaseAdmin.from('profiles').upsert({ id: userId, full_name, phone })
    await supabaseAdmin.from('user_roles').upsert({
      user_id: userId,
      role: account_type === 'partner' ? 'partner' : 'player',
    })
  }

  const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const { data: session, error: signInError } = await supabaseAnon.auth.signInWithPassword({
    email,
    password: tempPassword,
  })

  if (signInError || !session.session) {
    return NextResponse.json({ error: 'فشل إنشاء الجلسة' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    access_token: session.session.access_token,
    refresh_token: session.session.refresh_token,
    is_new_user: !existingUser,
  })
}
