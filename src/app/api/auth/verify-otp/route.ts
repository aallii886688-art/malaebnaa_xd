import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export const runtime = 'nodejs'

function phoneToEmail(phone: string) {
  return `${phone.replace('+', '')}@malaebnaa.internal`
}

export async function POST(req: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { phone, otp, full_name, account_type } = await req.json()
  if (!phone || !otp) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

  const otpHash = crypto.createHash('sha256').update(String(otp)).digest('hex')

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

  await supabaseAdmin.from('phone_otps').update({ used: true }).eq('id', record.id)

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
      user_metadata: { full_name, phone, account_type: account_type ?? 'player' },
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

  // إنشاء session
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
