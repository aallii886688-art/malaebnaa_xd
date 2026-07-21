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

  useEffect(() => { loadAdmins() }, [])

  const loadAdmins = async () => {
    const supabase = createClient()
    const { data } = await supabase.from('admin_users').select('*, profiles:user_id(full_name, phone)').order('created_at', { ascending: false })
    setAdmins((data as AdminUser[]) ?? [])
    setLoading(false)
  }

  const addAdmin = async () => {
    if (!phone.trim()) return
    setAdding(true); setMsg('')
    const supabase = createClient()
    const digits = phone.replace(/\D/g, '').replace(/^0/, '')
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

  const inputStyle = { border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px', fontSize: 13, outline: 'none', background: 'var(--bg)', color: 'var(--text)' }

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <header style={{ background: 'linear-gradient(135deg,#1a1a2e,#16213e)', padding: '52px 16px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ fontSize: 20, background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff' }}>←</button>
        <div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: 0 }}>لوحة التحكم</p>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>موظفو الإدارة</h1>
        </div>
      </header>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>إضافة مشرف</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="رقم الجوال (5XXXXXXXX)"
              style={{ flex: 1, ...inputStyle }} dir="ltr" />
            <button onClick={addAdmin} disabled={adding}
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)', fontSize: 13, padding: '9px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', opacity: adding ? 0.5 : 1 }}>
              {adding ? '...' : 'إضافة'}
            </button>
          </div>
          {msg && <p style={{ fontSize: 12, color: msg.includes('خطأ') ? 'var(--danger)' : 'var(--primary)', margin: 0 }}>{msg}</p>}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)' }}>جاري التحميل...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {admins.map((a) => (
              <div key={a.id} style={{ background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)', padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', margin: '0 0 2px' }}>{a.profiles?.full_name ?? '—'}</p>
                  <p style={{ fontSize: 12, color: 'var(--text2)', margin: '0 0 2px' }}>{a.profiles?.phone}</p>
                  {a.is_super_admin && <span style={{ fontSize: 11, color: 'var(--primary)' }}>مشرف رئيسي</span>}
                </div>
                {!a.is_super_admin && (
                  <button onClick={() => removeAdmin(a.user_id)}
                    style={{ fontSize: 12, color: 'var(--danger)', border: '1px solid var(--danger)', padding: '5px 12px', borderRadius: 10, background: 'transparent', cursor: 'pointer' }}>
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
