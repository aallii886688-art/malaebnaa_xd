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

  const { settlementId, status, transferRef } = await req.json() as { settlementId: string; status: string; transferRef?: string }
  const validStatuses = ['approved', 'processing', 'completed', 'rejected']
  if (!settlementId || !validStatuses.includes(status)) {
    return NextResponse.json({ error: 'بيانات غير صحيحة' }, { status: 400 })
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: settlement } = await admin.from('settlements').select('partner_user_id, amount_sar').eq('id', settlementId).single()
  if (!settlement) return NextResponse.json({ error: 'غير موجود' }, { status: 404 })

  const extra: Record<string, unknown> = {}
  if (status === 'completed') { extra.completed_at = new Date().toISOString(); if (transferRef) extra.transfer_ref = transferRef }

  await admin.from('settlements').update({
    status, reviewed_by: user.id, reviewed_at: new Date().toISOString(), ...extra,
  }).eq('id', settlementId)

  await logActivity({ action: `settlement_${status}`, entity_type: 'settlements', entity_id: settlementId })

  if (status === 'approved' || status === 'completed' || status === 'rejected') {
    await notify(`settlement_${status}`, settlement.partner_user_id, {
      amount: settlement.amount_sar,
      entityType: 'settlement',
      entityId: settlementId,
    }).catch(() => {})
  }

  return NextResponse.json({ success: true })
}
