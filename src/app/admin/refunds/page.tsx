'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Refund = {
  id: string
  payment_type: string
  amount_sar: number
  reason: string
  status: string
  created_at: string
  profiles: { full_name: string; phone: string } | null
}

const statusStyle: Record<string, { label: string; bg: string; color: string }> = {
  requested: { label: 'بانتظار المراجعة', bg: 'rgba(234,179,8,0.12)', color: '#ca8a04' },
  approved:  { label: 'موافق عليه',        bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  rejected:  { label: 'مرفوض',            bg: 'var(--danger-dim)',      color: 'var(--danger)' },
  completed: { label: 'مكتمل',            bg: 'var(--primary-dim)',     color: 'var(--primary)' },
}

const typeLabel: Record<string, string> = {
  booking: '📅 حجز', subscription: '🏅 اشتراك', tournament: '🏆 بطولة',
}

export default function AdminRefundsPage() {
  const router = useRouter()
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'requested' | 'all'>('requested')
  const [updating, setUpdating] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)

  const load = async () => {
    const supabase = createClient()
    let q = supabase.from('refunds').select('*, profiles:user_id(full_name, phone)').order('created_at', { ascending: false })
    if (filter === 'requested') q = q.eq('status', 'requested')
    const { data } = await q
    setRefunds((data as Refund[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { setLoading(true); load() }, [filter])

  const approve = async (id: string) => {
    setUpdating(id)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('refunds').update({ status: 'approved', reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq('id', id)
    setRefunds((r) => r.map((x) => x.id === id ? { ...x, status: 'approved' } : x))
    setUpdating(null)
  }

  const reject = async (id: string) => {
    if (!rejectReason.trim()) return
    setUpdating(id)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('refunds').update({ status: 'rejected', rejection_reason: rejectReason, reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq('id', id)
    setRefunds((r) => r.map((x) => x.id === id ? { ...x, status: 'rejected' } : x))
    setRejectTarget(null); setRejectReason(''); setUpdating(null)
  }

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <header style={{ background: 'linear-gradient(135deg,#1a1a2e,#16213e)', padding: '52px 16px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ fontSize: 20, background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff' }}>←</button>
        <div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: 0 }}>لوحة التحكم</p>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>طلبات الاسترداد</h1>
        </div>
      </header>

      <div style={{ display: 'flex', background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
        {(['requested', 'all'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ flex: 1, padding: '12px', fontSize: 12, fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer', color: filter === f ? 'var(--primary)' : 'var(--text2)', borderBottom: filter === f ? '2px solid var(--primary)' : '2px solid transparent' }}>
            {f === 'requested' ? 'بانتظار المراجعة' : 'الكل'}
          </button>
        ))}
      </div>

      <div style={{ padding: '12px 16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)' }}>جاري التحميل...</div>
        ) : refunds.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text2)' }}>لا توجد طلبات</div>
        ) : refunds.map((r) => {
          const st = statusStyle[r.status] ?? { label: r.status, bg: 'var(--bg)', color: 'var(--text3)' }
          return (
            <div key={r.id} style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13, margin: '0 0 2px' }}>{r.profiles?.full_name}</p>
                  <p style={{ fontSize: 12, color: 'var(--text2)', margin: '0 0 2px' }} dir="ltr">{r.profiles?.phone}</p>
                  <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>{typeLabel[r.payment_type]}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: st.bg, color: st.color }}>{st.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)' }}>{r.amount_sar} ر</span>
                </div>
              </div>

              <div style={{ background: 'var(--bg)', borderRadius: 12, padding: '8px 12px', marginBottom: 12 }}>
                <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0 }}>السبب: <span style={{ color: 'var(--text)' }}>{r.reason}</span></p>
              </div>

              {r.status === 'requested' && (
                rejectTarget === r.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="سبب الرفض..." rows={2}
                      style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 12, padding: '8px 12px', fontSize: 12, outline: 'none', background: 'transparent', color: 'var(--text)', resize: 'none', boxSizing: 'border-box' }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => reject(r.id)} disabled={updating === r.id}
                        style={{ flex: 1, background: 'var(--danger)', color: '#fff', fontSize: 12, padding: '8px', borderRadius: 12, border: 'none', cursor: 'pointer', opacity: updating === r.id ? 0.5 : 1 }}>تأكيد الرفض</button>
                      <button onClick={() => { setRejectTarget(null); setRejectReason('') }}
                        style={{ flex: 1, border: '1px solid var(--border)', fontSize: 12, padding: '8px', borderRadius: 12, background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}>إلغاء</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => approve(r.id)} disabled={updating === r.id}
                      style={{ flex: 1, background: 'var(--primary)', color: 'var(--primary-fg)', fontSize: 12, padding: '8px', borderRadius: 12, border: 'none', cursor: 'pointer', opacity: updating === r.id ? 0.5 : 1 }}>✓ موافقة</button>
                    <button onClick={() => setRejectTarget(r.id)}
                      style={{ flex: 1, border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: 12, padding: '8px', borderRadius: 12, background: 'transparent', cursor: 'pointer' }}>✕ رفض</button>
                  </div>
                )
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
