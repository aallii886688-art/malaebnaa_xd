'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Settlement = {
  id: string
  amount_sar: number
  status: string
  bank_name: string | null
  iban: string | null
  account_holder: string | null
  created_at: string
  profiles: { full_name: string; phone: string } | null
}

const statusStyle: Record<string, { label: string; bg: string; color: string }> = {
  requested:  { label: 'طلب جديد',     bg: 'rgba(234,179,8,0.12)',  color: '#ca8a04' },
  approved:   { label: 'موافق عليه',   bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  processing: { label: 'قيد التحويل',  bg: 'rgba(147,51,234,0.12)', color: '#9333ea' },
  completed:  { label: 'مكتمل',        bg: 'var(--primary-dim)',     color: 'var(--primary)' },
  rejected:   { label: 'مرفوض',        bg: 'var(--danger-dim)',      color: 'var(--danger)' },
}

export default function AdminSettlementsPage() {
  const router = useRouter()
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'requested' | 'all'>('requested')
  const [updating, setUpdating] = useState<string | null>(null)
  const [refInput, setRefInput] = useState<Record<string, string>>({})

  const load = async () => {
    const supabase = createClient()
    let q = supabase.from('settlements').select('*, profiles:partner_user_id(full_name, phone)').order('created_at', { ascending: false })
    if (filter === 'requested') q = q.eq('status', 'requested')
    const { data } = await q
    setSettlements((data as Settlement[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { setLoading(true); load() }, [filter])

  const updateStatus = async (id: string, status: string, extra?: Record<string, string>) => {
    setUpdating(id)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('settlements').update({
      status, reviewed_by: user?.id, reviewed_at: new Date().toISOString(),
      ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {}),
      ...extra,
    }).eq('id', id)
    setSettlements((s) => s.map((x) => x.id === id ? { ...x, status } : x))
    setUpdating(null)
  }

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <header style={{ background: 'linear-gradient(135deg,#1a1a2e,#16213e)', padding: '52px 16px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ fontSize: 20, background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff' }}>←</button>
        <div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: 0 }}>لوحة التحكم</p>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>طلبات التسوية</h1>
        </div>
      </header>

      <div style={{ display: 'flex', background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
        {(['requested', 'all'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ flex: 1, padding: '12px', fontSize: 12, fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer', color: filter === f ? 'var(--primary)' : 'var(--text2)', borderBottom: filter === f ? '2px solid var(--primary)' : '2px solid transparent' }}>
            {f === 'requested' ? 'الجديدة' : 'الكل'}
          </button>
        ))}
      </div>

      <div style={{ padding: '12px 16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)' }}>جاري التحميل...</div>
        ) : settlements.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text2)' }}>لا توجد طلبات</div>
        ) : settlements.map((s) => {
          const st = statusStyle[s.status] ?? { label: s.status, bg: 'var(--bg)', color: 'var(--text3)' }
          return (
            <div key={s.id} style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13, margin: '0 0 2px' }}>{s.profiles?.full_name}</p>
                  <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0 }} dir="ltr">{s.profiles?.phone}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: st.bg, color: st.color }}>{st.label}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary)' }}>{s.amount_sar} ر</span>
                </div>
              </div>

              {(s.bank_name || s.iban) && (
                <div style={{ background: 'var(--bg)', borderRadius: 12, padding: '8px 12px', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {s.account_holder && <p style={{ fontSize: 12, color: 'var(--text)', margin: 0 }}>{s.account_holder}</p>}
                  {s.bank_name && <p style={{ fontSize: 11, color: 'var(--text2)', margin: 0 }}>البنك: {s.bank_name}</p>}
                  {s.iban && <p style={{ fontSize: 11, color: 'var(--text2)', margin: 0, fontFamily: 'monospace' }} dir="ltr">{s.iban}</p>}
                </div>
              )}

              {s.status === 'requested' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => updateStatus(s.id, 'approved')} disabled={updating === s.id}
                    style={{ flex: 1, background: 'var(--primary)', color: 'var(--primary-fg)', fontSize: 12, padding: '8px', borderRadius: 12, border: 'none', cursor: 'pointer', opacity: updating === s.id ? 0.5 : 1 }}>موافقة</button>
                  <button onClick={() => updateStatus(s.id, 'rejected')} disabled={updating === s.id}
                    style={{ flex: 1, border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: 12, padding: '8px', borderRadius: 12, background: 'transparent', cursor: 'pointer', opacity: updating === s.id ? 0.5 : 1 }}>رفض</button>
                </div>
              )}

              {s.status === 'approved' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input value={refInput[s.id] ?? ''} onChange={(e) => setRefInput((r) => ({ ...r, [s.id]: e.target.value }))}
                    placeholder="رقم مرجع التحويل البنكي"
                    style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '8px 12px', fontSize: 12, outline: 'none', background: 'transparent', color: 'var(--text)' }} dir="ltr" />
                  <button onClick={() => updateStatus(s.id, 'completed', { transfer_reference: refInput[s.id] ?? '' })}
                    disabled={updating === s.id || !refInput[s.id]?.trim()}
                    style={{ width: '100%', background: 'var(--primary)', color: 'var(--primary-fg)', fontSize: 12, padding: '8px', borderRadius: 12, border: 'none', cursor: 'pointer', opacity: (updating === s.id || !refInput[s.id]?.trim()) ? 0.5 : 1 }}>
                    ✓ تأكيد إتمام التحويل
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
