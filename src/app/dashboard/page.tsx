import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Check if admin
  const { data: adminUser } = await supabase.from('admin_users').select('id').eq('user_id', user.id).single()
  if (adminUser) redirect('/admin')

  // Check roles
  const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id)
  const isPartner = roles?.some((r) => r.role === 'partner')
  if (isPartner) redirect('/partner')

  redirect('/player')
}
