'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type AdminUser = {
  id: string
  user_id: string
  is_super_admin: boolean
  created_at: string
  profiles: { full_name: string; phone: string } | null
}

export default function AdminEmployeesPage() {
  const router = useRouter()
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [phone, setPhone] = useState('')
  const [adding, setAdding] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    loadAdmins()
  }, [])

  const loadAdmins = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('admin_users')
      .select('*, profiles:user_id(full_name, phone)')
      .order('created_at', { ascending: false })
    setAdmins((data as AdminUser[]) ?? [])
    setLoading(false)
  }

  const addAdmin = async () => {
    if (!phone.trim()) return
    setAdding(true)
    setMsg('')
    const supabase = createClient()
    const digits = phone.replace(/\D/g, '').replace(/^0/, '')
    const email = `${digits}@malaebnaa.internal`
    const { data: profile } = await supabase.from('profiles').select('id').eq('phone', `+966${digits}`).single()
    if (!profile) { setMsg('المستخدم غير موجود — تأكد من رقم الجوال'); setAdding(false); return }
    const { error } = await supabase.from('admin_users').insert({ user_id: profile.id, is_super_admin: false })
    if (error) { setMsg('خطأ: ' + error.message); } else { setMsg('تم إضافة المشرف'); setPhone(''); loadAdmins() }
    setAdding(false)
  }

  const removeAdmin = async (userId: string) => {
    const supabase = createClient()
    await supabase.from('admin_users').delete().eq('user_id', userId)
    setAdmins((prev) => prev.filter((a) => a.user_id !== userId))
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="bg-[#0F6E56] text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-white text-xl">←</button>
        <div>
          <p className="text-xs opacity-80">لوحة التحكم</p>
          <h1 className="text-lg font-bold">موظفو الإدارة</h1>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* Add admin */}
        <div className="bg-white rounded-xl border border-[#E8ECEF] p-4 space-y-3">
          <p className="text-sm font-bold text-[#1A1A1A]">إضافة مشرف</p>
          <div className="flex gap-2">
            <input value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="رقم الجوال (5XXXXXXXX)"
              className="flex-1 border border-[#E8ECEF] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0F6E56]"
              dir="ltr" />
            <button onClick={addAdmin} disabled={adding}
              className="bg-[#0F6E56] text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50">
              {adding ? '...' : 'إضافة'}
            </button>
          </div>
          {msg && <p className={`text-xs ${msg.includes('خطأ') ? 'text-red-500' : 'text-[#0F6E56]'}`}>{msg}</p>}
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-10 text-[#6B7280]">جاري التحميل...</div>
        ) : (
          <div className="space-y-2">
            {admins.map((a) => (
              <div key={a.id} className="bg-white rounded-xl border border-[#E8ECEF] p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#1A1A1A]">{a.profiles?.full_name ?? '—'}</p>
                  <p className="text-xs text-[#6B7280]">{a.profiles?.phone}</p>
                  {a.is_super_admin && <span className="text-xs text-[#0F6E56]">مشرف رئيسي</span>}
                </div>
                {!a.is_super_admin && (
                  <button onClick={() => removeAdmin(a.user_id)}
                    className="text-xs text-red-500 border border-red-300 px-3 py-1 rounded-lg">
                    إزالة
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
