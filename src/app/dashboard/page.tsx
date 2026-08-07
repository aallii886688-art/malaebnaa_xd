import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Check if admin
  const { data: adminUser } = await supabase.from('admin_users').select('id').eq('user_id', user.id).single()
  if (adminUser) redirect('/admin')

  // Check if partner (uses partner_roles table, not user_roles)
  const { data: partnerRole } = await supabase.from('partner_roles').select('id').eq('user_id', user.id).eq('status', 'approved').single()
  if (partnerRole) redirect('/partner')

  redirect('/player')
}
