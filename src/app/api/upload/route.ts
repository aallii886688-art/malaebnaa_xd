import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import crypto from 'crypto'

export const runtime = 'nodejs'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf']
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

// مجلدات مسموح بها فقط
const ALLOWED_BUCKETS = ['facility-images', 'academy-images', 'partner-docs', 'avatars'] as const
type AllowedBucket = (typeof ALLOWED_BUCKETS)[number]

export async function POST(req: NextRequest) {
  // التحقق من المستخدم
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })

  // قراءة الـ form data
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'طلب غير صالح' }, { status: 400 })
  }

  const file = formData.get('file')
  const bucket = formData.get('bucket')?.toString() ?? ''

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'الملف مطلوب' }, { status: 400 })
  }

  // التحقق من المجلد
  if (!ALLOWED_BUCKETS.includes(bucket as AllowedBucket)) {
    return NextResponse.json({ error: 'مجلد غير مسموح' }, { status: 400 })
  }

  // التحقق من الحجم
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: 'حجم الملف يتجاوز 5MB' }, { status: 400 })
  }

  if (file.size === 0) {
    return NextResponse.json({ error: 'الملف فارغ' }, { status: 400 })
  }

  // التحقق من نوع MIME
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'نوع الملف غير مسموح. المسموح: JPG، PNG، PDF' }, { status: 400 })
  }

  // التحقق من الامتداد (double check)
  const originalName = file.name.toLowerCase()
  const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => originalName.endsWith(ext))
  if (!hasValidExt) {
    return NextResponse.json({ error: 'امتداد الملف غير مسموح' }, { status: 400 })
  }

  // التحقق من محتوى الملف (magic bytes)
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const mimeFromBytes = detectMimeFromBytes(bytes)
  if (mimeFromBytes && mimeFromBytes !== file.type) {
    return NextResponse.json({ error: 'محتوى الملف لا يتطابق مع نوعه' }, { status: 400 })
  }

  // توليد اسم عشوائي آمن
  const ext = ALLOWED_EXTENSIONS.find((e) => originalName.endsWith(e)) ?? '.jpg'
  const randomName = `${user.id}/${crypto.randomBytes(16).toString('hex')}${ext}`

  // الرفع إلى Supabase Storage
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data, error } = await supabaseAdmin.storage
    .from(bucket as AllowedBucket)
    .upload(randomName, buffer, {
      contentType: file.type,
      upsert: false,
    })

  if (error) {
    console.error('Storage upload error:', error.message)
    return NextResponse.json({ error: 'فشل رفع الملف' }, { status: 500 })
  }

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from(bucket as AllowedBucket)
    .getPublicUrl(data.path)

  return NextResponse.json({ success: true, url: publicUrl, path: data.path })
}

// فحص الـ magic bytes للتحقق الفعلي من نوع الملف
function detectMimeFromBytes(bytes: Uint8Array): string | null {
  // JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return 'image/jpeg'
  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return 'image/png'
  // PDF: %PDF
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return 'application/pdf'
  return null
}
