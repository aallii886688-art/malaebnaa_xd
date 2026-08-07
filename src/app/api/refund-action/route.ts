import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { notify } from '@/lib/notify'
import { logActivity } from '@/lib/logActivity'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })

  const { data: perm } = await supabase.from('system_permissions').select('role').eq('user_id', user.id).single()
  if (!perm || !['admin', 'super_admin'].includes(perm.role)) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  }

  const { refundId, action, reason } = await req.json() as { refundId: string; action: 'approve' | 'reject'; reason?: string }
  if (!refundId || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'بيانات غير صحيحة' }, { status: 400 })
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: refund } = await admin.from('refunds').select('user_id, amount_sar').eq('id', refundId).single()
  if (!refund) return NextResponse.json({ error: 'غير موجود' }, { status: 404 })

  const status = action === 'approve' ? 'approved' : 'rejected'
  const update: Record<string, unknown> = { status, reviewed_by: user.id, reviewed_at: new Date().toISOString() }
  if (action === 'reject' && reason) update.rejection_reason = reason

  await admin.from('refunds').update(update).eq('id', refundId)
  await logActivity({ action: `refund_${status}`, entity_type: 'refunds', entity_id: refundId, after_data: update })

  await notify(`refund_${status}`, refund.user_id, {
    amount: refund.amount_sar,
    reason: reason ?? '',
    entityType: 'refund',
    entityId: refundId,
  }).catch(() => {})

  return NextResponse.json({ success: true })
}
