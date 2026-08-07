'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useAdminPermissions() {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [permSet, setPermSet] = useState<Set<string>>(new Set())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setReady(true); return }
      const { data: adminData } = await supabase
        .from('admin_users').select('is_super_admin').eq('user_id', user.id).single()
      if (adminData?.is_super_admin) { setIsSuperAdmin(true); setReady(true); return }
      const { data: perms } = await supabase
        .from('employee_permissions').select('permission_key')
        .eq('employee_user_id', user.id).eq('scope', 'admin')
      setPermSet(new Set((perms ?? []).map((p) => p.permission_key)))
      setReady(true)
    }
    load()
  }, [])

  const can = (key: string) => isSuperAdmin || permSet.has(key)
  return { can, isSuperAdmin, ready }
}

export function usePartnerPermissions() {
  const [isOwner, setIsOwner] = useState(false)
  const [permSet, setPermSet] = useState<Set<string>>(new Set())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setReady(true); return }
      const { data: roles } = await supabase
        .from('partner_roles').select('id').eq('user_id', user.id).eq('status', 'approved')
      if (roles && roles.length > 0) { setIsOwner(true); setReady(true); return }
      const { data: perms } = await supabase
        .from('employee_permissions').select('permission_key')
        .eq('employee_user_id', user.id).eq('scope', 'partner')
      setPermSet(new Set((perms ?? []).map((p) => p.permission_key)))
      setReady(true)
    }
    load()
  }, [])

  const can = (key: string) => isOwner || permSet.has(key)
  return { can, isOwner, ready }
}
