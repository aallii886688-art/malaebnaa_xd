'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type PartnerRole = {
  id: string
  user_id: string
  activity: string
  status: string
  rejection_reason: string | null
  created_at: string
  profiles: { full_name: string; phone: string } | null
}

const activityLabel: Record<string, string> = {
  facility_manager: '🏟️ مدير ملعب',
  academy_manager: '🏅 مدير أكاديمية',
  tournament_manager: '🏆 منظم بطولة',
}

const statusStyle: Record<string, { label: string; bg: string; color: string }> = {
  pending:   { label: 'معلق',   bg: 'rgba(234,179,8,0.12)', color: '#ca8a04' },
  approved:  { label: 'مقبول',  bg: 'var(--primary-dim)',    color: 'var(--primary)' },
  rejected:  { label: 'مرفوض', bg: 'var(--danger-dim)',     color: 'var(--danger)' },
  suspended: { label: 'موقوف', bg: 'var(--bg)',             color: 'var(--text3)' },
}

export default function AdminPartnersPage() {
  const router = useRouter()
  const [roles, setRoles] = useState<PartnerRole[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const load = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('partner_roles')
      .select('*, profiles(full_name, phone)')
      .order('created_at', { ascending: false })
    setRoles((data as PartnerRole[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const approve = async (id: string) => {
    setActionLoading(id)
    const supabase = createClient()
    await supabase.from('partner_roles').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', id)
    await load()
    setActionLoading(null)
  }

  const reject = async () => {
    if (!rejectId) return
    setActionLoading(rejectId)
    const supabase = createClient()
    await supabase.from('partner_roles').update({
      status: 'rejected',
      rejection_reason: rejectReason,
      reviewed_at: new Date().toISOString(),
    }).eq('id', rejectId)
    setRejectId(null); setRejectReason('')
    await load()
    setActionLoading(null)
  }

  const filtered = filter === 'all' ? roles : roles.filter((r) => r.status === filter)

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <header style={{ background: 'linear-gradient(135deg,#1a1a2e,#16213e)', padding: '52px 16px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ fontSize: 20, background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff' }}>←</button>
        <div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: 0 }}>لوحة التحكم</p>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>طلبات الشركاء</h1>
        </div>
      </header>

      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', overflowX: 'auto' }} className="no-scrollbar">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', background: filter === f ? 'var(--primary)' : 'var(--card)', color: filter === f ? 'var(--primary-fg)' : 'var(--text2)', border: filter === f ? 'none' : '1px solid var(--border)' } as React.CSSProperties}>
            {f === 'pending' ? 'معلقة' : f === 'approved' ? 'مقبولة' : f === 'rejected' ? 'مرفوضة' : 'الكل'}
            {' '}({f === 'all' ? roles.length : roles.filter((r) => r.status === f).length})
          </button>
        ))}
      </div>

      <div style={{ padding: '0 16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)' }}>جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)' }}>لا توجد طلبات</div>
        ) : (
          filtered.map((r) => {
            const st = statusStyle[r.status] ?? { label: r.status, bg: 'var(--bg)', color: 'var(--text3)' }
            return (
              <div key={r.id} style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13, margin: '0 0 2px' }}>{r.profiles?.full_name}</p>
                    <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0 }} dir="ltr">{r.profiles?.phone}</p>
                  </div>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: st.bg, color: st.color }}>{st.label}</span>
                </div>

                <p style={{ fontSize: 12, color: 'var(--text)', margin: '0 0 4px' }}>{activityLabel[r.activity]}</p>
                <p style={{ fontSize: 11, color: 'var(--text3)', margin: '0 0 12px' }}>{new Date(r.created_at).toLocaleDateString('ar-SA')}</p>

                {r.rejection_reason && (
                  <div style={{ background: 'var(--danger-dim)', borderRadius: 10, padding: '6px 10px', marginBottom: 12 }}>
                    <p style={{ fontSize: 11, color: 'var(--danger)', margin: 0 }}>سبب الرفض: {r.rejection_reason}</p>
                  </div>
                )}

                {r.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => approve(r.id)} disabled={actionLoading === r.id}
                      style={{ flex: 1, background: 'var(--primary)', color: 'var(--primary-fg)', fontSize: 12, padding: '8px', borderRadius: 12, border: 'none', cursor: 'pointer', opacity: actionLoading === r.id ? 0.5 : 1 }}>
                      {actionLoading === r.id ? '...' : '✓ قبول'}
                    </button>
                    <button onClick={() => setRejectId(r.id)}
                      style={{ flex: 1, border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: 12, padding: '8px', borderRadius: 12, background: 'transparent', cursor: 'pointer' }}>
                      ✕ رفض
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {rejectId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 50 }} onClick={() => setRejectId(null)}>
          <div style={{ background: 'var(--card)', borderRadius: '20px 20px 0 0', padding: 20, width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontWeight: 700, color: 'var(--text)', margin: '0 0 12px' }}>سبب الرفض</h3>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
              placeholder="اكتب سبب الرفض..." rows={3}
              style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 14, padding: 12, fontSize: 13, outline: 'none', background: 'transparent', color: 'var(--text)', resize: 'none', boxSizing: 'border-box', marginBottom: 12 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={reject} disabled={!rejectReason.trim() || !!actionLoading}
                style={{ flex: 1, background: 'var(--danger)', color: '#fff', padding: '11px', borderRadius: 14, fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer', opacity: !rejectReason.trim() ? 0.5 : 1 }}>
                تأكيد الرفض
              </button>
              <button onClick={() => setRejectId(null)}
                style={{ flex: 1, border: '1px solid var(--border)', padding: '11px', borderRadius: 14, fontSize: 13, background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
