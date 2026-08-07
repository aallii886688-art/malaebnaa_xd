import { createClient } from '@/lib/supabase/client'

export async function logActivity({
  action,
  entity_type,
  entity_id,
  before_data,
  after_data,
  actor_role = 'admin',
}: {
  action: string
  entity_type: string
  entity_id?: string
  before_data?: Record<string, unknown>
  after_data?: Record<string, unknown>
  actor_role?: string
}) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('activity_logs').insert({
      actor_id: user.id,
      actor_role,
      action,
      entity_type,
      entity_id: entity_id ?? null,
      before_data: before_data ?? null,
      after_data: after_data ?? null,
    })
  } catch { /* نتجاهل أخطاء التسجيل */ }
}
