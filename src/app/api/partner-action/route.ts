import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { notify } from '@/lib/notify'
import { logActivity } from '@/lib/logActivity'

export const runtime = 'nodejs'

const activityLabel: Record<string, string> = {
  facility_manager: 'مدير ملعب',
  academy_manager: 'مدير أكاديمية',
  tournament_manager: 'منظم بطولة',
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })

  // فقط الأدمن — يفحص admin_users أو profiles.role
  const { data: adminUser } = await supabase.from('admin_users').select('id').eq('user_id', user.id).single()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = !!adminUser || profile?.role === 'super_admin' || profile?.role === 'admin'
  if (!isAdmin) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  }

  const { roleId, status, note } = await req.json() as { roleId: string; status: string; note?: string }
  const validStatuses = ['approved', 'rejected', 'revision_needed', 'suspended']
  if (!roleId || !validStatuses.includes(status)) {
    return NextResponse.json({ error: 'بيانات غير صحيحة' }, { status: 400 })
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: role } = await admin.from('partner_roles').select('user_id, activity').eq('id', roleId).single()
  if (!role) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 })

  const update: Record<string, unknown> = { status, reviewed_at: new Date().toISOString(), reviewed_by: user.id }
  if (status === 'rejected') update.rejection_reason = note ?? ''
  if (status === 'revision_needed') update.admin_notes = note ?? ''

  await admin.from('partner_roles').update(update).eq('id', roleId)
  await logActivity({ action: `partner_${status}`, entity_type: 'partner_roles', entity_id: roleId, after_data: update })

  if (status === 'approved') {
    await notify('activation_approved', role.user_id, {
      activityLabel: activityLabel[role.activity] ?? role.activity,
      entityType: 'partner_role',
      entityId: roleId,
    }).catch(() => {})
  } else if (status === 'rejected') {
    await notify('activation_rejected', role.user_id, {
      reason: note ?? '',
      entityType: 'partner_role',
      entityId: roleId,
    }).catch(() => {})
  } else if (status === 'revision_needed') {
    await notify('activation_revision', role.user_id, {
      note: note ?? '',
      entityType: 'partner_role',
      entityId: roleId,
    }).catch(() => {})
  }

  return NextResponse.json({ success: true })
}
