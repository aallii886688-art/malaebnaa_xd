'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Sub = {
  id: string
  facility_id: number
  facility_name: string
  owner_name: string
  status: string
  tier: string
  monthly_price: number
  trial_ends_at: string | null
  next_due_at: string | null
  last_payment_at: string | null
  booking_count_this_month: number
  is_overdue: boolean
  expires_soon: boolean
}

const statusInfo: Record<string, { label: string; color: string; bg: string }> = {
  trial:     { label: 'تجريبي', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  active:    { label: 'نشط',    color: 'var(--primary)', bg: 'var(--primary-dim)' },
  suspended: { label: 'موقوف', color: 'var(--danger)', bg: 'var(--danger-dim)' },
  expired:   { label: 'منتهي', color: 'var(--text3)', bg: 'var(--bg)' },
  cancelled: { label: 'ملغي',  color: 'var(--text3)', bg: 'var(--bg)' },
}

export default function AdminSubscriptionsPage() {
  const router = useRouter()
  const [subs, setSubs] = useState<Sub[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'trial' | 'active' | 'overdue'>('all')
  const [renewing, setRenewing] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const supabase = createClient()
    let q = supabase.from('v_subscriptions_dashboard').select('*').order('is_overdue', { ascending: false }).order('next_due_at', { ascending: true })
    if (filter === 'trial')   q = q.eq('status', 'trial')
    if (filter === 'active')  q = q.eq('status', 'active')
    if (filter === 'overdue') q = q.eq('is_overdue', true)
    const { data } = await q
    setSubs((data as Sub[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      load()
    })
  }, [])

  useEffect(() => { load() }, [filter])

  const renew = async (facilityId: number, subId: string) => {
    setRenewing(subId)
    const supabase = createClient()
    await supabase.rpc('create_or_renew_subscription', {
      p_facility_id: facilityId,
      p_payment_ref: `admin_manual_${Date.now()}`,
      p_months: 1,
    })
    setRenewing(null)
    load()
  }

  const overdue  = subs.filter(s => s.is_overdue).length
  const trial    = subs.filter(s => s.status === 'trial').length
  const active   = subs.filter(s => s.status === 'active').length

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <header style={{ background: 'linear-gradient(135deg,#1a1a2e,#16213e)', padding: '52px 16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ fontSize: 20, background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff' }}>←</button>
        <div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: 0 }}>الأدمن</p>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>💳 اشتراكات الملاعب</h1>
        </div>
      </header>

      {/* KPIs */}
      <div style={{ padding: '16px 16px 0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[
          { label: 'نشط', val: active, color: 'var(--primary)' },
          { label: 'تجريبي', val: trial, color: '#f59e0b' },
          { label: 'متأخر', val: overdue, color: 'var(--danger)' },
        ].map(k => (
          <div key={k.label} style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)', padding: '12px 8px', textAlign: 'center' }}>
            <p style={{ fontSize: 22, fontWeight: 800, color: k.color, margin: '0 0 2px' }}>{k.val}</p>
            <p style={{ fontSize: 10, color: 'var(--text2)', margin: 0 }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* فلتر */}
      <div style={{ display: 'flex', background: 'var(--card)', borderBottom: '1px solid var(--border)', marginTop: 16 }}>
        {(['all', 'trial', 'active', 'overdue'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ flex: 1, padding: '11px 4px', fontSize: 11, fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer', color: filter === f ? 'var(--primary)' : 'var(--text2)', borderBottom: filter === f ? '2px solid var(--primary)' : '2px solid transparent' }}>
            {f === 'all' ? 'الكل' : f === 'trial' ? 'تجريبي' : f === 'active' ? 'نشط' : 'متأخر ⚠️'}
          </button>
        ))}
      </div>

      <div style={{ padding: '12px 16px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)' }}>جاري التحميل...</div>
        ) : subs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ fontSize: 40, marginBottom: 8 }}>📭</p>
            <p style={{ color: 'var(--text2)', fontSize: 13 }}>لا توجد اشتراكات</p>
          </div>
        ) : subs.map(s => {
          const st = statusInfo[s.status] ?? { label: s.status, color: 'var(--text2)', bg: 'var(--bg)' }
          return (
            <div key={s.id} style={{ background: 'var(--card)', borderRadius: 18, border: `1px solid ${s.is_overdue ? 'var(--danger)' : 'var(--border)'}`, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <p style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14, margin: '0 0 2px' }}>{s.facility_name}</p>
                  <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0 }}>{s.owner_name}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: st.bg, color: st.color }}>{st.label}</span>
                  {s.tier === 'active' && (
                    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 20, background: 'var(--primary-dim)', color: 'var(--primary)' }}>نشط ⭐</span>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11, color: 'var(--text3)', marginBottom: 12 }}>
                <div>
                  <span>💰 </span>
                  <span style={{ fontWeight: 600, color: 'var(--text)' }}>{s.monthly_price} ريال/شهر</span>
                </div>
                <div>
                  <span>📅 حجوزات الشهر: </span>
                  <span style={{ fontWeight: 600, color: 'var(--text)' }}>{s.booking_count_this_month}</span>
                </div>
                {s.status === 'trial' && s.trial_ends_at && (
                  <div style={{ gridColumn: '1/-1', color: '#f59e0b' }}>
                    ⏰ ينتهي التجريبي: {new Date(s.trial_ends_at).toLocaleDateString('ar-SA')}
                  </div>
                )}
                {s.next_due_at && s.status !== 'trial' && (
                  <div style={{ gridColumn: '1/-1', color: s.is_overdue ? 'var(--danger)' : 'var(--text3)' }}>
                    {s.is_overdue ? '🔴 متأخر — ' : '📆 الاستحقاق: '}
                    {new Date(s.next_due_at).toLocaleDateString('ar-SA')}
                  </div>
                )}
              </div>

              <button
                onClick={() => renew(s.facility_id, s.id)}
                disabled={renewing === s.id}
                style={{ width: '100%', padding: '9px', borderRadius: 12, background: s.is_overdue ? 'var(--danger)' : 'var(--primary-dim)', color: s.is_overdue ? '#fff' : 'var(--primary)', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: renewing === s.id ? 0.5 : 1 }}>
                {renewing === s.id ? 'جاري التجديد...' : '🔄 تجديد يدوي (شهر)'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
